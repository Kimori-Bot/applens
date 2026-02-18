# AppLens 🔬

AI-Powered Mobile App Review SDK

## What is AppLens?

AppLens is an SDK that makes your mobile app observable - so AI agents can navigate it and humans can review screenshots for bugs and UX issues.

## Quick Start

```bash
# Add SDK to your app
npm install @applens/react-native
```

```tsx
import { AppLensProvider } from '@applens/react-native';

function App() {
  return (
    <AppLensProvider apiUrl="http://YOUR_SERVER:3002">
      <YourApp />
    </AppLensProvider>
  );
}
```

Track screens and elements:
```tsx
import { useAppLens } from '@applens/react-native';

function HomeScreen() {
  const { trackScreen, trackElement } = useAppLens();
  
  useEffect(() => {
    trackScreen('Home');
  }, []);
  
  return (
    <TouchableOpacity onPress={() => trackElement('submit-btn', 'button', 'Submit')}>
      <Text>Submit</Text>
    </TouchableOpacity>
  );
}
```

## Components

- **SDK** (`/sdk`) - React Native SDK
- **Server** (`/server`) - Node.js API
- **Dashboard** (`/dashboard.html`) - Web viewer

## Running

```bash
# Start API server
cd server && npm install && npm start

# Open dashboard
# Navigate to dashboard.html or serve it
```

## Week 2 Features (In Progress)

- Real screenshot capture
- Human review with issue marking
- Export reports
- Better session management

## Pricing

- Free: 10 reviews/month
- Pro: $79/month
- Enterprise: Custom

See FINANCE_PLAN.md for details.
