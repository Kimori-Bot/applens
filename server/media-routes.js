/**
 * Media API Routes (JavaScript)
 * 
 * REST API endpoints for media management
 * Handles screenshots and videos retrieval
 * 
 * @route GET /api/media/screenshots/:sessionId - List screenshots
 * @route GET /api/media/screenshots/:id/image - Get image data
 * @route GET /api/media/videos/:sessionId - List videos
 * @route GET /api/media/videos/:id/video - Stream video
 */

const createMediaRoutes = (options) => {
  const { database, storage, baseUrl = '/api/media' } = options;
  const router = {
    get: (path, handler) => router[path] = handler,
    post: (path, handler) => {},
    delete: (path, handler) => {}
  };

  // GET /api/media/screenshots/:sessionId - List all screenshots for a session
  router.get('/screenshots/:sessionId', async (req, res) => {
    try {
      const { sessionId } = req.params;
      const records = await database.findBySessionId(sessionId, 'screenshot');
      
      const screenshots = records.map(record => ({
        id: record.id,
        sessionId: record.session_id,
        appId: record.app_id,
        type: 'screenshot',
        filename: record.filename,
        url: record.url,
        screenId: record.screen_id,
        width: record.width,
        height: record.height,
        format: record.format,
        createdAt: record.created_at
      }));

      res.json({
        success: true,
        data: screenshots,
        count: screenshots.length
      });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // GET /api/media/screenshots/:id/image - Get screenshot image data
  router.get('/screenshots/:id/image', async (req, res) => {
    try {
      const { id } = req.params;
      const record = await database.findById(parseInt(id, 10));

      if (!record || record.type !== 'screenshot') {
        return res.status(404).json({
          success: false,
          error: 'Screenshot not found'
        });
      }

      // Redirect to CDN/storage URL if available
      if (record.url) {
        return res.redirect(record.url);
      }

      // Try to get from storage
      if (record.filename) {
        const imageBuffer = await storage.retrieve(record.filename);
        
        if (!imageBuffer) {
          return res.status(404).json({
            success: false,
            error: 'Image data not available'
          });
        }

        const format = record.format || 'png';
        const contentTypes = {
          png: 'image/png',
          jpeg: 'image/jpeg',
          jpg: 'image/jpeg',
          webp: 'image/webp'
        };

        res.set('Content-Type', contentTypes[format] || 'image/png');
        return res.send(imageBuffer);
      }

      return res.status(404).json({
        success: false,
        error: 'Image not found'
      });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // GET /api/media/videos/:sessionId - List all videos for a session
  router.get('/videos/:sessionId', async (req, res) => {
    try {
      const { sessionId } = req.params;
      const records = await database.findBySessionId(sessionId, 'video');
      
      const videos = records.map(record => ({
        id: record.id,
        sessionId: record.session_id,
        appId: record.app_id,
        type: 'video',
        filename: record.filename,
        url: record.url,
        durationSeconds: record.duration_seconds,
        width: record.width,
        height: record.height,
        format: record.format,
        createdAt: record.created_at
      }));

      res.json({
        success: true,
        data: videos,
        count: videos.length
      });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // GET /api/media/videos/:id/video - Stream video file
  router.get('/videos/:id/video', async (req, res) => {
    try {
      const { id } = req.params;
      const record = await database.findById(parseInt(id, 10));

      if (!record || record.type !== 'video') {
        return res.status(404).json({
          success: false,
          error: 'Video not found'
        });
      }

      // Redirect to storage URL if available
      if (record.url) {
        return res.redirect(record.url);
      }

      // Try to get from storage
      if (record.filename) {
        const videoBuffer = await storage.retrieve(record.filename);
        
        if (!videoBuffer) {
          return res.status(404).json({
            success: false,
            error: 'Video data not available'
          });
        }

        const format = record.format || 'mp4';
        const contentTypes = {
          mp4: 'video/mp4',
          webm: 'video/webm'
        };

        res.set('Content-Type', contentTypes[format] || 'video/mp4');
        res.set('Content-Length', videoBuffer.length);
        
        if (record.duration_seconds) {
          res.set('X-Duration', String(record.duration_seconds));
        }

        return res.send(videoBuffer);
      }

      return res.status(404).json({
        success: false,
        error: 'Video file not found'
      });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // GET /api/media/:sessionId - List all media for a session
  router.get('/:sessionId', async (req, res) => {
    try {
      const { sessionId } = req.params;
      const { type } = req.query;
      
      const records = await database.findBySessionId(sessionId, type);
      
      res.json({
        success: true,
        data: records,
        count: records.length
      });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // DELETE /api/media/:id - Delete a media file
  router.delete('/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const record = await database.findById(parseInt(id, 10));

      if (!record) {
        return res.status(404).json({
          success: false,
          error: 'Media not found'
        });
      }

      // Delete from storage
      if (record.filename) {
        await storage.delete(record.filename);
      }

      // Delete from database
      await database.delete(parseInt(id, 10));

      res.json({
        success: true,
        message: 'Media deleted successfully'
      });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  return router;
};

module.exports = { createMediaRoutes };
