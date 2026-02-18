# AppLens 🔬

AI-Powered Mobile App Review SDK

## What is AppLens?

AppLens is an SDK that makes your mobile app observable - so AI agents can navigate it and humans can review screenshots for bugs and UX issues.

## Quick Start

```bash
# Add SDK to your app
npm install @applens/react-native

# Install peer dependency for screenshots (optional)
npm install react-native-view-shot
```

```tsx
import { AppLensProvider, useAppLens } from '@applens/react-native';

function App() {
  return (
    <AppLensProvider
      config={{
        apiUrl: 'http://YOUR_SERVER:3002',
        appId: 'your-app-id',
        autoTrack: true,
        autoCaptureScreenshots: true,
      }}
    >
      <YourApp />
    </AppLensProvider>
  );
}
```

### Track Screens

```tsx
function HomeScreen() {
  const { trackScreen } = useAppLens();
  
  useEffect(() => {
    trackScreen('Home');
  }, []);
  
  return <YourHomeContent />;
}
```

### Capture Screenshots

```tsx
import { ScreenCapture, useAppLens } from '@applens/react-native';

function MyScreen() {
  const { takeScreenshot } = useAppLens();
  
  const handleCapture = async () => {
    const screenshot = await takeScreenshot();
    console.log('Captured:', screenshot?.id);
  };
  
  return (
    <ScreenCapture>
      <YourContent />
    </ScreenCapture>
  );
}
```

### Track Elements

```tsx
import { TrackableTouchable, TrackableText } from '@applens/react-native';

// Auto-tracks taps!
<TrackableTouchable id="submit-btn" label="Submit Form">
  <Text>Submit</Text>
</TrackableTouchable>

// Or manual tracking
function MyComponent() {
  const { trackElement } = useAppLens();
  
  return (
    <TouchableOpacity onPress={() => trackElement('btn-1', 'button', 'Click me')}>
      <Text>Click me</Text>
    </TouchableOpacity>
  );
}
```

## Components

- **SDK** (`/sdk`) - React Native SDK
- **Server** (`/server`) - Node.js API
- **Dashboard** (`dashboard.html`) - Web viewer

## Running

```bash
# Start API server
cd server && npm start

# Open dashboard - navigate to dashboard.html in browser
# Or serve with: npx serve .
```

The dashboard:
- Auto-refreshes every 3 seconds
- Shows screenshots with click-to-mark issues
- Export to JSON or Markdown reports
