/**
 * UI Driver - Executes actions via Test Mode API
 */

import { v4 as uuidv4 } from 'uuid';
import type { Action, ActionResult, ScreenState, UIElement, Command, CommandResult } from '../types.js';
import { logger } from '../logger.js';
import { events } from '../event-bus.js';
import { CommandQueue } from './queue.js';

export interface DriverConfig {
  baseUrl: string;
  sessionId: string;
  timeout?: number;
  retryCount?: number;
}

export class UIDriver {
  private baseUrl: string;
  private sessionId: string;
  private timeout: number;
  private retryCount: number;
  private commandQueue: CommandQueue;
  
  constructor(config: DriverConfig) {
    this.baseUrl = config.baseUrl || 'http://localhost:3000/api';
    this.sessionId = config.sessionId;
    this.timeout = config.timeout || 10000;
    this.retryCount = config.retryCount || 3;
    this.commandQueue = new CommandQueue();
    
    logger.info(`[UIDriver] Initialized with base URL: ${this.baseUrl}`);
  }
  
  /**
   * Execute an action and return the result
   */
  async execute(action: Action): Promise<ActionResult> {
    const startTime = Date.now();
    
    try {
      logger.info(`[UIDriver] Executing action: ${action.type}`, {
        actionId: action.id,
        target: action.target?.label || action.x + ',' + action.y
      });
      
      // Convert action to command
      const command = this.actionToCommand(action);
      
      // Add to queue and execute
      this.commandQueue.enqueue(command);
      
      // Execute command
      const result = await this.executeCommand(command);
      
      // Get new screen state
      const newScreen = await this.getCurrentScreen();
      
      const duration = Date.now() - startTime;
      
      const actionResult: ActionResult = {
        success: result.success,
        action,
        newScreen,
        error: result.error,
        duration,
      };
      
      // Emit event
      events.emitActionExecuted(action, actionResult);
      
      return actionResult;
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      logger.error(`[UIDriver] Action failed: ${errorMessage}`);
      
      return {
        success: false,
        action,
        error: errorMessage,
        duration,
      };
    }
  }
  
  /**
   * Convert action to API command
   */
  private actionToCommand(action: Action): Command {
    return {
      id: action.id,
      sessionId: this.sessionId,
      type: action.type,
      x: action.x,
      y: action.y,
      direction: action.direction,
      text: action.text,
      elementId: action.target?.id,
      delay: action.delay,
    };
  }
  
  /**
   * Execute a command via the Test Mode API
   */
  private async executeCommand(command: Command): Promise<CommandResult> {
    let lastError: Error | null = null;
    
    for (let attempt = 1; attempt <= this.retryCount; attempt++) {
      try {
        // Call the test mode API
        const response = await fetch(`${this.baseUrl}/test/command`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(command),
        });
        
        if (!response.ok) {
          throw new Error(`API returned status ${response.status}`);
        }
        
        const result = await response.json() as Record<string, unknown>;
        
        return {
          commandId: command.id,
          success: (result.success as boolean) ?? true,
          error: result.error as string | undefined,
          newScreen: result.screen as ScreenState | undefined,
          elements: result.elements as UIElement[] | undefined,
        };
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        logger.warn(`[UIDriver] Attempt ${attempt} failed:`, lastError.message);
        
        if (attempt < this.retryCount) {
          await this.delay(1000 * attempt); // Exponential backoff
        }
      }
    }
    
    return {
      commandId: command.id,
      success: false,
      error: lastError?.message || 'Unknown error',
    };
  }
  
  /**
   * Get the current screen state from the API
   */
  async getCurrentScreen(): Promise<ScreenState | undefined> {
    try {
      const response = await fetch(`${this.baseUrl}/screens?sessionId=${this.sessionId}`);
      
      if (!response.ok) {
        logger.warn(`[UIDriver] Failed to get screen: ${response.status}`);
        return undefined;
      }
      
      const screens = await response.json();
      
      if (Array.isArray(screens) && screens.length > 0) {
        // Return the latest screen
        return screens[screens.length - 1];
      }
      
      return undefined;
    } catch (error) {
      logger.error('[UIDriver] Error getting current screen:', error);
      return undefined;
    }
  }
  
  /**
   * Get available elements from the API
   */
  async getElements(): Promise<UIElement[]> {
    try {
      const response = await fetch(`${this.baseUrl}/elements?sessionId=${this.sessionId}`);
      
      if (!response.ok) {
        logger.warn(`[UIDriver] Failed to get elements: ${response.status}`);
        return [];
      }
      
      return await response.json() as UIElement[];
    } catch (error) {
      logger.error('[UIDriver] Error getting elements:', error);
      return [];
    }
  }
  
  /**
   * Wait for a specific duration
   */
  async wait(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  /**
   * Delay helper
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  /**
   * Set the session ID
   */
  setSessionId(sessionId: string): void {
    this.sessionId = sessionId;
  }
  
  /**
   * Get the command queue
   */
  getQueue(): CommandQueue {
    return this.commandQueue;
  }
  
  /**
   * Clear the command queue
   */
  clearQueue(): void {
    this.commandQueue.clear();
  }
}

export { UIDriver as Driver };
