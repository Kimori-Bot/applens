/**
 * AppLens SDK - Embed this in your native app to enable AI control
 * 
 * Installation:
 * 1. Copy this file into your React Native / Expo app
 * 2. Import and initialize in your app's root
 * 3. The app will connect to AppLens server and receive commands
 */

import { useEffect, useRef, useState } from 'react';

const DEFAULT_SERVER_URL = 'ws://100.79.223.42:3003';

export function useAppLens({ 
  appToken, 
  serverUrl = DEFAULT_SERVER_URL,
  enabled = true 
} = {}) {
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState(null);
  const wsRef = useRef(null);
  const commandQueueRef = useRef([]);
  
  useEffect(() => {
    if (!enabled || !appToken) return;
    
    const connect = () => {
      try {
        const ws = new WebSocket(`${serverUrl}?token=${appToken}`);
        
        ws.onopen = () => {
          console.log('[AppLens] Connected to server');
          setConnected(true);
          setError(null);
          
          // Send ready signal
          ws.send(JSON.stringify({
            type: 'REGISTER',
            payload: { appToken, platform: 'expo' }
          }));
        };
        
        ws.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data);
            handleCommand(message);
          } catch (e) {
            console.error('[AppLens] Failed to parse message:', e);
          }
        };
        
        ws.onclose = () => {
          console.log('[AppLens] Disconnected');
          setConnected(false);
          // Reconnect after 3 seconds
          setTimeout(connect, 3000);
        };
        
        ws.onerror = (err) => {
          console.error('[AppLens] Error:', err);
          setError(err.message);
        };
        
        wsRef.current = ws;
      } catch (err) {
        setError(err.message);
      }
    };
    
    connect();
    
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [appToken, serverUrl, enabled]);
  
  // Handle incoming commands from AppLens
  const handleCommand = async (message) => {
    const { type, payload } = message;
    
    switch (type) {
      case 'TAP':
        // Execute tap - would use React Native's Pressable or gesture handler
        console.log('[AppLens] TAP:', payload);
        // Expose via window for testing
        if (typeof window !== 'undefined') {
          window.applensLastCommand = { type: 'TAP', ...payload };
        }
        break;
        
      case 'INPUT':
        console.log('[AppLens] INPUT:', payload);
        if (typeof window !== 'undefined') {
          window.applensLastCommand = { type: 'INPUT', ...payload };
        }
        break;
        
      case 'SWIPE':
        console.log('[AppLens] SWIPE:', payload);
        if (typeof window !== 'undefined') {
          window.applensLastCommand = { type: 'SWIPE', ...payload };
        }
        break;
        
      case 'SCREENSHOT':
        // Would capture and send back
        console.log('[AppLens] SCREENSHOT requested');
        break;
        
      case 'GET_ELEMENTS':
        // Would dump UI hierarchy and send back
        console.log('[AppLens] GET_ELEMENTS requested');
        break;
        
      default:
        console.log('[AppLens] Unknown command:', type);
    }
    
    // Acknowledge command
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'COMMAND_ACK',
        payload: { command: type, success: true }
      }));
    }
  };
  
  return { connected, error };
}

// Component wrapper for easy integration
export function AppLensProvider({ children, appToken, serverUrl }) {
  const { connected, error } = useAppLens({ appToken, serverUrl });
  
  return (
    <>
      {children}
      {/* Debug indicator - remove in production */}
      {process.env.NODE_ENV === 'development' && (
        <div style={{
          position: 'fixed',
          bottom: 10,
          right: 10,
          background: connected ? '#22c55e' : '#ef4444',
          color: 'white',
          padding: '4px 8px',
          borderRadius: 4,
          fontSize: 12,
          zIndex: 9999
        }}>
          AppLens: {connected ? 'Connected' : 'Disconnected'}
        </div>
      )}
    </>
  );
}

export default { useAppLens, AppLensProvider };
