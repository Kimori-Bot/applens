/**
 * Media API Routes
 * 
 * REST API endpoints for media management
 * Handles screenshots and videos retrieval
 */

import { Router, type Request, type Response, type NextFunction } from 'express';
import { MediaDatabase, type MediaRecord } from '../storage/media-database';
import { MediaStorage } from '../storage/media-storage';
import type { MediaType } from '../types';

export interface MediaApiOptions {
  database: MediaDatabase;
  storage: MediaStorage;
  baseUrl?: string;
}

export function createMediaRoutes(options: MediaApiOptions): Router {
  const { database, storage, baseUrl = '/api/media' } = options;
  const router = Router();

  // ==================== Screenshots ====================

  /**
   * GET /api/media/screenshots/:sessionId
   * List all screenshots for a session
   */
  router.get('/screenshots/:sessionId', async (req: Request, res: Response, next: NextFunction) => {
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
      next(error);
    }
  });

  /**
   * GET /api/media/screenshots/:id/image
   * Get screenshot image data
   */
  router.get('/screenshots/:id/image', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const record = await database.findById(parseInt(id, 10));

      if (!record || record.type !== 'screenshot') {
        return res.status(404).json({
          success: false,
          error: 'Screenshot not found'
        });
      }

      // Try to get from storage first
      let imageBuffer: Buffer | null = null;
      
      if (record.url) {
        // URL-based approach - redirect to CDN/storage URL
        return res.redirect(record.url);
      }

      // If no URL, try to retrieve from storage
      if (record.filename) {
        imageBuffer = await storage.retrieve(record.filename);
      }

      if (!imageBuffer) {
        return res.status(404).json({
          success: false,
          error: 'Image data not available'
        });
      }

      // Determine content type
      const format = record.format || 'png';
      const contentTypes: Record<string, string> = {
        png: 'image/png',
        jpeg: 'image/jpeg',
        jpg: 'image/jpeg',
        webp: 'image/webp'
      };

      res.set('Content-Type', contentTypes[format] || 'image/png');
      res.send(imageBuffer);
    } catch (error) {
      next(error);
    }
  });

  // ==================== Videos ====================

  /**
   * GET /api/media/videos/:sessionId
   * List all videos for a session
   */
  router.get('/videos/:sessionId', async (req: Request, res: Response, next: NextFunction) => {
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
      next(error);
    }
  });

  /**
   * GET /api/media/videos/:id/video
   * Stream video file
   */
  router.get('/videos/:id/video', async (req: Request, res: Response, next: NextFunction) => {
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
        const contentTypes: Record<string, string> = {
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
      next(error);
    }
  });

  // ==================== Generic Media ====================

  /**
   * GET /api/media/:sessionId
   * List all media (screenshots and videos) for a session
   */
  router.get('/:sessionId', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { sessionId } = req.params;
      const { type } = req.query;
      
      const mediaType = type as MediaType | undefined;
      const records = await database.findBySessionId(sessionId, mediaType);
      
      res.json({
        success: true,
        data: records,
        count: records.length
      });
    } catch (error) {
      next(error);
    }
  });

  /**
   * DELETE /api/media/:id
   * Delete a media file
   */
  router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
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
      next(error);
    }
  });

  /**
   * GET /api/media/:id/info
   * Get media file info
   */
  router.get('/:id/info', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const record = await database.findById(parseInt(id, 10));

      if (!record) {
        return res.status(404).json({
          success: false,
          error: 'Media not found'
        });
      }

      res.json({
        success: true,
        data: {
          id: record.id,
          sessionId: record.session_id,
          appId: record.app_id,
          type: record.type,
          filename: record.filename,
          url: record.url,
          durationSeconds: record.duration_seconds,
          width: record.width,
          height: record.height,
          format: record.format,
          createdAt: record.created_at
        }
      });
    } catch (error) {
      next(error);
    }
  });

  return router;
}
