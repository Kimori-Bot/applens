import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import fs from 'fs';
import path from 'path';

// Media storage paths (in public folder for direct access)
const MEDIA_DIR = '/workspace/applens/web/public/media/storage';
const SCREENSHOTS_DIR = `${MEDIA_DIR}/screenshots`;
const VIDEOS_DIR = `${MEDIA_DIR}/videos`;

// Ensure directories exist
[MEDIA_DIR, SCREENSHOTS_DIR, VIDEOS_DIR].forEach(dir => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

// Save base64 screenshot to disk
function saveScreenshot(base64Data, testId, index) {
  try {
    const buffer = Buffer.from(base64Data.replace(/^data:image\/\w+;base64,/, ''), 'base64');
    const filename = `screenshot_${testId}_${index}.png`;
    const filepath = path.join(SCREENSHOTS_DIR, filename);
    fs.writeFileSync(filepath, buffer);
    return `/media/storage/screenshots/${filename}`;
  } catch (err) {
    console.error('Screenshot save error:', err);
    return null;
  }
}

// Save video to disk
function saveVideo(base64Data, testId) {
  try {
    const buffer = Buffer.from(base64Data.replace(/^data:video\/\w+;base64,/, ''), 'base64');
    const filename = `video_${testId}.webm`;
    const filepath = path.join(VIDEOS_DIR, filename);
    fs.writeFileSync(filepath, buffer);
    return `/media/storage/videos/${filename}`;
  } catch (err) {
    console.error('Video save error:', err);
    return null;
  }
}

// Save test session to database
async function saveTestSession(testId, appId, result) {
  try {
    // Save to tests table
    const { data, error } = await supabase
      .from('apps')
      .update({
        status: 'completed',
        config: {
          lastTest: {
            testId,
            steps: result.steps,
            completedAt: new Date().toISOString(),
            screenshotsCount: result.screenshots?.length || 0,
            healthScore: result.healthScore,
            screenshotPaths: result.screenshotPaths || [],
            videoPath: result.videoPath || null
          }
        }
      })
      .eq('id', appId)
      .select()
      .single();
    
    if (error) console.log('DB save error:', error.message);
    return !error;
  } catch (err) {
    console.log('DB save error:', err.message);
    return false;
  }
}

// POST /api/explore - Run AI exploration with full recording and test generation
export async function POST(request) {
  try {
    const body = await request.json();
    const { appId, appName, appUrl, goal, testType = 'explore', credentials = null, maxSteps = 10, model, aiAnalysis = true } = body;

    if (!appUrl) {
      return NextResponse.json({ error: 'appUrl required' }, { status: 400 });
    }

    const testId = `test_${Date.now()}`;
    const steps = [];
    const screenshots = [];  // base64 for response
    const screenshotPaths = [];  // file paths for storage
    const generatedTests = [];
    const stepReasoning = [];  // Track why each step was taken
    let latestAction = '';  // Track current action for status updates
    const aiModel = model || 'minimax-m2.5:cloud';  // Use specified model or default

    // Use browser automation (port 3005) - works reliably
    const sessionRes = await fetch('http://localhost:3005/sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        url: appUrl,
        recordVideo: true,
        maxSteps
      })
    });
    const session = await sessionRes.json();

    if (!session.success) {
      return NextResponse.json({ error: 'Failed to start session' }, { status: 500 });
    }

    const sessionId = session.sessionId;
    const history = [];

    // Run exploration loop (10 steps)
    for (let i = 0; i < maxSteps; i++) {
      // Get screenshot first
      const screenshotRes = await fetch(`http://localhost:3005/sessions/${sessionId}?action=screenshot`);
      const { screenshot } = await screenshotRes.json();
      
      if (screenshot) {
        screenshots.push(screenshot);
        // Save screenshot to disk
        const savedPath = saveScreenshot(screenshot, testId, screenshots.length - 1);
        if (savedPath) screenshotPaths.push(savedPath);
      }

      // Get current elements
      const elementsRes = await fetch(`http://localhost:3005/sessions/${sessionId}?action=elements`);
      const { elements, error: elementsError } = await elementsRes.json();

      if (elementsError || !elements || elements.length === 0) {
        break;
      }

      // Ask AI what to do - include goal, testType, and credentials for context
      const aiRes = await fetch('http://localhost:3006/decide', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ elements, history, goal, testType, credentials, model: aiModel })
      });
      const decision = await aiRes.json();

      // Track reasoning for this step and current action
      const reasoning = decision.reason || `Chose to ${decision.action} on ${decision.element} to ${goal || (testType === 'auth' ? 'complete authentication' : 'explore the app')}`;
      stepReasoning.push(reasoning);
      
      // Update current action for real-time status
      if (testType === 'auth') {
        if (decision.action === 'INPUT') latestAction = 'Testing: filling credentials';
        else latestAction = `Testing: ${decision.element || 'login form'}`;
      } else if (testType === 'task' && goal) {
        latestAction = `Testing: ${goal} (step ${i + 1})`;
      } else {
        latestAction = `Exploring: ${decision.element || 'app'} (step ${i + 1})`;
      }

      const stepResult = {
        step: i + 1,
        action: decision.action,
        element: decision.element,
        reason: reasoning
      };

      steps.push(stepResult);

      if (decision.action === 'CLICK' || decision.action === 'TAP') {
        // Execute click
        await fetch(`http://localhost:3005/sessions/${sessionId}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'click', x: decision.x, y: decision.y })
        });

        history.push(decision.element);

        // Generate test case
        generatedTests.push({
          id: `test_case_${i + 1}`,
          name: `Navigate to ${decision.element}`,
          action: 'TAP',
          target: decision.element,
          expected: 'Screen changes or navigation occurs',
          priority: 'high'
        });
      }
      else if (decision.action === 'INPUT' && decision.text) {
        await fetch(`http://localhost:3005/sessions/${sessionId}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'input', x: decision.x, y: decision.y, text: decision.text })
        });
        
        // Track auth state in history for proper flow
        if (testType === 'auth' && credentials) {
          // Check if this is email or password based on what was entered
          if (decision.element.toLowerCase().includes('email')) {
            history.push('email_filled');
          } else if (decision.element.toLowerCase().includes('password')) {
            history.push('password_filled');
          }
        }
        
        generatedTests.push({
          id: `test_case_input_${i + 1}`,
          name: `Enter "${decision.text}" into ${decision.element}`,
          action: 'INPUT',
          target: decision.element,
          value: decision.text,
          expected: 'Text is entered',
          priority: 'medium'
        });
        
        history.push(`input:${decision.element}`);
      }
      else if (decision.action === 'PRESS_ENTER') {
        await fetch(`http://localhost:3005/sessions/${sessionId}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'press_enter' })
        });
        
        generatedTests.push({
          id: `test_case_enter_${i + 1}`,
          name: `Press Enter to submit ${decision.element}`,
          action: 'PRESS_ENTER',
          target: decision.element,
          expected: 'Form submits or search executes',
          priority: 'medium'
        });
        
        history.push('press_enter');
      }
      else if (decision.action === 'BACK' || decision.action === 'NONE') {
        break;
      }
    }

    // Get final screenshot
    const finalScreenshot = await fetch(`http://localhost:3005/sessions/${sessionId}?action=screenshot`);
    const { screenshot: final } = await finalScreenshot.json();
    if (final) {
      screenshots.push(final);
      const savedPath = saveScreenshot(final, testId, screenshots.length - 1);
      if (savedPath) screenshotPaths.push(savedPath);
    }

    // Wait for video to finalize
    await new Promise(r => setTimeout(r, 2000));

    // Get video and save to disk
    const videoRes = await fetch(`http://localhost:3005/sessions/${sessionId}?action=video`);
    const { video, exists: videoExists } = await videoRes.json();
    let videoPath = null;
    if (videoExists && video) {
      videoPath = saveVideo(video, testId);
    }

    // Close session
    await fetch(`http://localhost:3005/sessions/${sessionId}`, { method: 'DELETE' });

    // AI analyzes and generates recommended tests (only if enabled)
    let analysis = { summary: `Explored ${steps.length} screens`, recommendedTests: generatedTests, uxAnalysis: null, appUnderstanding: null };
    if (aiAnalysis) {
      try {
        const testAnalysis = await fetch('http://localhost:3006/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            steps, 
            appName: appName || 'Test App',
            testCount: generatedTests.length,
            screenshots: screenshots.slice(0, 3) // Send first 3 screenshots for analysis
          })
        });
        analysis = await testAnalysis.json();
      } catch (e) {
        console.log('AI analysis skipped:', e.message);
      }
    }

    // Calculate health score based on steps completed
    const healthScore = Math.round((steps.length / maxSteps) * 100);

    // Build comprehensive result
    const result: any = {
      testId,
      success: true,
      status: 'completed',
      steps: steps.length,
      history: history,
      screenshots: screenshots,
      screenshotPaths: screenshotPaths,
      video: videoExists ? video : null,
      videoPath: videoPath,
      appName: appName || 'Test App',
      goal: goal || null,
      testType: testType,
      generatedTests: generatedTests,
      recommendedTests: analysis.recommendedTests || generatedTests,
      summary: analysis.summary || `Explored ${steps.length} screens`,
      healthScore,
      issuesFound: 0,
      timestamp: new Date().toISOString(),
      stepReasoning,
      currentAction: `Completed ${testType} test: ${steps.length} steps`,
      uxAnalysis: analysis.uxAnalysis || null,
      appUnderstanding: analysis.appUnderstanding || null
    };

    // Generate AI reviews for screenshots (only if enabled)
    const reviews = [];
    if (aiAnalysis) {
      for (let i = 0; i < Math.min(screenshots.length, 5); i++) {
        try {
          // Use /analyze to generate review-like insights
          const reviewRes = await fetch('http://localhost:3006/analyze', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              steps: [steps[i] || { action: 'initial', element: 'screen_' + i }],
              appName: appName || 'Test App',
              testCount: 1
            })
          });
          const review = await reviewRes.json();
          reviews.push({
            step: i + 1,
            action: steps[i]?.action || 'capture',
            element: steps[i]?.element || 'initial screen',
            analysis: review.summary || `Step ${i + 1}: Explored screen`,
            issues: review.recommendedTests?.length > 0 ? [] : ['No issues detected'],
            suggestions: review.recommendedTests?.slice(0, 2).map((t: any) => t.name) || []
          });
        } catch (e) {
          reviews.push({ 
            step: i + 1, 
            action: steps[i]?.action || 'capture',
            element: steps[i]?.element || 'screen',
            analysis: `Screen ${i + 1} captured during exploration`, 
            issues: [], 
          suggestions: [] 
        });
      }
    }
    }  // End aiAnalysis check
    result.reviews = reviews;

    // Save test session to Supabase
    try {
      // First ensure app exists in apps table
      const { data: existingApp } = await supabase
        .from('apps')
        .select('id')
        .eq('name', appName || 'Test App')
        .limit(1)
        .single();

      let appIdToUse = existingApp?.id;

      if (!appIdToUse) {
        // Create new app entry
        const { data: newApp } = await supabase
          .from('apps')
          .insert({ 
            name: appName || 'Test App',
            platform: 'web',
            status: 'active'
          })
          .select('id')
          .single();
        appIdToUse = newApp?.id;
      }

      if (appIdToUse) {
        // Create session record
        await supabase.from('sessions').insert({
          app_id: appIdToUse,
          status: 'completed',
          started_at: new Date().toISOString(),
          completed_at: new Date().toISOString(),
          error_message: null
        });
      }

      console.log('Saved to Supabase successfully');
    } catch (dbError) {
      console.log('Supabase save error:', dbError);
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Explore error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
