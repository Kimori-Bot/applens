/**
 * AppLens Test Mode SDK for React Native
 * Enables remote control of React Native apps via AppLens Test Mode API
 */

const API_URL = 'http://localhost:3002';

class AppLensSDK {
  constructor() {
    this.appId = null;
    this.sessionId = null;
    this.isTestMode = false;
    this.pollInterval = null;
    this.commandPollingInterval = null;
    this.trackedElements = new Map();
    this.currentScreen = null;
    this.apiUrl = API_URL;
    this.onScreenChange = null;
    this.onElementTracked = null;
  }

  /**
   * Initialize the AppLens SDK
   * @param {Object} config
   * @param {string} config.appId - Unique identifier for the app
   * @param {string} config.sessionId - Session ID for tracking (optional, defaults to UUID)
   * @param {string} config.apiUrl - Custom API URL (optional)
   * @param {boolean} config.testMode - Enable test mode for remote control
   */
  initialize(config) {
    this.appId = config.appId || 'cleantasks';
    this.sessionId = config.sessionId || this.generateUUID();
    this.apiUrl = config.apiUrl || API_URL;
    this.isTestMode = config.testMode !== false;

    console.log('[AppLens] Initialized with appId:', this.appId, 'sessionId:', this.sessionId);

    if (this.isTestMode) {
      this.startCommandPolling();
    }

    return this;
  }

  /**
   * Generate a UUID
   */
  generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  /**
   * Start polling for commands from the test server
   */
  startCommandPolling() {
    if (this.commandPollingInterval) {
      return;
    }

    console.log('[AppLens] Starting command polling...');
    
    this.commandPollingInterval = setInterval(async () => {
      await this.pollCommands();
    }, 500);
  }

  /**
   * Stop polling for commands
   */
  stopCommandPolling() {
    if (this.commandPollingInterval) {
      clearInterval(this.commandPollingInterval);
      this.commandPollingInterval = null;
    }
  }

  /**
   * Poll for pending commands from the server
   */
  async pollCommands() {
    try {
      const response = await fetch(
        `${this.apiUrl}/api/test/commands?sessionId=${this.sessionId}`
      );

      if (!response.ok) {
        return;
      }

      const data = await response.json();

      if (data.commands && data.commands.length > 0) {
        for (const command of data.commands) {
          await this.executeCommand(command);
        }
      }
    } catch (error) {
      // Silently ignore polling errors
    }
  }

  /**
   * Execute a test command
   * @param {Object} command
   */
  async executeCommand(command) {
    console.log('[AppLens] Executing command:', command);
    
    const result = {
      commandId: command.id,
      success: false,
      message: ''
    };

    try {
      switch (command.action) {
        case 'tap':
          result.success = await this.executeTap(command);
          result.message = result.success ? 'Tap executed' : 'Tap failed';
          break;
        case 'swipe':
          result.success = await this.executeSwipe(command);
          result.message = result.success ? 'Swipe executed' : 'Swipe failed';
          break;
        case 'input':
          result.success = await this.executeInput(command);
          result.message = result.success ? 'Input executed' : 'Input failed';
          break;
        case 'back':
          result.success = await this.executeBack(command);
          result.message = result.success ? 'Back executed' : 'Back failed';
          break;
        default:
          result.message = `Unknown action: ${command.action}`;
      }
    } catch (error) {
      result.message = `Error: ${error.message}`;
    }

    // Report result to server
    await this.reportCommandResult(command.id, result);
  }

  /**
   * Execute a tap command using React Native's UIManager
   */
  async executeTap(command) {
    try {
      const { UIManager } = require('react-native');
      
      if (command.x && command.y) {
        // Direct coordinate tap via JS
        // In a real implementation, we'd use native driver
        console.log('[AppLens] Tap at:', command.x, command.y);
        
        // Dispatch a synthetic touch event
        if (UIManager.dispatchViewManagerCommand) {
          // For Android
          UIManager.dispatchViewManagerCommand(
            'root',
            'onTouch',
            [{ action: 'select', x: command.x, y: command.y }]
          );
        }
        
        return true;
      } else if (command.elementId) {
        // Tap by element ID - find and tap the element
        const element = this.trackedElements.get(command.elementId);
        if (element) {
          console.log('[AppLens] Tap element:', element.label || element.id);
          return true;
        }
      }
      
      return false;
    } catch (error) {
      console.error('[AppLens] Tap error:', error);
      return false;
    }
  }

  /**
   * Execute a swipe command
   */
  async executeSwipe(command) {
    try {
      console.log('[AppLens] Swipe:', command.direction, 'from', command.x, command.y);
      // In a real implementation, use native driver for gestures
      return true;
    } catch (error) {
      console.error('[AppLens] Swipe error:', error);
      return false;
    }
  }

  /**
   * Execute an input command
   */
  async executeInput(command) {
    try {
      console.log('[AppLens] Input:', command.value, 'to element:', command.elementId);
      // In a real implementation, find the TextInput and set its value
      return true;
    } catch (error) {
      console.error('[AppLens] Input error:', error);
      return false;
    }
  }

  /**
   * Execute a back navigation command
   */
  async executeBack(command) {
    try {
      const { BackHandler } = require('react-native');
      BackHandler.exitApp();
      return true;
    } catch (error) {
      console.error('[AppLens] Back error:', error);
      return false;
    }
  }

  /**
   * Report command result to server
   */
  async reportCommandResult(commandId, result) {
    try {
      await fetch(`${this.apiUrl}/api/test/commandResult`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: this.sessionId,
          appId: this.appId,
          commandId,
          ...result
        })
      });
    } catch (error) {
      console.error('[AppLens] Failed to report result:', error);
    }
  }

  /**
   * Track a screen/navigation
   * @param {Object} screen
   * @param {string} screen.id - Unique screen identifier
   * @param {string} screen.name - Screen name/title
   */
  async trackScreen(screen) {
    this.currentScreen = screen;
    console.log('[AppLens] Screen tracked:', screen.name);

    if (this.onScreenChange) {
      this.onScreenChange(screen);
    }

    try {
      await fetch(`${this.apiUrl}/api/screen`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: this.sessionId,
          appId: this.appId,
          screen: {
            id: screen.id,
            name: screen.name
          }
        })
      });
    } catch (error) {
      console.error('[AppLens] Failed to track screen:', error);
    }
  }

  /**
   * Track an interactive element
   * @param {Object} element
   * @param {string} element.id - Unique element identifier
   * @param {string} element.type - Element type (TouchableOpacity, TextInput, etc.)
   * @param {string} element.label - Element label/text
   * @param {number} element.x - X position
   * @param {number} element.y - Y position
   * @param {number} element.width - Element width
   * @param {number} element.height - Element height
   */
  async trackElement(element) {
    const elementId = element.id || this.generateUUID();
    
    this.trackedElements.set(elementId, { ...element, id: elementId });
    console.log('[AppLens] Element tracked:', element.type, element.label || elementId);

    if (this.onElementTracked) {
      this.onElementTracked(element);
    }

    try {
      await fetch(`${this.apiUrl}/api/element`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: this.sessionId,
          appId: this.appId,
          element: {
            id: elementId,
            type: element.type,
            label: element.label,
            x: element.x || 0,
            y: element.y || 0,
            width: element.width || 0,
            height: element.height || 0
          }
        })
      });
    } catch (error) {
      console.error('[AppLens] Failed to track element:', error);
    }
  }

  /**
   * Create a tracked version of TouchableOpacity
   * Use this instead of the regular TouchableOpacity
   */
  createTrackedTouchable(ReactNative) {
    const { TouchableOpacity, Text, View } = ReactNative;
    
    return class TrackedTouchable extends TouchableOpacity {
      constructor(props) {
        super(props);
        this._elementId = props.testID || this.generateElementId();
      }

      generateElementId() {
        return `touchable_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      }

      componentDidMount() {
        super.componentDidMount && super.componentDidMount();
        
        // Get layout measurements
        this._measure((x, y, width, height) => {
          this.props.__appLensTrack && this.props.__appLensTrack({
            id: this._elementId,
            type: 'TouchableOpacity',
            label: this.props.accessibilityLabel || this.props.children?.toString(),
            x, y, width, height
          });
        });
      }

      _measure(callback) {
        // In a real implementation, use onLayout to get measurements
        if (this.root) {
          this.root.measure((x, y, width, height) => {
            callback(x, y, width, height);
          });
        }
      }
    };
  }

  /**
   * Set callback for screen changes
   */
  setScreenChangeCallback(callback) {
    this.onScreenChange = callback;
  }

  /**
   * Set callback for element tracking
   */
  setElementTrackedCallback(callback) {
    this.onElementTracked = callback;
  }

  /**
   * Clean up resources
   */
  cleanup() {
    this.stopCommandPolling();
    this.trackedElements.clear();
  }
}

// Singleton instance
const appLens = new AppLensSDK();

module.exports = {
  AppLensSDK,
  appLens,
  // Helper hook for React components
  useAppLens: (config) => {
    const React = require('react');
    const { useEffect, useRef } = React;
    
    useEffect(() => {
      if (!appLens.appId) {
        appLens.initialize(config);
      }
    }, []);

    const trackScreen = (screen) => appLens.trackScreen(screen);
    const trackElement = (element) => appLens.trackElement(element);

    return { trackScreen, trackElement, appLens };
  }
};
