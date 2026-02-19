/**
 * AppLens SDK - Client side for React Native / Expo
 * Connects to Device Bridge via WebSocket, sends screen state, receives commands
 */

class AppLensClient {
  constructor(config = {}) {
    this.apiUrl = config.apiUrl || 'http://100.79.223.42:3000';
    this.bridgeUrl = config.bridgeUrl || 'ws://100.79.223.42:3003';
    this.appToken = config.appToken || '';
    this.appName = config.appName || 'App';
    this.platform = config.platform || 'ios';
    this.bundleId = config.bundleId || '';
    
    this.ws = null;
    this.connected = false;
    this.commandHandlers = {
      TAP: this.handleTap.bind(this),
      SWIPE: this.handleSwipe.bind(this),
      INPUT: this.handleInput.bind(this),
      BACK: this.handleBack.bind(this)
    };
  }

  async connect() {
    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(this.bridgeUrl);
        
        this.ws.onopen = () => {
          console.log('[AppLens] Connected to bridge');
          this.connected = true;
          
          // Register with app info
          this.send({
            type: 'register',
            payload: {
              appToken: this.appToken,
              appName: this.appName,
              platform: this.platform,
              bundleId: this.bundleId
            }
          });
          
          resolve();
        };
        
        this.ws.onmessage = (event) => {
          const msg = JSON.parse(event.data);
          this.handleMessage(msg);
        };
        
        this.ws.onerror = (err) => {
          console.log('[AppLens] WebSocket error:', err.message);
          // Fall back to HTTP polling
          this.startHTTPPolling();
        };
        
        this.ws.onclose = () => {
          console.log('[AppLens] Disconnected from bridge');
          this.connected = false;
          this.startHTTPPolling();
        };
      } catch (e) {
        console.log('[AppLens] WS failed, using HTTP:', e.message);
        this.startHTTPPolling();
        resolve();
      }
    });
  }

  startHTTPPolling() {
    // Fallback: poll for commands via HTTP
    this.pollInterval = setInterval(async () => {
      try {
        const res = await fetch(`${this.apiUrl}/api/commands/poll?device=${this.deviceId}`);
        const data = await res.json();
        if (data.command) {
          this.executeCommand(data.command);
        }
      } catch (e) {}
    }, 2000);
  }

  handleMessage(msg) {
    const { type, command, deviceId } = msg;
    
    if (type === 'welcome') {
      this.deviceId = deviceId;
      console.log('[AppLens] Device ID:', deviceId);
    }
    else if (type === 'command' && command) {
      this.executeCommand(command);
    }
    else if (type === 'device_list') {
      console.log('[AppLens] Devices:', msg.devices);
    }
  }

  send(msg) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(msg));
    }
  }

  // Send screen state to bridge
  reportScreen(screenName, elements = []) {
    this.send({
      type: 'screen_update',
      payload: {
        screenName,
        elements: elements.map(el => ({
          id: el.id || el.testID,
          type: el.type,
          label: el.label || el.text
        })),
        timestamp: new Date().toISOString()
      }
    });
  }

  // Send screenshot (base64)
  reportScreenshot(base64Image) {
    this.send({
      type: 'screenshot',
      payload: {
        image: base64Image.substring(0, 50000), // Limit size
        timestamp: new Date().toISOString()
      }
    });
  }

  // Execute command from AI
  executeCommand(command) {
    console.log('[AppLens] Executing:', command);
    const handler = this.commandHandlers[command.action];
    if (handler) {
      handler(command);
    }
  }

  handleTap({ x, y }) {
    // In real app, use react-native-gesture-handler or similar
    console.log(`[AppLens] TAP at (${x}, ${y})`);
    // Simulate - in real app would trigger actual tap
    this.send({
      type: 'command_result',
      payload: { action: 'TAP', x, y, success: true }
    });
  }

  handleSwipe({ x1, y1, x2, y2 }) {
    console.log(`[AppLens] SWIPE from (${x1},${y1}) to (${x2},${y2})`);
    this.send({
      type: 'command_result',
      payload: { action: 'SWIPE', success: true }
    });
  }

  handleInput({ text, elementId }) {
    console.log(`[AppLens] INPUT "${text}" into ${elementId}`);
    this.send({
      type: 'command_result',
      payload: { action: 'INPUT', success: true }
    });
  }

  handleBack() {
    console.log('[AppLens] BACK pressed');
    this.send({
      type: 'command_result',
      payload: { action: 'BACK', success: true }
    });
  }
}

// Export for React Native
if (typeof module !== 'undefined') {
  module.exports = { AppLensClient };
}
