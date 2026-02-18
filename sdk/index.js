/**
 * AppLens SDK for React Native
 * AI-powered app review capabilities
 */

import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';

// Context for AppLens
const AppLensContext = createContext(null);

// Default configuration
const defaultConfig = {
  apiUrl: 'http://localhost:3002',
  appId: null,
  organizationId: null,
  sessionId: null,
  autoTrack: true,
  debug: false,
};

/**
 * AppLensProvider - Main provider component
 * Wraps your app to enable AppLens tracking
 */
export const AppLensProvider = ({ children, config = {} }) => {
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [screens, setScreens] = useState([]);
  const [elements, setElements] = useState([]);
  const [currentScreen, setCurrentScreen] = useState(null);
  
  const configRef = useRef({ ...defaultConfig, ...config });

  // Generate a session ID if not provided
  useEffect(() => {
    if (!configRef.current.sessionId) {
      configRef.current.sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
  }, []);

  // Log debug messages
  const log = useCallback((...args) => {
    if (configRef.current.debug) {
      console.log('[AppLens]', ...args);
    }
  }, []);

  /**
   * trackScreen - Track a screen/view
   * @param {string} name - Screen name
   */
  const trackScreen = useCallback((name) => {
    const timestamp = Date.now();
    const screenData = {
      id: `screen_${timestamp}`,
      name,
      timestamp,
      elements: [],
    };
    
    setScreens(prev => [...prev, screenData]);
    setCurrentScreen(name);
    
    log('Screen tracked:', name);
    
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
  }, [isSessionActive, log]);

  /**
   * trackElement - Track a UI element
   * @param {string} id - Element ID
   * @param {string} type - Element type (button, input, text, etc.)
   * @param {string} label - Element label/description
   */
  const trackElement = useCallback((id, type, label) => {
    const timestamp = Date.now();
    const elementData = {
      id,
      type,
      label,
      timestamp,
      screen: currentScreen,
    };
    
    setElements(prev => [...prev, elementData]);
    
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
  }, [isSessionActive, currentScreen, log]);

  /**
   * getComponentTree - Get the current component tree
   * @returns {Object} Component tree structure
   */
  const getComponentTree = useCallback(() => {
    // Build a simple component tree from tracked elements
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
   * Start a review session
   */
  const startSession = useCallback(() => {
    setIsSessionActive(true);
    configRef.current.sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    log('Session started:', configRef.current.sessionId);
  }, [log]);

  /**
   * Stop the review session
   */
  const stopSession = useCallback(() => {
    setIsSessionActive(false);
    log('Session stopped');
  }, [log]);

  /**
   * Clear all tracked data
   */
  const clearData = useCallback(() => {
    setScreens([]);
    setElements([]);
    setCurrentScreen(null);
    log('Data cleared');
  }, [log]);

  const value = {
    // State
    isSessionActive,
    screens,
    elements,
    currentScreen,
    config: configRef.current,
    
    // Methods
    trackScreen,
    trackElement,
    getComponentTree,
    startSession,
    stopSession,
    clearData,
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
  TrackableView,
  TrackableText,
  TrackableTouchable,
};
