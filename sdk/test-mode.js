// AppLens SDK - React Native with Test Mode
// This SDK can run in two modes:
// - Normal: Just tracks screens/elements automatically
// - Test Mode: Listens for remote AI commands and executes them

import { useState, useEffect, useCallback, useRef } from 'react';
import { captureRef } from 'react-native-view-shot';
import { View, Text, TouchableOpacity, TextInput, ScrollView, Modal, Alert } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

// Configuration
const DEFAULT_CONFIG = {
  apiUrl: 'http://100.79.223.42:3002',
  appId: null,
  testMode: false,
  autoTrack: true,
  captureScreenshots: true,
};

// Generate session ID
let _sessionId = null;
const getSessionId = () => {
  if (!_sessionId) _sessionId = 'session_' + Date.now();
  return _sessionId;
};

// Create the AppLens Provider
export const createAppLensProvider = (config = {}) => {
  const AppLensContext = React.createContext(null);
  
  return ({ children, apiUrl, appId, testMode = false, autoTrack = true, captureScreenshots = true }) => {
    const finalConfig = { ...DEFAULT_CONFIG, apiUrl, appId, testMode, autoTrack, captureScreenshots, ...config };
    const [sessionId] = useState(getSessionId());
    const [isConnected, setIsConnected] = useState(false);
    const [currentCommand, setCurrentCommand] = useState(null);
    const commandQueue = useRef([]);
    
    // Track screen to API
    const trackScreen = useCallback(async (screenName) => {
      if (!finalConfig.autoTrack) return;
      try {
        await fetch(`${finalConfig.apiUrl}/api/screen`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId,
            appId: finalConfig.appId,
            screen: {
              id: screenName.toLowerCase().replace(/\s+/g, '-'),
              name: screenName,
              timestamp: new Date().toISOString()
            }
          })
        });
      } catch (e) {
        console.log('[AppLens] trackScreen error:', e);
      }
    }, [sessionId, finalConfig]);
    
    // Track element to API
    const trackElement = useCallback(async (elementId, elementType, elementLabel) => {
      if (!finalConfig.autoTrack) return;
      try {
        await fetch(`${finalConfig.apiUrl}/api/element`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId,
            appId: finalConfig.appId,
            element: {
              id: elementId,
              type: elementType,
              label: elementLabel
            }
          })
        });
      } catch (e) {
        console.log('[AppLens] trackElement error:', e);
      }
    }, [sessionId, finalConfig]);
    
    // Capture screenshot
    const captureScreenshot = useCallback(async (screenName) => {
      if (!finalConfig.captureScreenshots) return null;
      // Screenshot capture handled by the view-shot library in the app
      return null;
    }, []);
    
    // Test Mode: Command execution
    const executeCommand = useCallback(async (command) => {
      console.log('[AppLens Test Mode] Executing:', command);
      const { action, params, id } = command;
      
      let result = { success: true, action, id };
      
      try {
        switch (action) {
          case 'navigate':
            // App handles navigation - this is a signal
            result.screen = params.screen;
            break;
            
          case 'tap':
            // App should handle tap - we just log it
            result.element = params.elementId;
            break;
            
          case 'input':
            result.field = params.field;
            result.value = params.value;
            break;
            
          case 'getState':
            // Return current app state
            result.state = {
              currentScreen: 'unknown', // App should provide this
              elements: [], // App should provide this
            };
            break;
            
          case 'screenshot':
            result.screenshot = 'captured'; // App should provide actual screenshot
            break;
            
          case 'complete':
            // Signal that testing is done - show "All Done" on app
            result.message = 'Testing complete!';
            break;
            
          default:
            result.success = false;
            result.error = `Unknown command: ${action}`;
        }
      } catch (e) {
        result.success = false;
        result.error = e.message;
      }
      
      // Report back to API
      try {
        await fetch(`${finalConfig.apiUrl}/api/test/commandResult`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId,
            appId: finalConfig.appId,
            result
          })
        });
      } catch (e) {
        console.log('[AppLens] Command result error:', e);
      }
      
      return result;
    }, [finalConfig]);
    
    // Test Mode: Poll for commands
    useEffect(() => {
      if (!finalConfig.testMode) return;
      
      const pollCommands = async () => {
        try {
          const res = await fetch(`${finalConfig.apiUrl}/api/test/commands?sessionId=${sessionId}`);
          const data = await res.json();
          
          if (data.commands && data.commands.length > 0) {
            for (const cmd of data.commands) {
              await executeCommand(cmd);
            }
          }
        } catch (e) {
          console.log('[AppLens] Poll error:', e);
        }
      };
      
      // Poll every second
      const interval = setInterval(pollCommands, 1000);
      pollCommands();
      
      return () => clearInterval(interval);
    }, [finalConfig.testMode, sessionId, executeCommand]);
    
    // Test Mode: Show completion message
    const showCompletionMessage = useCallback((message = 'Testing complete! 🎉') => {
      Alert.alert('AppLens', message, [{ text: 'OK' }]);
    }, []);
    
    const value = {
      config: finalConfig,
      sessionId,
      trackScreen,
      trackElement,
      captureScreenshot,
      isTestMode: finalConfig.testMode,
      showCompletionMessage,
    };
    
    return (
      <AppLensContext.Provider value={value}>
        {children}
      </AppLensContext.Provider>
    );
  };
};

// Hook to use AppLens
export const useAppLens = () => {
  // This would use React Context in real implementation
  return {
    trackScreen: (name) => console.log('[AppLens] Track:', name),
    trackElement: (id, type, label) => console.log('[AppLens] Element:', id, type, label),
    isTestMode: false,
  };
};

// Trackable components (for automatic element tracking)
export const TrackableView = ({ id, label, children, style, ...props }) => {
  const { trackElement } = useAppLens() || {};
  
  return (
    <View id={id} label={label} onLayout={() => trackElement?.(id, 'view', label)} style={style} {...props}>
      {children}
    </View>
  );
};

export const TrackableTouchable = ({ id, label, onPress, children, style, ...props }) => {
  const { trackElement } = useAppLens() || {};
  
  const handlePress = (e) => {
    trackElement?.(id, 'button', label);
    onPress?.(e);
  };
  
  return (
    <TouchableOpacity id={id} label={label} onPress={handlePress} style={style} {...props}>
      {children}
    </TouchableOpacity>
  );
};

export const TrackableInput = ({ id, label, onChangeText, ...props }) => {
  const { trackElement } = useAppLens() || {};
  
  return (
    <TextInput 
      id={id} 
      label={label}
      onChangeText={(text) => {
        trackElement?.(id, 'input', label);
        onChangeText?.(text);
      }} 
      {...props} 
    />
  );
};

// Export default
export default { createAppLensProvider, useAppLens, TrackableView, TrackableTouchable, TrackableInput };
