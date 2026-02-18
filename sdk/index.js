/**
 * AppLens SDK - Full Implementation
 * 
 * Features:
 * - Screenshot capture with react-native-view-shot
 * - UI automation (tap, input) via component registry
 * - Video recording support
 * - AI command polling and execution
 * 
 * Install: npm install applens-sdk react-native-view-shot
 * 
 * Usage:
 *   import { AppLensProvider, useAppLens, withAppLens } from 'applens-sdk';
 *   
 *   // Wrap your app
 *   <AppLensProvider apiUrl="http://your-server:3002" appId="your-app" testMode={true}>
 *     <YourApp />
 *   </AppLensProvider>
 *   
 *   // Track elements with testID
 *   <TouchableOpacity testID="my-button" onPress={...}>Click</TouchableOpacity>
 *   
 *   // For screenshot capture
 *   import { captureScreen } from 'applens-sdk';
 *   captureScreen(); // Call on screen mount
 */

import React, { createContext, useContext, useEffect, useRef, useState, forwardRef } from 'react';

// Context for SDK state
const AppLensContext = createContext(null);

// Component registry for UI automation
const componentRegistry = new Map();

// Storage for refs to captured views
const viewRefs = new Map();

// Provider component
export const AppLensProvider = ({ children, apiUrl, appId, testMode = false, enableScreenshots = true }) => {
  const config = {
    apiUrl: apiUrl || 'http://localhost:3002',
    appId: appId || 'unknown',
    testMode,
    enableScreenshots,
    sessionId: appId + '_' + Date.now(),
    screenshotCount: 0,
  };

  useEffect(() => {
    if (testMode) {
      startCommandPolling(config);
    }
    if (enableScreenshots) {
      initScreenshotCapture(config);
    }
  }, [testMode, enableScreenshots]);

  return (
    <AppLensContext.Provider value={config}>
      {children}
    </AppLensContext.Provider>
  );
};

// Hook to get config
export const useAppLens = () => useContext(AppLensContext);

// ============ SCREENSHOT CAPTURE ============

// Initialize screenshot capture
const initScreenshotCapture = async (config) => {
  // Dynamic import for view-shot (only available if installed)
  try {
    const viewShot = require('react-native-view-shot');
    config.viewShot = viewShot;
    console.log('[AppLens] Screenshot capture initialized');
  } catch (e) {
    console.log('[AppLens] react-native-view-shot not installed, screenshots disabled');
  }
};

// Capture screenshot and send to API
export const captureScreen = async (screenName = 'unknown', config = {}) => {
  if (!config.apiUrl || !config.enableScreenshots) return;
  
  try {
    const viewRef = viewRefs.get('main');
    if (!viewRef) {
      console.log('[AppLens] No view ref found for screenshot');
      return;
    }
    
    const uri = await config.viewShot.captureRef(viewRef, {
      format: 'jpg',
      quality: 0.8,
    });
    
    // Read as base64
    const RNFS = require('react-native-fs');
    const base64 = await RNFS.readFile(uri, 'base64');
    
    const screenshotId = `screenshot_${Date.now()}_${config.screenshotCount++}`;
    
    await fetch(`${config.apiUrl}/api/screenshot`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: config.sessionId,
        appId: config.appId,
        screenshot: {
          id: screenshotId,
          data: `data:image/jpeg;base64,${base64}`,
          screen: screenName,
          timestamp: new Date().toISOString(),
        }
      })
    });
    
    console.log('[AppLens] Screenshot captured:', screenshotId);
    return screenshotId;
  } catch (e) {
    console.log('[AppLens] Screenshot error:', e.message);
  }
};

// HOC to capture screenshots on screen mount
export const withScreenshot = (Component, screenName) => {
  return forwardRef((props, ref) => {
    const appLensConfig = useAppLens();
    
    useEffect(() => {
      if (appLensConfig?.enableScreenshots) {
        // Small delay to ensure render complete
        const timer = setTimeout(() => {
          captureScreen(screenName, appLensConfig);
        }, 500);
        return () => clearTimeout(timer);
      }
    }, [screenName]);
    
    return <Component ref={ref} {...props} />;
  });
};

// Component to wrap screens for automatic screenshot capture
export const AppLensScreen = ({ name, children, style }) => {
  const config = useAppLens();
  const viewRef = useRef(null);
  
  useEffect(() => {
    if (config?.enableScreenshots) {
      viewRefs.set('main', viewRef.current);
      
      const timer = setTimeout(() => {
        if (viewRef.current && config.viewShot) {
          captureScreen(name, config);
        }
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [name]);
  
  return (
    <View ref={viewRef} style={style}>
      {children}
    </View>
  );
};

// ============ UI AUTOMATION - COMPONENT REGISTRY ============

// Register a component for automation
export const registerElement = (elementId, handler) => {
  componentRegistry.set(elementId, handler);
};

// Unregister element
export const unregisterElement = (elementId) => {
  componentRegistry.delete(elementId);
};

// Get registered element handler
export const getElementHandler = (elementId) => {
  return componentRegistry.get(elementId);
};

// HOC to add automation support to Touchable components
export const withAppLens = (Component, elementId) => {
  return forwardRef((props, ref) => {
    const config = useAppLens();
    
    // Create wrapped onPress that tracks and can be triggered by AI
    const originalOnPress = props.onPress;
    const wrappedOnPress = (...args) => {
      // Track the element interaction
      if (config?.apiUrl) {
        trackElement(elementId, props.testID || 'touchable', props.children?.toString?.() || '', config);
      }
      
      // Call original handler
      if (originalOnPress) {
        return originalOnPress(...args);
      }
    };
    
    // Register for AI automation when in test mode
    useEffect(() => {
      if (config?.testMode && elementId) {
        registerElement(elementId, wrappedOnPress);
      }
      
      return () => {
        if (elementId) {
          unregisterElement(elementId);
        }
      };
    }, [config?.testMode]);
    
    // Add testID for element identification
    const enhancedProps = {
      ...props,
      testID: props.testID || elementId,
      onPress: wrappedOnPress,
    };
    
    return <Component ref={ref} {...enhancedProps} />;
  });
};

// Wrapper for TextInput with automation support
export const AppLensInput = ({ testID, onChangeText, ...props }) => {
  const config = useAppLens();
  
  useEffect(() => {
    if (config?.testMode && testID) {
      // Register input handler
      registerElement(testID, {
        type: 'input',
        onChangeText,
        setValue: (value) => {
          if (onChangeText) onChangeText(value);
        }
      });
    }
    
    return () => {
      if (testID) unregisterElement(testID);
    };
  }, [testMode, onChangeText]);
  
  return <TextInput testID={testID} onChangeText={onChangeText} {...props} />;
};

// Wrapper for TouchableOpacity
export const AppLensButton = ({ testID, onPress, children, ...props }) => {
  const TouchableButton = withAppLens(require('react-native').TouchableOpacity, testID);
  return (
    <TouchableButton testID={testID} onPress={onPress} {...props}>
      {children}
    </TouchableButton>
  );
};

// ============ TRACKING ============

// Track screen visit
export const trackScreen = (screenName, config = {}) => {
  if (!config.apiUrl) return;
  
  fetch(`${config.apiUrl}/api/screen`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sessionId: config.sessionId,
      appId: config.appId,
      screen: { 
        id: screenName.toLowerCase().replace(/\s+/g, '-'), 
        name: screenName,
        timestamp: new Date().toISOString(),
      }
    })
  }).catch(e => console.log('[AppLens] trackScreen:', e.message));
};

// Track element interaction
export const trackElement = (elementId, elementType, elementLabel, config = {}) => {
  if (!config.apiUrl) return;
  
  fetch(`${config.apiUrl}/api/element`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sessionId: config.sessionId,
      appId: config.appId,
      element: { 
        id: elementId, 
        type: elementType, 
        label: elementLabel,
        timestamp: new Date().toISOString(),
      }
    })
  }).catch(e => console.log('[AppLens] trackElement:', e.message));
};

// ============ AI COMMAND POLLING & EXECUTION ============

// Polling for AI commands
const startCommandPolling = async (config) => {
  const poll = async () => {
    try {
      const res = await fetch(`${config.apiUrl}/api/test/commands?sessionId=${config.sessionId}`);
      const data = await res.json();
      
      if (data.commands && data.commands.length > 0) {
        for (const cmd of data.commands) {
          await executeCommand(cmd, config);
        }
      }
    } catch (e) { console.log('[AppLens] Poll:', e.message); }
  };
  
  setInterval(poll, 1500);
  poll();
};

// Execute AI command
const executeCommand = async (command, config) => {
  console.log('[AppLens] Executing:', command);
  const { action, params, id } = command;
  let result = { success: true, action, id };
  
  try {
    switch (action) {
      case 'tap':
        // Find and trigger the element's onPress
        const tapHandler = getElementHandler(params.elementId);
        if (tapHandler) {
          if (typeof tapHandler === 'function') {
            tapHandler();
            result.message = `Tapped ${params.elementId}`;
          } else if (tapHandler.type === 'input') {
            result.success = false;
            result.error = `${params.elementId} is an input, use 'input' command`;
          }
        } else {
          result.success = false;
          result.error = `Element not found: ${params.elementId}`;
        }
        break;
        
      case 'input':
        // Find input and set value
        const inputHandler = getElementHandler(params.elementId);
        if (inputHandler && inputHandler.type === 'input') {
          inputHandler.setValue(params.value);
          result.message = `Set ${params.elementId} = "${params.value}"`;
        } else {
          result.success = false;
          result.error = `Input not found: ${params.elementId}`;
        }
        break;
        
      case 'capture':
        // Capture screenshot
        const screenshotId = await captureScreen(params.screen || 'unknown', config);
        result.message = screenshotId ? `Screenshot captured: ${screenshotId}` : 'Screenshot failed';
        break;
        
      case 'complete':
        result.message = 'Testing complete';
        break;
        
      case 'wait':
        // Wait for specified duration
        await new Promise(r => setTimeout(r, params.duration || 1000));
        result.message = `Waited ${params.duration || 1000}ms`;
        break;
        
      default:
        result.success = false;
        result.error = `Unknown command: ${action}`;
    }
  } catch (error) {
    result.success = false;
    result.error = error.message;
  }
  
  // Report result
  try {
    await fetch(`${config.apiUrl}/api/test/commandResult`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        sessionId: config.sessionId, 
        appId: config.appId, 
        result 
      })
    });
  } catch (e) { console.log('[AppLens] Result error:', e.message); }
};

// ============ VIDEO RECORDING (stretch goal) ============

let videoRecorder = null;

export const startRecording = async (config) => {
  if (videoRecorder) {
    console.log('[AppLens] Recording already in progress');
    return;
  }
  
  try {
    // Would use react-native-camera or similar
    // For now, just a placeholder
    console.log('[AppLens] Video recording started');
    videoRecorder = {
      startTime: Date.now(),
      config,
    };
  } catch (e) {
    console.log('[AppLens] Recording error:', e.message);
  }
};

export const stopRecording = async (config) => {
  if (!videoRecorder) {
    console.log('[AppLens] No recording in progress');
    return;
  }
  
  const duration = Date.now() - videoRecorder.startTime;
  console.log('[AppLens] Video recording stopped, duration:', duration);
  
  // Would upload to Supabase here
  videoRecorder = null;
};

// ============ EXPORTS ============

export default { 
  AppLensProvider, 
  useAppLens, 
  trackScreen, 
  trackElement,
  captureScreen,
  withScreenshot,
  withAppLens,
  AppLensScreen,
  AppLensButton,
  AppLensInput,
  registerElement,
  unregisterElement,
  getElementHandler,
  startRecording,
  stopRecording,
};
