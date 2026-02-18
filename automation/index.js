/**
 * AppLens Automation Engine
 * Autonomous AI navigation system that controls apps
 * 
 * Usage:
 *   const { automationEngine } = require('./dist/index.js');
 *   automationEngine.listen(3001);
 * 
 * API Endpoints:
 *   POST /api/automation/start - Start exploration
 *   POST /api/automation/stop - Stop exploration
 *   GET  /api/automation/status - Get status
 *   GET  /api/automation/report - Get JSON report
 *   GET  /api/automation/report/markdown - Get markdown report
 *   GET  /api/automation/report/html - Get HTML report
 *   POST /api/automation/strategy - Change strategy
 *   POST /api/automation/action - Execute manual action
 */

const { automationEngine } = require('./dist/index.js');

// Start server
automationEngine.listen(process.env.PORT || 3001);
