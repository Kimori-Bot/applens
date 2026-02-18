#!/usr/bin/env node
/**
 * AppLens AI Agent
 * 
 * This agent connects to AppLens and controls the app testing.
 * It analyzes the current app state and decides what to explore next.
 * 
 * Usage:
 *   node ai-agent.js --appId cleantasks --sessionId <session-id>
 * 
 * Or run continuously:
 *   node ai-agent.js --appId cleantasks --continuous
 */

const API_URL = process.env.APPLENS_API_URL || 'http://100.79.223.42:3002';

// Simple AI decision making (can be replaced with actual LLM)
const DECISION_PROMPT = `
You are an AI testing agent. You need to explore a mobile app systematically.

Current app state:
- Screens visited: {screens}
- Elements encountered: {elements}
- Current screen: {currentScreen}

Actions available:
- navigate(screenName) - Go to a specific screen
- tap(elementId) - Tap an element
- input(field, value) - Enter text
- complete() - Done testing

What should you do next? Choose an action that explores new functionality.
Respond with JSON: { "action": "navigate|tap|input|complete", "params": { ... } }
`;

class AppLensAgent {
  constructor(appId, sessionId) {
    this.appId = appId;
    this.sessionId = sessionId;
    this.visitedScreens = new Set();
    this.visitedElements = new Set();
    this.currentScreen = 'unknown';
    this.running = false;
    this.maxIterations = 50;
    this.iteration = 0;
  }

  async start() {
    console.log(`🤖 Starting AppLens Agent for ${this.appId}`);
    console.log(`   Session: ${this.sessionId}`);
    console.log(`   API: ${API_URL}`);
    console.log('');
    
    this.running = true;
    
    while (this.running && this.iteration < this.maxIterations) {
      this.iteration++;
      
      try {
        // Get current app state
        const state = await this.getAppState();
        
        // Make a decision
        const decision = await this.makeDecision(state);
        
        // Execute the decision
        if (decision.action === 'complete') {
          console.log('✅ Testing complete!');
          await this.sendCommand({ action: 'complete', params: {} });
          break;
        }
        
        // Send command to app
        console.log(`📤 Action: ${decision.action}`, decision.params);
        await this.sendCommand(decision);
        
        // Wait for app to respond
        await this.sleep(2000);
        
      } catch (error) {
        console.error('❌ Error:', error.message);
        await this.sleep(1000);
      }
    }
    
    if (this.iteration >= this.maxIterations) {
      console.log('⚠️ Max iterations reached');
    }
    
    console.log(`\n🏁 Agent finished after ${this.iteration} iterations`);
  }

  async getAppState() {
    // Get screens
    const screensRes = await fetch(`${API_URL}/api/screens?sessionId=${this.sessionId}`);
    const screens = await screensRes.json();
    
    // Get elements
    const elementsRes = await fetch(`${API_URL}/api/elements?sessionId=${this.sessionId}`);
    const elements = await elementsRes.json();
    
    // Get sessions for current state
    const sessionsRes = await fetch(`${API_URL}/api/sessions?sessionId=${this.sessionId}`);
    const sessions = await sessionsRes.json();
    
    const currentScreen = sessions[0]?.current_screen || 'unknown';
    
    // Update tracking
    screens.forEach(s => this.visitedScreens.add(s.screen_name));
    elements.forEach(e => this.visitedElements.add(e.element_id));
    
    return {
      screens: this.visitedScreens,
      elements: this.visitedElements,
      currentScreen,
      allScreens: screens,
      allElements: elements,
    };
  }

  async makeDecision(state) {
    const { currentScreen, allScreens, allElements } = state;
    
    console.log(`\n📊 Current screen: ${currentScreen}`);
    console.log(`   Screens visited: ${this.visitedScreens.size}`);
    console.log(`   Elements encountered: ${this.visitedElements.size}`);
    
    // Simple rule-based decision making
    // In production, integrate with actual LLM
    
    // Explore new screens if we haven't visited many
    if (this.visitedScreens.size < 3) {
      const screenOptions = ['Home', 'Settings', 'Add', 'Edit', 'Details'];
      const randomScreen = screenOptions[Math.floor(Math.random() * screenOptions.length)];
      
      // Try to find matching element to tap first
      if (allElements.length > 0) {
        const randomElement = allElements[Math.floor(Math.random() * allElements.length)];
        return {
          action: 'tap',
          params: { elementId: randomElement.element_id }
        };
      }
    }
    
    // If we have elements, try tapping one
    if (allElements.length > 0) {
      const action = allElements[Math.floor(Math.random() * Math.min(5, allElements.length))];
      if (action && action.element_type === 'button' || action.element_type === 'touchable') {
        return {
          action: 'tap',
          params: { elementId: action.element_id }
        };
      }
    }
    
    // Complete if we've explored enough
    if (this.visitedScreens.size >= 3 || this.iteration >= 10) {
      return { action: 'complete', params: {} };
    }
    
    // Default: try tapping something
    if (allElements.length > 0) {
      return {
        action: 'tap',
        params: { elementId: allElements[0].element_id }
      };
    }
    
    return { action: 'complete', params: {} };
  }

  async sendCommand(command) {
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
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  stop() {
    this.running = false;
  }
}

// CLI interface
const args = process.argv.slice(2);
const appId = args.find(a => a.startsWith('--appId='))?.split('=')[1] || 'cleantasks';
const sessionId = args.find(a => a.startsWith('--sessionId='))?.split('=')[1] || `session_${Date.now()}`;

const agent = new AppLensAgent(appId, sessionId);
agent.start().catch(console.error);

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Stopping agent...');
  agent.stop();
});