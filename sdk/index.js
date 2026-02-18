/**
 * AppLens SDK
 * 
 * Install: npm install applens-sdk
 * 
 * Usage:
 *   import { AppLensProvider, useAppLens } from 'applens-sdk';
 *   
 *   // Wrap your app
 *   <AppLensProvider apiUrl="http://your-server:3002" appId="your-app" testMode={true}>
 *     <YourApp />
 *   </AppLensProvider>
 *   
 *   // In components, track elements
 *   import { trackScreen, trackElement } from 'applens-sdk';
 *   
 *   <TouchableOpacity onPress={...} testID="my-button">
 *     Click me
 *   </TouchableOpacity>
 */

import React, { createContext, useContext, useEffect } from 'react';

// Context for SDK state
const AppLensContext = createContext(null);

// Provider component
export const AppLensProvider = ({ children, apiUrl, appId, testMode = false }) => {
  const config = {
    apiUrl: apiUrl || 'http://localhost:3002',
    appId: appId || 'unknown',
    testMode,
    sessionId: appId + '_' + Date.now()
  };

  useEffect(() => {
    if (testMode) {
      startCommandPolling(config);
    }
  }, [testMode]);

  return (
    <AppLensContext.Provider value={config}>
      {children}
    </AppLensContext.Provider>
  );
};

// Hook to get config
export const useAppLens = () => useContext(AppLensContext);

// Track screen visit
export const trackScreen = (screenName, config = {}) => {
  if (!config.apiUrl) return;
  
  fetch(`${config.apiUrl}/api/screen`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sessionId: config.sessionId,
      appId: config.appId,
      screen: { id: screenName.toLowerCase().replace(/\s+/g, '-'), name: screenName }
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
      element: { id: elementId, type: elementType, label: elementLabel }
    })
  }).catch(e => console.log('[AppLens] trackElement:', e.message));
};

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
  
  switch (action) {
    case 'complete':
      result.message = 'Testing complete';
      break;
    default:
      result.success = false;
      result.error = `Unknown command: ${action}`;
  }
  
  // Report result
  try {
    await fetch(`${config.apiUrl}/api/test/commandResult`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: config.sessionId, appId: config.appId, result })
    });
  } catch (e) { console.log('[AppLens] Result error:', e.message); }
};

export default { AppLensProvider, useAppLens, trackScreen, trackElement };
