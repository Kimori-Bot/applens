/**
 * AppLens SDK for React Native
 * AI-powered app review capabilities - Week 2 Edition
 * Features: Screenshot capture, auto-sessions, enhanced tracking
 */

import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, Platform } from 'react-native';

// Try to import react-native-view-shot for screenshot capture
let captureRef = null;
let ViewShot = null;
try {
  const viewShot = require('react-native-view-shot');
  ViewShot = viewShot.default || viewShot;
  captureRef = viewShot.capture || viewShot.captureRef;
} catch (e) {
  console.log('react-native-view-shot not available - screenshots disabled');
}

// Context for AppLens
const AppLensContext = createContext(null);

// Generate unique IDs
const generateId = (prefix = 'item') => `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

// Default configuration
const defaultConfig = {
  apiUrl: 'http://localhost:3002',
  appId: null,
  organizationId: null,
  sessionId: null,
  autoTrack: true,
  autoCaptureScreenshots: true,
  screenshotInterval: 5000, // ms between screenshots
  debug: false,
};

/**
 * Screenshot capture utility
 */
const captureScreenshot = async (viewRef, options = {}) => {
  if (!captureRef || !viewRef) {
    console.log('Screenshot capture not available');
    return null;
  }
  
  try {
    const uri = await captureRef(viewRef, {
      format: 'jpg',
      quality: 0.8,
      result: 'base64',
      ...options,
    });
    return uri;
  } catch (err) {
    console.error('Screenshot capture failed:', err);
    return null;
  }
};

/**
 * AppLensProvider - Main provider component
 * Wraps your app to enable AppLens tracking
 */
export const AppLensProvider = ({ children, config = {} }) => {
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [screens, setScreens] = useState([]);
  const [elements, setElements] = useState([]);
  const [screenshots, setScreenshots] = useState([]);
  const [currentScreen, setCurrentScreen] = useState(null);
  const [sessionStartTime, setSessionStartTime] = useState(null);
  const [sessionActivity, setSessionActivity] = useState([]);
  
  const configRef = useRef({ ...defaultConfig, ...config });
  const screenshotTimerRef = useRef(null);
  const mainViewRef = useRef(null);

  // Initialize session on mount
  useEffect(() => {
    if (!configRef.current.sessionId) {
      configRef.current.sessionId = generateId('session');
    }
    
    // Auto-start session if enabled
    if (configRef.current.autoTrack) {
      startSession();
    }
    
    return () => {
      if (screenshotTimerRef.current) {
        clearInterval(screenshotTimerRef.current);
      }
    };
  }, []);

  // Log debug messages
  const log = useCallback((...args) => {
    if (configRef.current.debug) {
      console.log('[AppLens]', ...args);
    }
  }, []);

  // Record activity
  const recordActivity = useCallback((type, data) => {
    const activity = {
      id: generateId('activity'),
      type,
      data,
      timestamp: Date.now(),
    };
    setSessionActivity(prev => [...prev, activity]);
    
    // Send to API if session is active
    if (isSessionActive && configRef.current.apiUrl) {
      fetch(`${configRef.current.apiUrl}/api/activity`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: configRef.current.sessionId,
          appId: configRef.current.appId,
          activity,
        }),
      }).catch(err => log('Failed to send activity:', err));
    }
  }, [isSessionActive, log]);

  /**
   * Start a review session - auto-creates session on server
   */
  const startSession = useCallback(() => {
    const newSessionId = generateId('session');
    configRef.current.sessionId = newSessionId;
    setIsSessionActive(true);
    setSessionStartTime(Date.now());
    setSessionActivity([]);
    setScreens([]);
    setElements([]);
    setScreenshots([]);
    
    log('Session started:', newSessionId);
    recordActivity('session_start', { sessionId: newSessionId });

    // Auto-create session on server
    if (configRef.current.apiUrl) {
      fetch(`${configRef.current.apiUrl}/api/session/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: newSessionId,
          appId: configRef.current.appId,
          organizationId: configRef.current.organizationId,
        }),
      }).catch(err => log('Failed to create session on server:', err));
    }

    // Start automatic screenshot capture
    if (configRef.current.autoCaptureScreenshots && captureRef) {
      screenshotTimerRef.current = setInterval(() => {
        if (mainViewRef.current && isSessionActive) {
          takeScreenshot();
        }
      }, configRef.current.screenshotInterval);
    }

    return newSessionId;
  }, [log, recordActivity]);

  /**
   * Stop the review session
   */
  const stopSession = useCallback(() => {
    setIsSessionActive(false);
    
    if (screenshotTimerRef.current) {
      clearInterval(screenshotTimerRef.current);
      screenshotTimerRef.current = null;
    }
    
    recordActivity('session_end', { sessionId: configRef.current.sessionId });
    log('Session stopped');

    // End session on server
    if (configRef.current.apiUrl && configRef.current.sessionId) {
      fetch(`${configRef.current.apiUrl}/api/session/${configRef.current.sessionId}/end`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      }).catch(err => log('Failed to end session on server:', err));
    }
  }, [log, recordActivity]);

  /**
   * Take a screenshot and send to server
   */
  const takeScreenshot = useCallback(async (viewRef = null) => {
    const targetRef = viewRef || mainViewRef.current;
    if (!targetRef) return null;
    
    try {
      const uri = await captureScreenshot(targetRef);
      if (!uri) return null;
      
      const screenshotData = {
        id: generateId('screenshot'),
        data: uri, // base64
        timestamp: Date.now(),
        screen: currentScreen,
        sessionId: configRef.current.sessionId,
      };
      
      setScreenshots(prev => [...prev, screenshotData]);
      log('Screenshot captured');
      
      // Send to API
      if (isSessionActive && configRef.current.apiUrl) {
        fetch(`${configRef.current.apiUrl}/api/screenshot`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId: configRef.current.sessionId,
            appId: configRef.current.appId,
            screenshot: screenshotData,
          }),
        }).catch(err => log('Failed to send screenshot:', err));
      }
      
      return screenshotData;
    } catch (err) {
      log('Screenshot error:', err);
      return null;
    }
  }, [currentScreen, isSessionActive, log]);

  /**
   * trackScreen - Track a screen/view
   * @param {string} name - Screen name
   */
  const trackScreen = useCallback((name) => {
    const timestamp = Date.now();
    const screenData = {
      id: generateId('screen'),
      name,
      timestamp,
      elements: [],
    };
    
    setScreens(prev => [...prev, screenData]);
    setCurrentScreen(name);
    recordActivity('screen_view', { screenName: name });
    
    log('Screen tracked:', name);
    
    // Take a screenshot when screen changes
    if (configRef.current.autoCaptureScreenshots) {
      setTimeout(() => takeScreenshot(), 500);
    }
    
    // Send to API if session is active
    if (isSessionActive && configRef.current.apiUrl) {
      fetch(`${configRef.current.apiUrl}/api/screen`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: configRef.current.sessionId,
          appId: configRef.current.appId,
          screen: screenData,
        }),
      }).catch(err => log('Failed to send screen:', err));
    }
    
    return screenData;
  }, [isSessionActive, log, recordActivity, takeScreenshot]);

  /**
   * trackElement - Track a UI element
   * @param {string} id - Element ID
   * @param {string} type - Element type (button, input, text, etc.)
   * @param {string} label - Element label/description
   */
  const trackElement = useCallback((id, type, label) => {
    const timestamp = Date.now();
    const elementData = {
      id: id || generateId('element'),
      type,
      label,
      timestamp,
      screen: currentScreen,
    };
    
    setElements(prev => [...prev, elementData]);
    recordActivity('element_interaction', { elementId: id, type, label });
    
    log('Element tracked:', id, type, label);
    
    // Send to API if session is active
    if (isSessionActive && configRef.current.apiUrl) {
      fetch(`${configRef.current.apiUrl}/api/element`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: configRef.current.sessionId,
          appId: configRef.current.appId,
          element: elementData,
        }),
      }).catch(err => log('Failed to send element:', err));
    }
    
    return elementData;
  }, [isSessionActive, currentScreen, log, recordActivity]);

  /**
   * getComponentTree - Get the current component tree
   * @returns {Object} Component tree structure
   */
  const getComponentTree = useCallback(() => {
    const tree = {
      id: 'root',
      name: 'App',
      type: 'root',
      children: screens.map(screen => ({
        id: screen.id,
        name: screen.name,
        type: 'screen',
        children: elements
          .filter(el => el.screen === screen.name)
          .map(el => ({
            id: el.id,
            name: el.label || el.id,
            type: el.type,
            children: [],
          })),
      })),
    };
    
    log('Component tree retrieved:', JSON.stringify(tree, null, 2));
    return tree;
  }, [screens, elements, log]);

  /**
   * Get session duration in human readable format
   */
  const getSessionDuration = useCallback(() => {
    if (!sessionStartTime) return '0s';
    const duration = Date.now() - sessionStartTime;
    const seconds = Math.floor(duration / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
  }, [sessionStartTime]);

  /**
   * Clear all tracked data
   */
  const clearData = useCallback(() => {
    setScreens([]);
    setElements([]);
    setScreenshots([]);
    setCurrentScreen(null);
    setSessionActivity([]);
    log('Data cleared');
  }, [log]);

  const value = {
    // State
    isSessionActive,
    screens,
    elements,
    screenshots,
    currentScreen,
    sessionStartTime,
    sessionActivity,
    config: configRef.current,
    mainViewRef,
    
    // Methods
    trackScreen,
    trackElement,
    takeScreenshot,
    getComponentTree,
    startSession,
    stopSession,
    clearData,
    getSessionDuration,
  };

  return (
    <AppLensContext.Provider value={value}>
      {children}
    </AppLensContext.Provider>
  );
};

/**
 * useAppLens - Hook to access AppLens functionality
 */
export const useAppLens = () => {
  const context = useContext(AppLensContext);
  if (!context) {
    throw new Error('useAppLens must be used within an AppLensProvider');
  }
  return context;
};

/**
 * ScreenCapture - A component that wraps content for screenshot capture
 */
export const ScreenCapture = ({ children, style, ...props }) => {
  const { takeScreenshot, getComponentTree } = useAppLens();
  
  // If ViewShot is available, use it
  if (ViewShot) {
    return (
      <ViewShot
        ref={(ref) => {
          const { mainViewRef } = useAppLens();
          if (mainViewRef) mainViewRef.current = ref;
        }}
        style={style}
        options={{ format: 'jpg', quality: 0.8 }}
        {...props}
      >
        {children}
      </ViewShot>
    );
  }
  
  // Fallback to regular View
  return (
    <View style={style} {...props}>
      {children}
    </View>
  );
};

/**
 * TrackableView - A View that auto-tracks taps
 */
export const TrackableView = ({ id, label, type = 'view', children, style, ...props }) => {
  const { trackElement } = useAppLens();
  
  return (
    <View
      {...props}
      style={style}
      onTouchEnd={() => {
        if (id) {
          trackElement(id, type, label || id);
        }
      }}
    >
      {children}
    </View>
  );
};

/**
 * TrackableText - A Text component that auto-tracks taps
 */
export const TrackableText = ({ id, label, type = 'text', children, style, ...props }) => {
  const { trackElement } = useAppLens();
  
  return (
    <Text
      {...props}
      style={style}
      onPress={() => {
        if (id) {
          trackElement(id, type, label || id);
        }
      }}
    >
      {children}
    </Text>
  );
};

/**
 * TrackableTouchable - A TouchableOpacity that auto-tracks taps
 */
export const TrackableTouchable = ({ id, label, type = 'button', children, style, onPress, ...props }) => {
  const { trackElement } = useAppLens();
  
  const handlePress = (e) => {
    if (id) {
      trackElement(id, type, label || id);
    }
    if (onPress) onPress(e);
  };
  
  return (
    <TouchableOpacity {...props} style={style} onPress={handlePress}>
      {children}
    </TouchableOpacity>
  );
};

export default {
  AppLensProvider,
  useAppLens,
  ScreenCapture,
  TrackableView,
  TrackableText,
  TrackableTouchable,
};