import { NextResponse } from 'next/server';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const ANDROID_HOME = '/opt/android-sdk';

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

// Execute adb command synchronously
function adb(args) {
  try {
    return execSync(`${ANDROID_HOME}/platform-tools/adb ${args}`, { encoding: 'utf8' });
  } catch (error) {
    console.error('ADB error:', error.message);
    throw error;
  }
}

// POST /api/explore/android - Run AI exploration on Android emulator
export async function POST(request) {
  try {
    const body = await request.json();
    const { appUrl } = body;

    if (!appUrl) {
      return NextResponse.json({ error: 'appUrl required' }, { status: 400 });
    }

    const testId = `android_${Date.now()}`;
    const steps = [];
    const screenshots: string[] = [];
    const navigationPath: string[] = [];
    const generatedTests = [];
    const deviceId = 'emulator-5554';

    // Helper to get screenshot directly via ADB
    async function getScreenshot(): Promise<string | null> {
      try {
        const timestamp = Date.now();
        adb(`shell screencap -p /data/local/tmp/screen.png`);
        adb(`pull /data/local/tmp/screen.png /tmp/android_screen_${timestamp}.png`);
        
        const buffer = fs.readFileSync(`/tmp/android_screen_${timestamp}.png`);
        return buffer.toString('base64');
      } catch (error) {
        console.error('Screenshot error:', error);
        return null;
      }
    }

    // Helper to get UI elements via uiautomator
    async function getElements() {
      try {
        const timestamp = Date.now();
        adb(`shell uiautomator dump /data/local/tmp/dump.xml`);
        adb(`pull /data/local/tmp/dump.xml /tmp/dump_${timestamp}.xml`);
        
        const xml = fs.readFileSync(`/tmp/dump_${timestamp}.xml`, 'utf8');
        
        // Parse elements - text appears BEFORE bounds in actual XML
        const elements: any[] = [];
        const regex = /<node[^>]*text="([^"]*)"[^>]*bounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"[^>]*>/g;
        
        let match;
        while ((match = regex.exec(xml)) !== null && elements.length < 30) {
          const text = match[1];
          const x1 = parseInt(match[2]);
          const y1 = parseInt(match[3]);
          const x2 = parseInt(match[4]);
          const y2 = parseInt(match[5]);
          
          // Filter meaningful elements
          if (x2 - x1 > 20 && y2 - y1 > 10 && text && text.length > 0) {
            elements.push({
              id: `el_${elements.length}`,
              tag: 'android',
              text: text.substring(0, 60),
              x: Math.round((x1 + x2) / 2),
              y: Math.round((y1 + y2) / 2),
              width: x2 - x1,
              height: y2 - y1,
              bounds: `[${x1},${y1}][${x2},${y2}]`
            });
          }
        }
        
        return { elements };
      } catch (error) {
        return { elements: [], error: String(error) };
      }
    }

    // Tap at coordinates
    function tap(x: number, y: number) {
      try {
        adb(`shell input tap ${x} ${y}`);
        return { success: true };
      } catch (error) {
        return { success: false, error: String(error) };
      }
    }

    // Start session - open URL in browser
    try {
      adb(`shell am start -a android.intent.action.VIEW -d "${appUrl}" com.android.browser`);
    } catch (error) {
      console.log('Browser start error (may already be running):', error);
    }

    await new Promise(r => setTimeout(r, 3000));

    // Get initial screenshot
    const initialShot = await getScreenshot();
    if (initialShot) {
      screenshots.push(initialShot);
      saveScreenshot(initialShot, testId, 0);
    }

    // Run exploration loop (10 steps)
    for (let i = 0; i < 10; i++) {
      const { elements, error: elementsError } = await getElements();

      if (elementsError || !elements || elements.length === 0) {
        console.log('No elements found at step', i + 1);
        break;
      }

      // Ask AI what to do
      let decision;
      try {
        const aiRes = await fetch('http://localhost:3006/decide', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ elements, history: navigationPath })
        });
        decision = await aiRes.json();
      } catch (aiError) {
        // Fallback: click first tappable element
        const tappable = elements.find(el => 
          el.text && (el.text.toLowerCase().includes('button') || 
                      el.text.toLowerCase().includes('click') || 
                      el.text.toLowerCase().includes('tap') ||
                      el.text.toLowerCase().includes('menu') ||
                      el.text.toLowerCase().includes('ok'))
        ) || elements[0];
        
        decision = {
          action: tappable ? 'TAP' : 'NONE',
          element: tappable?.text || 'unknown',
          x: tappable?.x,
          y: tappable?.y
        };
      }

      const stepResult = {
        step: i + 1,
        action: decision.action || 'TAP',
        element: decision.element || 'unknown',
        reason: decision.reason || 'AI decision'
      };
      steps.push(stepResult);

      if (decision.action === 'TAP' && decision.x && decision.y) {
        tap(decision.x, decision.y);
        navigationPath.push(decision.element);

        generatedTests.push({
          id: `test_${i + 1}`,
          name: `Tap ${decision.element}`,
          action: 'TAP',
          target: decision.element,
          coordinates: { x: decision.x, y: decision.y },
          priority: 'high'
        });

        await new Promise(r => setTimeout(r, 1500));
        
        const shot = await getScreenshot();
        if (shot) {
          screenshots.push(shot);
          saveScreenshot(shot, testId, screenshots.length - 1);
        }
      }
      else if (decision.action === 'INPUT' && decision.text) {
        adb(`shell input text "${decision.text.replace(/ /g, '%s')}"`);
        navigationPath.push(`input:${decision.element}`);
        
        generatedTests.push({
          id: `test_input_${i + 1}`,
          name: `Enter "${decision.text}" into ${decision.element}`,
          action: 'INPUT',
          target: decision.element,
          value: decision.text,
          priority: 'medium'
        });
        
        await new Promise(r => setTimeout(r, 500));
      }
      else if (decision.action === 'NONE' || !decision.action) {
        break;
      }
    }

    // Generate AI summary
    let aiSummary = `Explored ${steps.length} screens on Android emulator. `;
    if (navigationPath.length > 0) {
      aiSummary += `Navigation flow: ${navigationPath.join(' → ')}. `;
    }
    aiSummary += `Generated ${generatedTests.length} test cases.`;

    const healthScore = Math.round((steps.length / 10) * 100);

    return NextResponse.json({
      testId,
      success: true,
      platform: 'android',
      emulator: deviceId,
      steps: steps.length,
      history: navigationPath,
      screenshots,
      video: null,
      appName: 'Android App',
      generatedTests,
      recommendedTests: generatedTests,
      summary: aiSummary,
      healthScore,
      issuesFound: 0,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Android explore error:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
