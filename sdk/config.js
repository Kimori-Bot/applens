// AppLens SDK Configuration
// 
// For App Developers:
// Copy this file to your React Native app and configure your AppLens server URL
//
// Options:
// 1. Hardcode the URL (simple but not recommended for production)
// 2. Use environment variable
// 3. Use a config file that can be changed without code changes

// Default AppLens server configuration
// In production, this should point to your deployed AppLens instance
const DEFAULT_APPLENS_CONFIG = {
  // Your AppLens server URL - CHANGE THIS to your server
  apiUrl: process.env.APPLENS_API_URL || 'http://100.79.223.42:3002',
  
  // Your app's unique identifier
  appId: process.env.APPLENS_APP_ID || 'your-app-id',
  
  // Test mode: enables AI control
  // Set to true when you want AI to control the app
  testMode: process.env.APPLENS_TEST_MODE === 'true' || false,
  
  // Auto-track screens and elements
  autoTrack: true,
  
  // Capture screenshots (requires react-native-view-shot)
  captureScreenshots: true,
  
  // Poll interval for AI commands (in milliseconds)
  commandPollInterval: 1500,
};

// Export for use in your app
export const APP_LENS_CONFIG = DEFAULT_APPLENS_CONFIG;

export default APP_LENS_CONFIG;