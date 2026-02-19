const express = require('express');
const { query, insert, update } = require('../db');
const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

const router = express.Router();

// Helper to verify API key
async function verifyApiKey(req) {
  const apiKey = req.headers['x-api-key'];
  if (!apiKey) {
    return null;
  }

  const result = await query(
    'SELECT id, name FROM companies WHERE api_key = $1',
    [apiKey]
  );

  return result.rows?.[0] || null;
}

// POST /api/tests/web - Run web test
router.post('/web', async (req, res) => {
  let browser = null;
  let testRunId = null;
  let webTestId = null;
  
  try {
    const { 
      url, 
      viewport = { width: 1280, height: 720 }, 
      wait_for_selector, 
      take_screenshots = true,
      app_id,
      session_id
    } = req.body;

    if (!url) {
      return res.status(400).json({ error: 'url is required' });
    }

    // Validate URL
    try {
      new URL(url);
    } catch (e) {
      return res.status(400).json({ error: 'Invalid URL format' });
    }

    // Verify API key
    const company = await verifyApiKey(req);
    if (!company) {
      return res.status(401).json({ error: 'Invalid API key' });
    }

    // Create test run with test_type = 'web'
    const testRun = await insert('test_runs', {
      app_id: app_id || null,
      session_id: session_id || null,
      test_type: 'web',
      status: 'running',
      total_commands: 1,
      started_at: new Date().toISOString()
    });

    testRunId = testRun[0]?.id;
    if (!testRunId) {
      throw new Error('Failed to create test run');
    }

    // Create web test record
    const webTest = await insert('web_tests', {
      test_run_id: testRunId,
      url,
      viewport: JSON.stringify(viewport),
      wait_for_selector,
      take_screenshots,
      status: 'running'
    });

    webTestId = webTest[0]?.id;

    // Launch browser
    browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--no-first-run',
        '--no-zygote',
        '--single-process'
      ]
    });

    const page = await browser.newPage();
    
    // Set viewport
    await page.setViewport({
      width: viewport.width || 1280,
      height: viewport.height || 720
    });

    // Collect console logs
    const consoleLogs = [];
    const errorLogs = [];
    
    page.on('console', msg => {
      const logEntry = {
        type: msg.type(),
        text: msg.text(),
        timestamp: new Date().toISOString()
      };
      if (msg.type() === 'error') {
        errorLogs.push(logEntry);
      } else {
        consoleLogs.push(logEntry);
      }
    });

    // Collect page errors
    page.on('pageerror', error => {
      errorLogs.push({
        type: 'pageerror',
        text: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString()
      });
    });

    // Track navigation requests
    const screenshots = [];
    const startTime = Date.now();

    // Navigate to URL
    await page.goto(url, { 
      waitUntil: 'networkidle2',
      timeout: 30000 
    });

    const loadTime = Date.now() - startTime;

    // Take initial screenshot if enabled
    if (take_screenshots) {
      const screenshot = await page.screenshot({ 
        encoding: 'base64',
        type: 'png'
      });
      screenshots.push({
        event: 'navigation',
        timestamp: new Date().toISOString(),
        data: screenshot
      });
    }

    // Wait for selector if specified
    if (wait_for_selector) {
      try {
        await page.waitForSelector(wait_for_selector, { timeout: 10000 });
        
        // Take screenshot after selector found
        if (take_screenshots) {
          const screenshot = await page.screenshot({ 
            encoding: 'base64',
            type: 'png'
          });
          screenshots.push({
            event: 'selector_found',
            selector: wait_for_selector,
            timestamp: new Date().toISOString(),
            data: screenshot
          });
        }
      } catch (selectorError) {
        errorLogs.push({
          type: 'selector_timeout',
          selector: wait_for_selector,
          text: selectorError.message,
          timestamp: new Date().toISOString()
        });
      }
    }

    // Get HTML snapshot
    const htmlSnapshot = await page.content();

    // Update web test with results
    if (webTestId) {
      await update('web_tests', {
        status: 'completed',
        load_time_ms: loadTime,
        screenshots: JSON.stringify(screenshots),
        console_logs: JSON.stringify(consoleLogs),
        error_logs: JSON.stringify(errorLogs),
        html_snapshot: htmlSnapshot,
        completed_at: new Date().toISOString()
      }, { id: webTestId });
    }

    // Update test run as completed
    await update('test_runs', {
      status: 'completed',
      completed_at: new Date().toISOString(),
      passed_commands: 1,
      results: JSON.stringify({
        loadTimeMs: loadTime,
        screenshotCount: screenshots.length,
        consoleLogCount: consoleLogs.length,
        errorCount: errorLogs.length
      })
    }, { id: testRunId });

    // Close browser
    await browser.close();
    browser = null;

    // Return results
    res.json({
      test_run_id: testRunId,
      web_test_id: webTestId,
      status: 'completed',
      url,
      results: {
        load_time_ms: loadTime,
        screenshots: screenshots.map(s => ({
          event: s.event,
          timestamp: s.timestamp,
          selector: s.selector,
          has_screenshot: !!s.data
        })),
        console_logs: consoleLogs,
        error_logs: errorLogs,
        html_snapshot_length: htmlSnapshot.length
      }
    });

  } catch (error) {
    console.error('Web test error:', error);
    
    // Cleanup browser on error
    if (browser) {
      try {
        await browser.close();
      } catch (e) {
        // Ignore close errors
      }
    }

    // Try to update test run status
    if (testRunId) {
      try {
        await update('test_runs', {
          status: 'failed',
          completed_at: new Date().toISOString(),
          failed_commands: 1,
          results: JSON.stringify({ error: error.message })
        }, { id: testRunId });
      } catch (e) {
        // Ignore update errors
      }
    }

    // Try to update web test status
    if (webTestId) {
      try {
        await update('web_tests', {
          status: 'failed',
          error_message: error.message,
          completed_at: new Date().toISOString()
        }, { id: webTestId });
      } catch (e) {
        // Ignore update errors
      }
    }

    res.status(500).json({ 
      error: 'Web test failed',
      message: error.message 
    });
  }
});

// GET /api/tests/web/:id - Get web test results
router.get('/web/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Verify API key
    const company = await verifyApiKey(req);
    if (!company) {
      return res.status(401).json({ error: 'Invalid API key' });
    }

    // Get web test
    const webTest = await query(
      'SELECT * FROM web_tests WHERE id = $1',
      [id]
    );

    if (webTest.rows?.length === 0) {
      return res.status(404).json({ error: 'Web test not found' });
    }

    const test = webTest.rows[0];

    // Get associated test run and verify ownership
    const testRun = await query(
      `SELECT tr.*, a.company_id FROM test_runs tr 
       LEFT JOIN apps a ON tr.app_id = a.id 
       WHERE tr.id = $1`,
      [test.test_run_id]
    );

    if (testRun.rows?.length === 0) {
      return res.status(404).json({ error: 'Test run not found' });
    }

    if (testRun.rows[0].company_id && testRun.rows[0].company_id !== company.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json({
      web_test: test,
      test_run: testRun.rows[0]
    });

  } catch (error) {
    console.error('Get web test error:', error);
    res.status(500).json({ error: 'Failed to get web test' });
  }
});

// GET /api/tests/web/:id/screenshot/:index - Get screenshot by index
router.get('/web/:id/screenshot/:index', async (req, res) => {
  try {
    const { id, index } = req.params;

    // Verify API key
    const company = await verifyApiKey(req);
    if (!company) {
      return res.status(401).json({ error: 'Invalid API key' });
    }

    // Get web test
    const webTest = await query(
      'SELECT screenshots, test_run_id FROM web_tests WHERE id = $1',
      [id]
    );

    if (webTest.rows?.length === 0) {
      return res.status(404).json({ error: 'Web test not found' });
    }

    const screenshots = webTest.rows[0].screenshots || [];
    const screenshotIndex = parseInt(index, 10);

    if (screenshotIndex < 0 || screenshotIndex >= screenshots.length) {
      return res.status(404).json({ error: 'Screenshot not found' });
    }

    const screenshot = screenshots[screenshotIndex];
    
    if (!screenshot.data) {
      return res.status(404).json({ error: 'Screenshot data not found' });
    }

    // Return as base64 image
    res.json({
      event: screenshot.event,
      timestamp: screenshot.timestamp,
      selector: screenshot.selector,
      data: screenshot.data
    });

  } catch (error) {
    console.error('Get screenshot error:', error);
    res.status(500).json({ error: 'Failed to get screenshot' });
  }
});

module.exports = router;
