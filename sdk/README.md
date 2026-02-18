# AppLens SDK for React Native

AI-powered app testing SDK with screenshot capture, UI automation, and video recording support.

## Features

- **Screenshot Capture** - Automatically capture screenshots on screen navigation using `react-native-view-shot`
- **UI Automation** - AI can trigger taps and inputs via component registry
- **Video Recording** - Record test sessions (stretch goal)
- **Command Polling** - AI agent can send commands (`tap`, `input`, `capture`, `complete`, `wait`)

## Installation

```bash
npm install applens-sdk react-native-view-shot react-native-fs
```

## Quick Start

### 1. Wrap Your App

```tsx
import { AppLensProvider } from 'applens-sdk';

function App() {
  return (
    <AppLensProvider 
      apiUrl="http://your-server:3002" 
      appId="your-app" 
      testMode={true}
      enableScreenshots={true}
    >
      <YourApp />
    </AppLensProvider>
  );
}
```

### 2. Track Elements

The SDK automatically tracks elements when they are tapped. Use `testID` for identification:

```tsx
import { withAppLens, AppLensButton, AppLensInput } from 'applens-sdk';

// Using wrapped components (recommended)
<AppLensButton testID="add-task-btn" onPress={handleAddTask}>
  Add Task
</AppLensButton>

<AppLensInput 
  testID="task-input" 
  onChangeText={setTaskText} 
  placeholder="Enter task..." 
/>

// Or wrap existing components
const MyButton = withAppLens(TouchableOpacity, 'my-button');
```

### 3. Capture Screenshots

Screenshots are automatically captured when using `AppLensScreen`:

```tsx
import { AppLensScreen } from 'applens-sdk';

function HomeScreen() {
  return (
    <AppLensScreen name="Home">
      <YourScreenContent />
    </AppLensScreen>
  );
}
```

Or manually:

```tsx
import { captureScreen } from 'applens-sdk';
import { useAppLens } from 'applens-sdk';

function MyScreen() {
  const config = useAppLens();
  
  useEffect(() => {
    captureScreen('MyScreen', config);
  }, []);
  
  return <View>...</View>;
}
```

## AI Commands

When `testMode={true}`, the SDK polls for commands from the AI agent:

| Command | Params | Description |
|---------|--------|-------------|
| `tap` | `{ elementId: string }` | Trigger element's onPress |
| `input` | `{ elementId: string, value: string }` | Set input value |
| `capture` | `{ screen?: string }` | Capture screenshot |
| `wait` | `{ duration: number }` | Wait in ms |
| `complete` | - | End testing session |

## API Reference

### Provider

```tsx
<AppLensProvider
  apiUrl="http://localhost:3002"   // AppLens server URL
  appId="my-app"                   // Your app identifier
  testMode={false}                 // Enable AI command execution
  enableScreenshots={true}        // Enable screenshot capture
>
```

### Hooks

```tsx
const config = useAppLens();       // Get SDK config
```

### Components

- `AppLensProvider` - Root provider component
- `AppLensScreen` - Screen wrapper with auto-screenshot
- `AppLensButton` - Button with automation support
- `AppLensInput` - TextInput with automation support
- `withAppLens(Component, testID)` - HOC for custom components

### Functions

- `trackScreen(name, config)` - Track screen visit
- `trackElement(id, type, label, config)` - Track element interaction
- `captureScreen(name, config)` - Capture screenshot
- `registerElement(id, handler)` - Register element for AI
- `unregisterElement(id)` - Unregister element
- `getElementHandler(id)` - Get element handler

## Integration with CleanTasks

See `/root/.openclaw/workspace/CleanTasks/App.tsx` for a complete example of how CleanTasks uses the AppLens SDK:

1. Basic tracking functions (`trackScreen`, `trackElement`)
2. Command execution (`executeCommand`) 
3. Polling for AI commands

## Server Requirements

The AppLens server exposes these endpoints:

- `POST /api/screen` - Track screen visit
- `POST /api/element` - Track element interaction
- `POST /api/screenshot` - Store screenshot
- `GET /api/test/commands?sessionId=...` - Get pending AI commands
- `POST /api/test/commandResult` - Report command result

## License

MIT
