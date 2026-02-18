/**
 * AppLens Automation Engine - Main Entry Point
 * Autonomous AI navigation system that controls apps
 */

import { v4 as uuidv4 } from 'uuid';
import express, { Request, Response } from 'express';
import cors from 'cors';
import { AIExplorer } from './ai-engine/explorer.js';
import { UIDriver } from './ui-handler/driver.js';
import { StateTracker } from './state/tracker.js';
import { Reporter } from './state/reporter.js';
import { config } from './config.js';
import { logger } from './logger.js';
import { events } from './event-bus.js';
import type { 
  AutomationSession, 
  AutomationConfig, 
  ScreenState, 
  Action, 
  ActionResult,
  Issue 
} from './types.js';

export interface AutomationEngineOptions {
  baseUrl?: string;
  config?: AutomationConfig;
}

class AutomationEngine {
  private app: express.Application;
  private explorer: AIExplorer;
  private driver: UIDriver | null = null;
  private tracker: StateTracker;
  private session: AutomationSession | null = null;
  private running: boolean = false;
  private pollingInterval: NodeJS.Timeout | null = null;
  private baseUrl: string;
  
  constructor(options: AutomationEngineOptions = {}) {
    this.app = express();
    this.baseUrl = options.baseUrl || 'http://localhost:3000/api';
    this.tracker = new StateTracker();
    
    // Initialize explorer with config
    const cfg = options.config || config.get();
    this.explorer = new AIExplorer({
      strategy: 'smart',
      config: cfg,
    });
    
    this.setupRoutes();
    logger.info('[AutomationEngine] Initialized');
  }
  
  /**
   * Setup Express routes for automation control
   */
  private setupRoutes(): void {
    this.app.use(cors());
    this.app.use(express.json());
    
    // Health check
    this.app.get('/api/automation/health', (req: Request, res: Response) => {
      res.json({ 
        status: this.running ? 'running' : 'idle',
        session: this.session ? {
          id: this.session.id,
          actions: this.session.actions.length,
          screens: this.tracker.getUniqueScreensCount(),
        } : null
      });
    });
    
    // Start automation
    this.app.post('/api/automation/start', async (req: Request, res: Response) => {
      try {
        const { sessionId, appId, strategy } = req.body;
        
        const result = await this.start(sessionId || appId, strategy);
        res.json(result);
      } catch (error) {
        logger.error('[AutomationEngine] Start error:', error);
        res.status(500).json({ error: String(error) });
      }
    });
    
    // Stop automation
    this.app.post('/api/automation/stop', async (req: Request, res: Response) => {
      try {
        const result = await this.stop();
        res.json(result);
      } catch (error) {
        logger.error('[AutomationEngine] Stop error:', error);
        res.status(500).json({ error: String(error) });
      }
    });
    
    // Get status
    this.app.get('/api/automation/status', (req: Request, res: Response) => {
      res.json(this.getStatus());
    });
    
    // Get report
    this.app.get('/api/automation/report', (req: Request, res: Response) => {
      const report = this.getReport();
      res.json(report);
    });
    
    // Get report as markdown
    this.app.get('/api/automation/report/markdown', (req: Request, res: Response) => {
      const report = this.getReport();
      if (!report) {
        return res.status(400).json({ error: 'No report available' });
      }
      res.type('text/markdown').send(Reporter.toMarkdown(report));
    });
    
    // Get report as HTML
    this.app.get('/api/automation/report/html', (req: Request, res: Response) => {
      const report = this.getReport();
      if (!report) {
        return res.status(400).json({ error: 'No report available' });
      }
      res.type('text/html').send(Reporter.toHTML(report));
    });
    
    // Change strategy
    this.app.post('/api/automation/strategy', (req: Request, res: Response) => {
      const { strategy } = req.body;
      
      if (!['random', 'bfs', 'dfs', 'smart'].includes(strategy)) {
        return res.status(400).json({ error: 'Invalid strategy' });
      }
      
      this.explorer.switchStrategy(strategy);
      res.json({ success: true, strategy });
    });
    
    // Manual action (for testing)
    this.app.post('/api/automation/action', async (req: Request, res: Response) => {
      try {
        const { type, x, y, elementId, text } = req.body;
        
        if (!this.driver || !this.session) {
          return res.status(400).json({ error: 'No active session' });
        }
        
        const action: Action = {
          id: uuidv4(),
          type: type as Action['type'],
          x,
          y,
          text,
          timestamp: Date.now(),
        };
        
        const result = await this.driver.execute(action);
        res.json(result);
      } catch (error) {
        logger.error('[AutomationEngine] Action error:', error);
        res.status(500).json({ error: String(error) });
      }
    });
  }
  
  /**
   * Start the automation engine
   */
  async start(sessionId: string, strategy?: string): Promise<AutomationSession> {
    if (this.running) {
      throw new Error('Automation already running');
    }
    
    // Create session
    this.session = {
      id: sessionId,
      appId: sessionId,
      status: 'running',
      config: config.get(),
      startTime: new Date(),
      actions: [],
      results: [],
      issues: [],
    };
    
    // Initialize driver
    this.driver = new UIDriver({
      baseUrl: this.baseUrl,
      sessionId,
      timeout: 10000,
    });
    
    // Switch strategy if specified
    if (strategy) {
      this.explorer.switchStrategy(strategy as 'random' | 'bfs' | 'dfs' | 'smart');
    }
    
    this.running = true;
    
    // Start the exploration loop
    this.startExplorationLoop();
    
    events.emitSessionStarted(this.session);
    logger.info(`[AutomationEngine] Started session: ${sessionId}`);
    
    return this.session;
  }
  
  /**
   * Start the exploration loop
   */
  private startExplorationLoop(): void {
    const limits = config.getLimits();
    
    // Poll for commands and execute
    this.pollingInterval = setInterval(async () => {
      if (!this.running || !this.driver || !this.session) {
        this.stopPolling();
        return;
      }
      
      try {
        // Check limits
        if (this.session.actions.length >= limits.maxActionsPerSession) {
          logger.info('[AutomationEngine] Max actions reached');
          await this.stop();
          return;
        }
        
        const elapsed = Date.now() - this.session.startTime.getTime();
        if (elapsed >= limits.maxTimePerSession) {
          logger.info('[AutomationEngine] Max time reached');
          await this.stop();
          return;
        }
        
        // Get current screen state
        const currentScreen = await this.driver.getCurrentScreen();
        
        if (currentScreen) {
          this.tracker.markVisited(currentScreen);
          
          // Check if stuck
          if (this.tracker.isStuck()) {
            logger.warn('[AutomationEngine] Stuck in same state, trying back');
            const backAction: Action = {
              id: uuidv4(),
              type: 'back',
              timestamp: Date.now(),
            };
            
            await this.driver.execute(backAction);
            return;
          }
          
          // AI decides next action
          const action = this.explorer.decide(currentScreen);
          
          // Execute action
          const result = await this.driver.execute(action);
          
          // Track
          this.session.actions.push(action);
          this.session.results.push(result);
          this.tracker.addAction(action);
          this.tracker.addResult(result);
          
          // Delay between actions
          await this.driver.wait(limits.actionDelay);
        }
      } catch (error) {
        logger.error('[AutomationEngine] Exploration loop error:', error);
        
        // Check if it's a critical error
        if (this.isCriticalError(error)) {
          this.detectIssue({
            id: uuidv4(),
            type: 'error',
            severity: 'high',
            description: String(error),
            timestamp: Date.now(),
            status: 'open',
          });
          
          await this.stop();
        }
      }
    }, 2000); // Poll every 2 seconds
  }
  
  /**
   * Stop the automation engine
   */
  async stop(): Promise<AutomationSession | null> {
    if (!this.running) {
      return null;
    }
    
    this.running = false;
    this.stopPolling();
    
    if (this.session) {
      this.session.status = 'completed';
      this.session.endTime = new Date();
      this.session.issues = this.tracker.getIssues();
      
      events.emitSessionCompleted(this.session);
      logger.info(`[AutomationEngine] Stopped session: ${this.session.id}`);
    }
    
    return this.session;
  }
  
  /**
   * Stop polling interval
   */
  private stopPolling(): void {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
  }
  
  /**
   * Get current status
   */
  getStatus(): {
    running: boolean;
    session: AutomationSession | null;
    screens: number;
    actions: number;
    issues: number;
    strategy: string;
  } {
    return {
      running: this.running,
      session: this.session,
      screens: this.tracker.getUniqueScreensCount(),
      actions: this.session?.actions.length || 0,
      issues: this.tracker.getIssues().length,
      strategy: this.explorer.getStrategy(),
    };
  }
  
  /**
   * Get exploration report
   */
  getReport() {
    if (!this.session) {
      return null;
    }
    
    return Reporter.generate(
      this.session.id,
      this.session.startTime,
      this.session.endTime || new Date(),
      this.session.actions.length,
      this.tracker.getUniqueScreensCount(),
      this.tracker.getUniqueElementsCount(),
      this.tracker.getIssues(),
      this.tracker.getGraph()
    );
  }
  
  /**
   * Detect and track an issue
   */
  detectIssue(issue: Issue): void {
    this.tracker.addIssue(issue);
    
    if (this.session) {
      this.session.issues.push(issue);
    }
  }
  
  /**
   * Check if error is critical
   */
  private isCriticalError(error: unknown): boolean {
    const errorMsg = String(error).toLowerCase();
    return errorMsg.includes('crash') || 
           errorMsg.includes('fatal') ||
           errorMsg.includes('timeout');
  }
  
  /**
   * Get Express app for server
   */
  getApp(): express.Application {
    return this.app;
  }
  
  /**
   * Start the server
   */
  listen(port: number = 3001): void {
    this.app.listen(port, () => {
      logger.info(`[AutomationEngine] Server listening on port ${port}`);
    });
  }
}

// Export singleton
export const automationEngine = new AutomationEngine();

// Export class
export { AutomationEngine };

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  automationEngine.listen(3001);
}
