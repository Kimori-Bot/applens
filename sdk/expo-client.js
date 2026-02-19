/**
 * AppLens SDK - Simplified HTTP version for Expo/React Native
 * Polls for commands and reports screen state via REST API
 */

const APPLENS_CONFIG = {
  apiUrl: process.env.APPLENS_API_URL || 'http://100.79.223.42:3000',
  appToken: 'apl_1771442447210_sd8gycs4gid',
  appName: 'CleanTasks',
  platform: 'ios',
  bundleId: 'com.kimori.cleantasks',
  testMode: true
};

let _deviceId = null;
let _pollInterval = null;
let _currentScreen = 'Home';
let _elements = [];

// Register this device
const registerDevice = async () => {
  if (!APPLENS_CONFIG.testMode) return;
  try {
    const res = await fetch(`${APPLENS_CONFIG.apiUrl}/api/devices`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'register',
        deviceId: _deviceId || `device_${Date.now()}`,
        data: {
          appToken: APPLENS_CONFIG.appToken,
          appName: APPLENS_CONFIG.appName,
          platform: APPLENS_CONFIG.platform,
          bundleId: APPLENS_CONFIG.bundleId,
          screen: _currentScreen,
          elements: _elements.length
        }
      })
    });
    const data = await res.json();
    console.log('[AppLens] Registered:', data);
    return data;
  } catch (e) {
    console.log('[AppLens] Register error:', e.message);
  }
};

// Report current screen state
const reportScreen = async (screenName, elements = []) => {
  if (!APPLENS_CONFIG.testMode) return;
  _currentScreen = screenName;
  _elements = elements;
  
  try {
    await fetch(`${APPLENS_CONFIG.apiUrl}/api/devices`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'screen_update',
        deviceId: _deviceId,
        data: { screenName, elements }
      })
    });
  } catch (e) {
    console.log('[AppLens] Screen report error:', e.message);
  }
};

// Poll for commands from AI
const pollCommands = async () => {
  if (!APPLENS_CONFIG.testMode || !_deviceId) return;
  
  try {
    const res = await fetch(
      `${APPLENS_CONFIG.apiUrl}/api/commands?device=${_deviceId}`
    );
    const data = await res.json();
    
    if (data.command) {
      console.log('[AppLens] Received command:', data.command);
      // Execute the command - in a real app, this would trigger actual UI interactions
      // For now, we log it and report back
      await fetch(`${APPLENS_CONFIG.apiUrl}/api/devices`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'command_result',
          deviceId: _deviceId,
          data: { command: data.command, executed: true }
        })
      });
    }
  } catch (e) {
    // Silent fail on polling
  }
};

// Start the SDK
const startAppLens = async () => {
  if (!APPLENS_CONFIG.testMode) return;
  
  _deviceId = `device_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  
  await registerDevice();
  
  // Poll for commands every 2 seconds
  _pollInterval = setInterval(pollCommands, 2000);
  
  console.log('[AppLens] Started with device ID:', _deviceId);
};

// Stop the SDK
const stopAppLens = () => {
  if (_pollInterval) clearInterval(_pollInterval);
};

// Export for use in React Native
if (typeof module !== 'undefined') {
  module.exports = { startAppLens, reportScreen, stopAppLens, APPLENS_CONFIG };
}
