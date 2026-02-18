# AppLens SDK for React Native

AI-powered app review SDK with automatic screenshot capture and user interaction tracking.

## Installation

```bash
npm install @applens/react-native
# or
yarn add @applens/react-native
```

**Peer Dependencies:**
- `react-native` (>= 0.60.0)
- `react-native-view-shot` (optional, for screenshot capture)

```bash
npm install react-native-view-shot
```

## Quick Start

### 1. Wrap your app with AppLensProvider

```jsx
import { AppLensProvider } from '@applens/react-native';

function App() {
  return (
    <AppLensProvider
      config={{
        apiUrl: 'http://localhost:3002',
        appId: 'your-app-id',
        organizationId: 'your-org-id',
        autoTrack: true,
        autoCaptureScreenshots: true,
      }}
    >
      <YourApp />
    </AppLensProvider>
  );
}
```

### 2. Track screens and elements

```jsx
import { useAppLens } from '@applens/react-native';

function HomeScreen() {
  const { trackScreen, trackElement } = useAppLens();

  useEffect(() => {
    // Track screen view
    trackScreen('HomeScreen');
  }, []);

  return (
    <View>
      <TouchableOpacity 
        onPress={() => {
          trackElement('login-btn', 'button', 'Login');
          // your login logic
        }}
      >
        <Text>Login</Text>
      </TouchableOpacity>
    </View>
  );
}
```

### 3. Capture screenshots manually

```jsx
import { useAppLens } from '@applens/react-native';

function SettingsScreen() {
  const { takeScreenshot, mainViewRef } = useAppLens();

  return (
    <View ref={mainViewRef}>
      <Button title="Capture" onPress={takeScreenshot} />
    </View>
  );
}
```

## API Reference

### `<AppLensProvider>`

Wraps your app to enable AppLens tracking.

**Props:**

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `config` | `Object` | `{}` | Configuration object |
| `children` | `ReactNode` | - | Your app components |

**Config Options:**

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `apiUrl` | `string` | `'http://localhost:3002'` | AppLens API server URL |
| `appId` | `string` | `null` | Your app ID |
| `organizationId` | `string` | `null` | Your organization ID |
| `sessionId` | `string` | `auto-generated` | Custom session ID |
| `autoTrack` | `boolean` | `true` | Auto-start session on mount |
| `autoCaptureScreenshots` | `boolean` | `true` | Auto-capture screenshots |
| `screenshotInterval` | `number` | `5000` | Screenshot interval in ms |
| `debug` | `boolean` | `false` | Enable debug logging |

---

### `useAppLens()`

Hook to access AppLens functionality.

**Returns:**

| Property | Type | Description |
|----------|------|-------------|
| `isSessionActive` | `boolean` | Whether session is active |
| `screens` | `Array` | Tracked screens |
| `elements` | `Array` | Tracked UI elements |
| `screenshots` | `Array` | Captured screenshots |
| `currentScreen` | `string` | Current screen name |
| `sessionStartTime` | `number` | Session start timestamp |
| `trackScreen` | `Function` | Track a screen view |
| `trackElement` | `Function` | Track a UI element |
| `takeScreenshot` | `Function` | Capture a screenshot |
| `startSession` | `Function` | Start a new session |
| `stopSession` | `Function` | Stop the current session |
| `clearData` | `Function` | Clear all tracked data |
| `mainViewRef` | `ReactRef` | Ref for screenshot capture |

---

### `trackScreen(name)`

Track a screen/view.

**Parameters:**

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | `string` | Yes | Screen name |

**Returns:** `Object` - Screen data with id, name, timestamp

**Example:**
```js
trackScreen('ProductListScreen');
```

---

### `trackElement(id, type, label)`

Track a UI element interaction.

**Parameters:**

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | `string` | Yes | Element ID |
| `type` | `string` | Yes | Element type (`button`, `input`, `text`, etc.) |
| `label` | `string` | No | Element label/description |

**Returns:** `Object` - Element data with id, type, label, timestamp

**Example:**
```js
trackElement('submit-form', 'button', 'Submit Order');
trackElement('email-input', 'input', 'Email Address');
```

---

## Additional Components

### `<ScreenCapture>`

Wrapper component for automatic screenshot capture.

```jsx
import { ScreenCapture, useAppLens } from '@applens/react-native';

function MyScreen() {
  return (
    <ScreenCapture options={{ format: 'jpg', quality: 0.8 }}>
      <View>
        <Text>Content to capture</Text>
      </View>
    </ScreenCapture>
  );
}
```

### `<CaptureView>`

A View that can be captured for screenshots.

### `<TrackableView>`, `<TrackableText>`, `<TrackableTouchable>`

Components that auto-track taps.

```jsx
import { TrackableTouchable } from '@applens/react-native';

<TrackableTouchable id="buy-btn" label="Buy Now" type="button">
  <Text>Buy Now</Text>
</TrackableTouchable>
```

---

## License

MIT
