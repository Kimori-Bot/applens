# AppLens SDK - Technical Specification

## Overview
AI-powered SDK that enables autonomous app navigation and review. AppLens allows developers to integrate AI-powered app review capabilities into their React Native/Expo apps.

## Architecture
- AI Agent → AppLens Cloud API → AppLens SDK (in target app)
- SDK reports component tree, executes navigation commands

## Implementation

### 1. React Native SDK (@applens/react-native)

**Location:** `/workspace/applens/sdk/`

**Components:**
- `AppLensProvider` - Main context provider component
- `useAppLens()` - Hook for accessing AppLens functionality

**Functions:**
- `trackScreen(name)` - Track a screen/view
  - Parameters: `name` (string) - Screen name
  - Returns: Screen data object with id, name, timestamp
  
- `trackElement(id, type, label)` - Track a UI element
  - Parameters:
    - `id` (string) - Unique element identifier
    - `type` (string) - Element type (button, input, text, view, etc.)
    - `label` (string) - Element label/description
  - Returns: Element data object
  
- `getComponentTree()` - Get the current component tree
  - Returns: Hierarchical tree structure of tracked screens and elements

**Trackable Components:**
- `TrackableView` - View wrapper that auto-tracks taps
- `TrackableText` - Text component that auto-tracks taps
- `TrackableTouchable` - TouchableOpacity with auto-tracking

**Example Usage:**
```javascript
import { AppLensProvider, useAppLens } from '@applens/react-native';

function App() {
  return (
    <AppLensProvider config={{ appId: 'my-app', debug: true }}>
      <TipCalculator />
    </AppLensProvider>
  );
}

function TipCalculator() {
  const { trackScreen, trackElement, getComponentTree } = useAppLens();
  
  useEffect(() => {
    trackScreen('Home');
  }, []);
  
  const handleTipPress = () => {
    trackElement('tip-15', 'button', '15% tip option');
  };
  
  return (
    <View>
      <TouchableOpacity onPress={handleTipPress}>
        <Text>15%</Text>
      </TouchableOpacity>
    </View>
  );
}
```

### 2. Simple Dashboard (React web app)

**Location:** `/workspace/applens/dashboard/`

**Features:**
- View captured screens
- View element trees (hierarchical component structure)
- Start/stop review sessions
- Connect to Supabase for persistent storage
- Debug view for raw memory data

**API Endpoints:**
- `GET /api/health` - Health check
- `POST /api/screen` - Store screen event
- `POST /api/element` - Store element event
- `POST /api/session/start` - Start review session
- `POST /api/session/:id/end` - End session
- `GET /api/session/:id` - Get session data
- `GET /api/session/:id/tree` - Get component tree
- `GET /api/app/:appId/sessions` - List sessions
- `POST /api/issue` - Report an issue

### 3. Supabase Schema

**Location:** `/workspace/applens/supabase/schema.sql`

**Tables:**
- `organizations` - Organization accounts
- `apps` - Registered applications
- `review_sessions` - Review session records
- `screenshots` - Captured screens (or screen names)
- `issues` - Found issues during review
- `tracked_elements` - Tracked UI elements

### 4. Demo: TipCalculator App

**Location:** `/workspace/TipCalculator/`

**Integration:**
- Wrap app with `AppLensProvider`
- Track main screens: Home, Paywall
- Track interactive elements: bill input, tip buttons, split controls, etc.

---

## Week 1 Goals (Complete)
1. ✅ SDK with basic tracking (`trackScreen`, `trackElement`, `getComponentTree`)
2. ✅ Simple dashboard (React web app with session management)
3. ✅ Supabase integration (schema provided)
4. ✅ Demo app with SDK integrated
5. ✅ Testable by Kevin

## Running the Demo

1. **Start the API server:**
   ```bash
   cd /workspace/applens/server
   npm install express cors
   node index.js
   ```

2. **Start the dashboard:**
   ```bash
   cd /workspace/applens/dashboard
   npm install
   npm start
   ```

3. **Run the TipCalculator with SDK:**
   ```bash
   cd /workspace/TipCalculator
   npm start
   ```

4. **Set up Supabase:**
   - Create a new Supabase project
   - Run the SQL from `supabase/schema.sql`
   - Add your Supabase URL and key to the dashboard
