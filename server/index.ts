/**
 * AppLens Server
 * 
 * Main Express server with media API routes
 */

import express from 'express';
import cors from 'cors';
import * as path from 'path';
import {
  initializeMediaService,
  MediaService,
  createMediaRoutes,
  MediaDatabase,
  StorageFactory
} from '../media';
import * as fs from 'fs';

// Load configuration
function loadConfig() {
  const configPath = path.join(__dirname, '../config');
  
  let screenshotConfig = {};
  let videoConfig = {};
  let storageConfig = {};
  
  try {
    screenshotConfig = JSON.parse(
      fs.readFileSync(path.join(configPath, '../media/screenshot/screenshot-config.json'), 'utf-8')
    );
  } catch (e) {
    console.warn('Screenshot config not found, using defaults');
  }
  
  try {
    videoConfig = JSON.parse(
      fs.readFileSync(path.join(configPath, '../media/video/video-config.json'), 'utf-8')
    );
  } catch (e) {
    console.warn('Video config not found, using defaults');
  }
  
  try {
    storageConfig = JSON.parse(
      fs.readFileSync(path.join(configPath, 'storage-config.json'), 'utf-8')
    );
  } catch (e) {
    console.warn('Storage config not found, using defaults');
  }
  
  return {
    screenshot: screenshotConfig,
    video: videoConfig,
    storage: storageConfig,
    supabase: {
      url: process.env.SUPABASE_URL,
      key: process.env.SUPABASE_KEY
    }
  };
}

// Create Express app
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true }));

// Serve static media files
app.use('/media/storage', express.static('/workspace/applens/media/storage'));

// Initialize media service
let mediaService: MediaService;

try {
  const config = loadConfig();
  mediaService = initializeMediaService({
    storage: config.storage as any,
    screenshot: config.screenshot as any,
    video: config.video as any,
    supabase: config.supabase.url && config.supabase.key ? config.supabase : undefined
  });
  console.log('[AppLens] Media service initialized');
} catch (error) {
  console.error('[AppLens] Failed to initialize media service:', error);
  // Create with defaults
  mediaService = initializeMediaService({
    storage: { provider: 'filesystem', filesystem: { basePath: '/workspace/applens/media/storage', baseUrl: '/media/storage' } },
    screenshot: { format: 'png', quality: 90, maxWidth: 1920, maxHeight: 1080, captureOnNavigation: true, compression: { enabled: true, targetSizeKB: 500 } },
    video: { format: 'webm', fps: 30, videoBitrate: 2000000, maxDurationSeconds: 300, recordOnSessionStart: false, codec: 'vp9' }
  });
}

// Mount media routes
const mediaRoutes = createMediaRoutes({
  database: mediaService.getDatabase()!,
  storage: mediaService.getStorage()
});
app.use('/api/media', mediaRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'applens',
    mediaService: mediaService.isInitialized()
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`[AppLens] Server running on port ${PORT}`);
  console.log(`[AppLens] Media API available at http://localhost:${PORT}/api/media`);
});

export default app;
