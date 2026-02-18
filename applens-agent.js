#!/usr/bin/env node
/**
 * AppLens AI Agent - Enhanced Version
 * 
 * Capabilities:
 * 1. Explores the app autonomously - reads state, decides actions, tracks exploration
 * 2. Detects issues - compares expected vs actual, flags crashes/errors/UI bugs
 * 3. Fixes apps - analyzes issues, generates code fixes, applies via git
 * 4. Reports results - summary, screenshots, recommendations
 * 
 * Usage:
 *   node applens-agent.js --appId cleantasks --sessionId <session>
 *   node applens-agent.js --appId cleantasks --continuous --maxIterations=100
 *   node applens-agent.js --appId cleantasks --fixIssues --sessionId <session>
 *   node applens-agent.js --appId cleantasks --report --sessionId <session>
 */

const API_URL = process.env.APPLENS_API_URL || 'http://100.79.223.42:3002';
const fs = require('fs');
const path = require('path');

// Issue detection patterns
const ERROR_PATTERNS = [
  { pattern: /error|exception|failed/i, severity: 'high', type: 'error' },
  { pattern: /crash|force close|ANR/i, severity: 'critical', type: 'crash' },
  { pattern: /timeout|network|connection/i, severity: 'medium', type: 'network' },
  { pattern: /null|undefined|undefined is not/i, severity: 'high', type: 'runtime' },
  { pattern: /render|display|visible|overlap/i, severity: 'medium', type: 'ui_bug' },
  { pattern: /slow|performance|lag/i, severity: 'low', type: 'performance' },
];

class AppLensAgent {
  constructor(options) {
    this.appId = options.appId || 'cleantasks';
    this.sessionId = options.sessionId || `session_${Date.now()}`;
    this.continuous = options.continuous || false;
    this.maxIterations = options.maxIterations || 50;
    this.fixIssues = options.fixIssues || false;
    this.generateReport = options.generateReport || false;
    this.simulateIssues = options.simulateIssues || false; // Test mode: inject fake issues
    
    // State tracking
    this.visitedScreens = new Set();
    this.visitedElements = new Set();
    this.currentScreen = 'unknown';
    this.running = false;
    this.iteration = 0;
    
    // Issue tracking
    this.issues = [];
    this.screenshots = [];
    this.testActions = [];
    
    // App metadata
    this.appMetadata = {
      name: this.appId,
      platform: 'react_native',
      expectedScreens: [],
      knownIssues: []
    };
  }

  async start() {
    console.log('🤖'.padEnd(50, '─'));
    console.log('   AppLens AI Agent - Enhanced');
    console.log('─'.repeat(50));
    console.log(`   App: ${this.appId}`);
    console.log(`   Session: ${this.sessionId}`);
    console.log(`   API: ${API_URL}`);
    console.log(`   Mode: ${this.fixIssues ? 'Fix + Test' : this.generateReport ? 'Report' : 'Explore'}`);
    console.log('─'.repeat(50));
    console.log('');
    
    this.running = true;
    
    // Initialize session
    await this.initializeSession();
    
    // Run main loop
    while (this.running && this.iteration < this.maxIterations) {
      this.iteration++;
      
      // Check for continuous mode - add more iterations if running continuously
      if (this.continuous && this.iteration >= this.maxIterations) {
        console.log('\n🔄 Continuing exploration...');
        this.maxIterations += 50;
      }
      
      try {
        // Get current app state
        const state = await this.getAppState();
        
        // Detect issues
        await this.detectIssues(state);
        
        // Make decision
        const decision = await this.makeDecision(state);
        
        // Execute the decision
        console.log(`\n📤 Action: ${decision.action}`, decision.params);
        await this.sendCommand(decision);
        
        // Log the action
        this.testActions.push({
          iteration: this.iteration,
          action: decision.action,
          params: decision.params,
          screen: this.currentScreen,
          timestamp: new Date().toISOString()
        });
        
        // Wait for app to respond
        await this.sleep(1500);
        
      } catch (error) {
        console.error('❌ Error:', error.message);
        this.issues.push({
          type: 'runtime',
          severity: 'high',
          message: error.message,
          iteration: this.iteration,
          timestamp: new Date().toISOString()
        });
        await this.sleep(1000);
      }
    }
    
    console.log(`\n🏁 Agent finished after ${this.iteration} iterations`);
    
    // Fix issues if requested
    if (this.fixIssues && this.issues.length > 0) {
      await this.fixDetectedIssues();
    }
    
    // Generate report if requested
    if (this.generateReport) {
      await this.generateTestReport();
    }
    
    return {
      iterations: this.iteration,
      issues: this.issues,
      screens: Array.from(this.visitedScreens),
      elements: Array.from(this.visitedElements),
      actions: this.testActions
    };
  }

  async initializeSession() {
    console.log('📡 Initializing session...');
    
    // Register session with server
    try {
      await fetch(`${API_URL}/api/session/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: this.sessionId,
          appId: this.appId,
          started_at: new Date().toISOString()
        })
      });
    } catch (e) {
      // Session registration might not be available
    }
    
    console.log(`   Session ${this.sessionId} initialized`);
  }

  async getAppState() {
    try {
      // Try API first
      let screens = [];
      let elements = [];
      let screenshots = [];
      let session = null;
      
      try {
        // Get screens
        const screensRes = await fetch(`${API_URL}/api/screens?appId=${this.appId}`);
        screens = await screensRes.json();
        
        // Get elements
        const elementsRes = await fetch(`${API_URL}/api/elements?appId=${this.appId}`);
        elements = await elementsRes.json();
        
        // Get sessions for current state
        const sessionsRes = await fetch(`${API_URL}/api/sessions?appId=${this.appId}`);
        const sessions = await sessionsRes.json();
        
        // Get screenshots
        const screenshotsRes = await fetch(`${API_URL}/api/screenshots?appId=${this.appId}`);
        screenshots = await screenshotsRes.json();
        
        // Find our session or latest session
        session = sessions.find(s => s.session_id === this.sessionId) || sessions[0];
      } catch (apiError) {
        // Fallback: try reading from local data files
        console.log('   ℹ️ API unavailable, reading from local data...');
        screens = this.readLocalData('screens');
        elements = this.readLocalData('elements');
      }
      
      const currentScreen = session?.current_screen || session?.screen_name || 'unknown';
      
      // Update tracking
      screens.forEach(s => this.visitedScreens.add(s.screen_name));
      elements.forEach(e => this.visitedElements.add(e.element_id));
      
      // Store screenshots
      this.screenshots = screenshots;
      
      return {
        screens: this.visitedScreens,
        elements: this.visitedElements,
        currentScreen,
        allScreens: screens,
        allElements: elements,
        screenshots,
        session
      };
    } catch (error) {
      console.log('   ⚠️ Could not fetch state:', error.message);
      return {
        screens: this.visitedScreens,
        elements: this.visitedElements,
        currentScreen: this.currentScreen,
        allScreens: [],
        allElements: [],
        screenshots: [],
        session: null
      };
    }
  }

  readLocalData(type) {
    try {
      const dataPath = path.join(__dirname, 'data', `${type}.json`);
      if (fs.existsSync(dataPath)) {
        const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
        return data.filter(item => item.app_id === this.appId);
      }
    } catch (e) {
      // Ignore
    }
    return [];
  }

  async detectIssues(state) {
    const { allElements, allScreens, screenshots, session } = state;
    
    // Check for session-level issues
    if (session) {
      if (session.status === 'error' || session.status === 'crashed') {
        this.issues.push({
          type: 'crash',
          severity: 'critical',
          message: `Session ended with status: ${session.status}`,
          screen: this.currentScreen,
          iteration: this.iteration,
          timestamp: new Date().toISOString()
        });
      }
    }
    
    // Analyze elements for issues
    allElements.forEach(element => {
      if (element.error || element.fail) {
        this.issues.push({
          type: 'error',
          severity: 'high',
          message: element.error || element.fail,
          element: element.element_id,
          screen: this.currentScreen,
          iteration: this.iteration,
          timestamp: new Date().toISOString()
        });
      }
      
      // Check for potential UI issues
      if (element.hidden === true || element.enabled === false) {
        // Only flag if element appears interactable but is disabled
        if (element.element_type === 'button' || element.element_type === 'touchable') {
          this.issues.push({
            type: 'ui_bug',
            severity: 'medium',
            message: `Element appears disabled: ${element.element_id}`,
            element: element.element_id,
            screen: this.currentScreen,
            iteration: this.iteration,
            timestamp: new Date().toISOString()
          });
        }
      }
    });
    
    // Check for navigation issues
    const uniqueScreens = new Set(allScreens.map(s => s.screen_name));
    if (uniqueScreens.size > 1 && this.iteration > 5) {
      // We've been running but screen hasn't changed - potential hang
      if (this.currentScreen === state.currentScreen && this.iteration % 10 === 0) {
        this.issues.push({
          type: 'performance',
          severity: 'low',
          message: `Screen "${this.currentScreen}" hasn't changed in 10 iterations`,
          screen: this.currentScreen,
          iteration: this.iteration,
          timestamp: new Date().toISOString()
        });
      }
    }
    
    // Update current screen
    this.currentScreen = state.currentScreen;
    
    // Simulate issues for testing if requested
    if (this.simulateIssues && this.iteration === 1) {
      this.issues = [
        { type: 'error', severity: 'high', message: 'Failed to load task list', iteration: 1, timestamp: new Date().toISOString() },
        { type: 'ui_bug', severity: 'medium', message: 'Button overlap on small screens', iteration: 2, timestamp: new Date().toISOString() },
        { type: 'performance', severity: 'low', message: 'Slow rendering on task list', iteration: 3, timestamp: new Date().toISOString() }
      ];
      console.log('\n   🔧 [TEST MODE] Injected 3 simulated issues for fix testing');
    }
    
    // Log issues found
    if (this.issues.length > 0) {
      const newIssues = this.issues.filter(i => i.iteration === this.iteration);
      if (newIssues.length > 0) {
        console.log(`\n   ⚠️ Issues detected (${newIssues.length} new):`);
        newIssues.forEach(i => console.log(`      [${i.severity}] ${i.type}: ${i.message}`));
      }
    }
  }

  async makeDecision(state) {
    const { currentScreen, allScreens, allElements } = state;
    
    console.log(`\n📊 Screen: ${currentScreen} | Screens: ${this.visitedScreens.size} | Elements: ${this.visitedElements.size}`);
    
    // If we've visited most screens and explored elements, consider done
    if (this.visitedScreens.size >= 4 && this.iteration >= 15) {
      return { action: 'complete', params: {} };
    }
    
    // If we have elements on current screen, try tapping one
    if (allElements.length > 0) {
      // Prioritize buttons and touchables
      const interactiveElements = allElements.filter(e => 
        e.element_type === 'button' || 
        e.element_type === 'touchable' ||
        e.element_type === 'textinput' ||
        e.clickable === true
      );
      
      if (interactiveElements.length > 0) {
        // Pick a random element, prefer ones we haven't tapped
        const untried = interactiveElements.filter(e => !this.visitedElements.has(e.element_id));
        
        let targetElement;
        if (untried.length > 0) {
          targetElement = untried[Math.floor(Math.random() * untried.length)];
        } else {
          targetElement = interactiveElements[Math.floor(Math.random() * interactiveElements.length)];
        }
        
        this.visitedElements.add(targetElement.element_id);
        
        // If it's a text input, provide input
        if (targetElement.element_type === 'textinput') {
          return {
            action: 'input',
            params: { field: targetElement.element_id, value: 'test input' }
          };
        }
        
        return {
          action: 'tap',
          params: { elementId: targetElement.element_id }
        };
      }
    }
    
    // Try navigation to discover new screens
    const screenNames = ['Home', 'Settings', 'Add', 'Edit', 'Details', 'Profile', 'List', 'Search'];
    const newScreens = screenNames.filter(s => !this.visitedScreens.has(s));
    
    if (newScreens.length > 0 && Math.random() > 0.5) {
      const targetScreen = newScreens[Math.floor(Math.random() * newScreens.length)];
      return {
        action: 'navigate',
        params: { screenName: targetScreen }
      };
    }
    
    // If nothing else works, complete
    if (this.iteration >= 10) {
      return { action: 'complete', params: {} };
    }
    
    // Default: try a generic action
    return {
      action: 'tap',
      params: { elementId: 'unknown' }
    };
  }

  async sendCommand(command) {
    try {
      const response = await fetch(`${API_URL}/api/test/command`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: this.sessionId,
          appId: this.appId,
          command
        })
      });
      
      return response.json();
    } catch (error) {
      console.log('   ⚠️ Command send failed:', error.message);
    }
  }

  async fixDetectedIssues() {
    console.log('\n🔧 '.padEnd(50, '─'));
    console.log('   Analyzing Issues for Fixes');
    console.log('─'.repeat(50));
    
    // Group issues by type
    const issuesByType = {};
    this.issues.forEach(issue => {
      if (!issuesByType[issue.type]) issuesByType[issue.type] = [];
      issuesByType[issue.type].push(issue);
    });
    
    // Generate fixes for each issue type
    for (const [type, issues] of Object.entries(issuesByType)) {
      console.log(`\n📝 Generating fix for ${type} (${issues.length} instances):`);
      
      const fix = this.generateCodeFix(type, issues);
      console.log(fix);
      
      // Optionally apply fix via git
      if (fix.applicable) {
        await this.applyFix(fix);
      }
    }
  }

  generateCodeFix(issueType, issues) {
    // Generate appropriate code fix based on issue type
    const fixes = {
      error: {
        title: 'Error Handling Fix',
        description: 'Add proper error handling and user feedback',
        code: `
// Add try-catch wrapper
try {
  // Original code
} catch (error) {
  console.error('Operation failed:', error);
  // Show user-friendly error message
  Alert.alert('Error', 'Something went wrong. Please try again.');
}`,
        applicable: true,
        file: 'src/screens/*.js'
      },
      crash: {
        title: 'Null Safety Fix',
        description: 'Add null checks to prevent crashes',
        code: `
// Add null checks
const value = data?.property ?? 'default';
if (value) {
  // Process value
}`,
        applicable: true,
        file: 'src/components/*.js'
      },
      network: {
        title: 'Network Error Handling',
        description: 'Add retry logic and offline support',
        code: `
// Add network error handling
const handleNetworkError = async (fn) => {
  try {
    return await fn();
  } catch (error) {
    if (!navigator.onLine) {
      // Show offline message
      return null;
    }
    // Retry logic
    return await fn();
  }
};`,
        applicable: true,
        file: 'src/api/*.js'
      },
      ui_bug: {
        title: 'UI Fix',
        description: 'Fix disabled/hidden element issues',
        code: `
// Ensure elements are enabled
<TouchableOpacity 
  disabled={!isEnabled}
  style={!isEnabled ? styles.disabled : null}
>
  {children}
</TouchableOpacity>`,
        applicable: true,
        file: 'src/components/*.js'
      },
      performance: {
        title: 'Performance Optimization',
        description: 'Optimize rendering and reduce lag',
        code: `
// Use React.memo for expensive components
const MyComponent = React.memo(({ data }) => {
  // Component code
});

// Use useMemo for expensive calculations
const processedData = useMemo(() => 
  expensiveOperation(data), [data]);`,
        applicable: true,
        file: 'src/screens/*.js'
      },
      runtime: {
        title: 'Runtime Safety Fix',
        description: 'Add defensive programming',
        code: `
// Use optional chaining
const value = obj?.nested?.property;

// Validate inputs
const safeParse = (json, fallback = {}) => {
  try {
    return JSON.parse(json);
  } catch {
    return fallback;
  }
};`,
        applicable: true,
        file: 'src/utils/*.js'
      }
    };
    
    return fixes[issueType] || { 
      title: 'Unknown Issue', 
      description: 'Manual investigation required',
      applicable: false 
    };
  }

  async applyFix(fix) {
    console.log(`\n   📂 Attempting to apply fix to ${fix.file}...`);
    
    // Check if we have write access to the app source
    const appSourcePath = path.join(__dirname, '..', 'apps', this.appId);
    
    if (fs.existsSync(appSourcePath)) {
      // Create a fix suggestion file
      const fixFile = path.join(__dirname, 'data', `fix_${Date.now()}.js`);
      
      const fixContent = `
/**
 * Auto-generated fix for ${this.appId}
 * Issue type: ${fix.title}
 * Generated: ${new Date().toISOString()}
 * 
 * ${fix.description}
 * 
 * Suggested code:
 ${fix.code}
 */
`;
      
      fs.writeFileSync(fixFile, fixContent);
      console.log(`   ✅ Fix written to: ${fixFile}`);
    } else {
      console.log(`   ℹ️ App source not found. Fix saved to memory.`);
    }
  }

  async generateTestReport() {
    console.log('\n📊 '.padEnd(50, '─'));
    console.log('   Generating Test Report');
    console.log('─'.repeat(50));
    
    const report = {
      summary: {
        appId: this.appId,
        sessionId: this.sessionId,
        generatedAt: new Date().toISOString(),
        duration: `${this.iteration} iterations`,
        totalIssues: this.issues.length
      },
      exploration: {
        screensVisited: Array.from(this.visitedScreens),
        elementsEncountered: Array.from(this.visitedElements),
        totalActions: this.testActions.length
      },
      issues: this.issues.reduce((acc, issue) => {
        if (!acc[issue.type]) acc[issue.type] = [];
        acc[issue.type].push(issue);
        return acc;
      }, {}),
      severityBreakdown: this.issues.reduce((acc, issue) => {
        acc[issue.severity] = (acc[issue.severity] || 0) + 1;
        return acc;
      }, {}),
      testActions: this.testActions,
      recommendations: this.generateRecommendations()
    };
    
    // Print summary
    console.log(`\n📋 Test Summary:`);
    console.log(`   App: ${report.summary.appId}`);
    console.log(`   Iterations: ${report.summary.duration}`);
    console.log(`   Screens explored: ${report.exploration.screensVisited.length}`);
    console.log(`   Elements tested: ${report.exploration.elementsEncountered.length}`);
    console.log(`   Total issues found: ${report.summary.totalIssues}`);
    
    console.log(`\n⚠️ Issues by Severity:`);
    for (const [severity, count] of Object.entries(report.severityBreakdown)) {
      const emoji = severity === 'critical' ? '🔴' : severity === 'high' ? '🟠' : severity === 'medium' ? '🟡' : '🟢';
      console.log(`   ${emoji} ${severity}: ${count}`);
    }
    
    console.log(`\n📝 Issues by Type:`);
    for (const [type, issues] of Object.entries(report.issues)) {
      console.log(`   • ${type}: ${issues.length}`);
    }
    
    console.log(`\n💡 Recommendations:`);
    report.recommendations.forEach((rec, i) => {
      console.log(`   ${i + 1}. ${rec}`);
    });
    
    // Save report
    const reportPath = path.join(__dirname, 'data', `report_${this.sessionId}.json`);
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`\n✅ Full report saved to: ${reportPath}`);
    
    return report;
  }

  generateRecommendations() {
    const recommendations = [];
    
    // Based on issues found
    if (this.issues.some(i => i.type === 'crash')) {
      recommendations.push('URGENT: Implement crash handling and error boundaries');
    }
    if (this.issues.some(i => i.type === 'error')) {
      recommendations.push('Add comprehensive error handling with user feedback');
    }
    if (this.issues.some(i => i.type === 'network')) {
      recommendations.push('Implement offline mode and retry logic for network operations');
    }
    if (this.issues.some(i => i.type === 'ui_bug')) {
      recommendations.push('Review UI component states (disabled/hidden)');
    }
    if (this.issues.some(i => i.type === 'performance')) {
      recommendations.push('Optimize rendering with React.memo and useMemo');
    }
    
    // General recommendations
    if (this.visitedScreens.size < 3) {
      recommendations.push('Expand test coverage to cover more screens');
    }
    if (recommendations.length === 0) {
      recommendations.push('No critical issues found. Consider expanding test cases.');
    }
    
    return recommendations;
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  stop() {
    this.running = false;
  }
}

// CLI Interface
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    appId: 'cleantasks',
    sessionId: null,
    continuous: false,
    maxIterations: 50,
    fixIssues: false,
    generateReport: true,
    simulateIssues: false
  };
  
  args.forEach(arg => {
    if (arg.startsWith('--appId=')) options.appId = arg.split('=')[1];
    else if (arg.startsWith('--sessionId=')) options.sessionId = arg.split('=')[1];
    else if (arg === '--continuous') options.continuous = true;
    else if (arg.startsWith('--maxIterations=')) options.maxIterations = parseInt(arg.split('=')[1]);
    else if (arg === '--fixIssues') options.fixIssues = true;
    else if (arg === '--report') options.generateReport = true;
    else if (arg === '--simulateIssues') options.simulateIssues = true;
  });
  
  // Generate session ID if not provided
  if (!options.sessionId) {
    options.sessionId = `${options.appId}_${Date.now()}`;
  }
  
  return options;
}

// Main
const options = parseArgs();
const agent = new AppLensAgent(options);

console.log('\n🚀 Starting AppLens Agent...\n');

agent.start()
  .then(results => {
    console.log('\n✨ Agent completed successfully');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n💥 Agent failed:', error);
    process.exit(1);
  });

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Stopping agent...');
  agent.stop();
});
