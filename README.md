# AppLens Media Capture System

Enterprise-grade media capture system for application navigation recording. Captures screenshots and videos of app navigation sessions with modular, event-driven architecture.

## Features

- **Screenshot Capture** - Automatic screen capture on navigation events
- **Video Recording** - Full session recording with frame capture
- **Dual Storage** - Supabase Storage or local filesystem
- **Event-Driven** - EventEmitter-based architecture for capture events
- **TypeScript** - Full type safety throughout
- **Scalable** - Handles concurrent sessions

## Architecture

```
/workspace/applens/
├── media/
│   ├── types.ts              # Type definitions
│   ├── index.ts              # Main exports
│   ├── media-service.ts      # Main service coordinator
│   ├── events/
│   │   └── media-events.ts  # EventEmitter for capture events
│   ├── screenshot/
│   │   ├── screenshot-capture.ts
│   │   └── screenshot-config.json
│   ├── video/
│   │   ├── video-recorder.ts
│   │   └── video-config.json
│   ├── storage/
│   │   ├── media-storage.ts    # Storage abstraction
│   │   └── media-database.ts   # Database operations
│   └── processing/
│       └── media-processor.ts   # Image/video processing
├── server/
│   ├── index.ts              # Express server
│   ├── media-routes.ts      # TypeScript API routes
│   └── media-routes.js      # JavaScript API routes
└── config/
    ├── storage-config.json
    └── database-schema.sql
```

## Installation

```bash
cd /workspace/applens
npm install
```

## Configuration

### Storage Configuration (`config/storage-config.json`)

```json
{
  "provider": "filesystem",
  "filesystem": {
    "basePath": "/workspace/applens/media/storage",
    "baseUrl": "/media/storage"
  },
  "supabase": {
    "bucket": "media",
    "region": "us-east-1"
  }
}
```

### Screenshot Configuration (`media/screenshot/screenshot-config.json`)

```json
{
  "format": "png",
  "quality": 90,
  "maxWidth": 1920,
  "maxHeight": 1080,
  "captureOnNavigation": true,
  "compression": {
    "enabled": true,
    "targetSizeKB": 500
  }
}
```

### Video Configuration (`media/video/video-config.json`)

```json
{
  "format": "webm",
  "fps": 30,
  "videoBitrate": 2000000,
  "audioBitrate": 128000,
  "maxDurationSeconds": 300,
  "recordOnSessionStart": false,
  "codec": "vp9"
}
```

## Database Setup

Run the SQL schema in `config/database-schema.sql` to create required tables:

```sql
-- Main tables created:
-- - media (screenshots and videos)
-- - sessions (navigation sessions)
-- - screens (app screens/pages)
-- - apps (app definitions)
```

## Usage

### Initialize the Media Service

```typescript
import { initializeMediaService, getMediaService } from './media';

// With custom configuration
const mediaService = initializeMediaService({
  storage: {
    provider: 'filesystem',
    filesystem: {
      basePath: '/workspace/applens/media/storage',
      baseUrl: '/media/storage'
    }
  },
  screenshot: {
    format: 'png',
    quality: 90,
    maxWidth: 1920,
    maxHeight: 1080,
    captureOnNavigation: true,
    compression: { enabled: true, targetSizeKB: 500 }
  },
  video: {
    format: 'webm',
    fps: 30,
    videoBitrate: 2000000,
    maxDurationSeconds: 300,
    recordOnSessionStart: false,
    codec: 'vp9'
  },
  supabase: {
    url: process.env.SUPABASE_URL,
    key: process.env.SUPABASE_KEY
  }
});
```

### Capture Screenshots

```typescript
const screenshot = await mediaService.captureScreenshot({
  sessionId: 'session-123',
  appId: 'my-app',
  screenId: 'home-screen',
  format: 'png',
  quality: 90
});
```

### Record Videos

```typescript
// Start recording
const recordingId = await mediaService.startRecording({
  sessionId: 'session-123',
  appId: 'my-app',
  fps: 30
});

// Capture frames during navigation
await mediaService.captureFrame(recordingId, frameBuffer);

// Stop and finalize
const video = await mediaService.stopRecording(recordingId);
```

### Listen to Events

```typescript
import { mediaEvents } from './media';

mediaEvents.on('screenshot:captured', (data) => {
  console.log('Screenshot captured:', data.mediaId);
});

mediaEvents.on('video:recording:stopped', (data) => {
  console.log('Video saved:', data.mediaId, 'Duration:', data.duration);
});
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/media/screenshots/:sessionId` | List screenshots for session |
| GET | `/api/media/screenshots/:id/image` | Get screenshot image |
| GET | `/api/media/videos/:sessionId` | List videos for session |
| GET | `/api/media/videos/:id/video` | Stream video file |
| GET | `/api/media/:sessionId` | List all media for session |
| GET | `/api/media/:id/info` | Get media info |
| DELETE | `/api/media/:id` | Delete media |

## Environment Variables

```bash
# Supabase (optional)
SUPABASE_URL=your-supabase-url
SUPABASE_KEY=your-supabase-key

# Server
PORT=3000
```

## Type Definitions

### Media Types

```typescript
type MediaType = 'screenshot' | 'video';

interface Screenshot {
  id: number;
  sessionId: string;
  appId: string;
  type: 'screenshot';
  filename: string;
  url?: string;
  screenId?: string;
  width?: number;
  height?: number;
  format: 'png' | 'jpeg' | 'webp';
  createdAt: Date;
}

interface Video {
  id: number;
  sessionId: string;
  appId: string;
  type: 'video';
  filename: string;
  url?: string;
  durationSeconds: number;
  width?: number;
  height?: number;
  format: 'mp4' | 'webm';
  createdAt: Date;
}
```

## Storage Providers

### Filesystem Storage

Stores media files locally with the following structure:
```
/workspace/applens/media/storage/
├── {appId}/
│   ├── {sessionId}/
│   │   ├── screenshots/
│   │   │   └── screenshot_*.png
│   │   └── videos/
│   │       └── video_*.webm
```

### Supabase Storage

Uploads media to Supabase Storage bucket with path:
```
{appId}/{sessionId}/{type}s/{filename}
```

Returns CDN-ready public URLs.

## Events

| Event | Payload |
|-------|---------|
| `screenshot:captured` | `{ sessionId, appId, mediaType, mediaId, timestamp }` |
| `video:recording:started` | `{ sessionId, appId, mediaType, mediaId, status, timestamp }` |
| `video:recording:stopped` | `{ sessionId, appId, mediaType, mediaId, status, duration, timestamp }` |
| `video:recording:error` | `{ sessionId, appId, mediaType, mediaId, status, error, timestamp }` |
| `media:stored` | `{ mediaId, url }` |
| `media:error` | `{ error, context }` |

## Development

```bash
# Build TypeScript
npm run build

# Run in development
npm run dev

# Start server
npm start
```

## License

Enterprise - All rights reserved
