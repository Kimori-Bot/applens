/**
 * Event Bus for AppLens Automation Engine
 * Provides event-driven communication between modules
 */

import { EventEmitter } from 'events';
import type { EventType, EventData, ScreenState, Action, ActionResult, Issue, AutomationSession } from './types.js';

class AutomationEventBus extends EventEmitter {
  private static instance: AutomationEventBus;
  
  private constructor() {
    super();
    this.setMaxListeners(100);
  }
  
  static getInstance(): AutomationEventBus {
    if (!AutomationEventBus.instance) {
      AutomationEventBus.instance = new AutomationEventBus();
    }
    return AutomationEventBus.instance;
  }
  
  /**
   * Emit a screen visited event
   */
  emitScreenVisited(screen: ScreenState): void {
    this.emit('screen:visited', screen);
  }
  
  /**
   * Emit an action executed event
   */
  emitActionExecuted(action: Action, result: ActionResult): void {
    this.emit('action:executed', { action, result });
  }
  
  /**
   * Emit an issue detected event
   */
  emitIssueDetected(issue: Issue): void {
    this.emit('issue:detected', issue);
  }
  
  /**
   * Emit a session started event
   */
  emitSessionStarted(session: AutomationSession): void {
    this.emit('session:started', session);
  }
  
  /**
   * Emit a session stopped event
   */
  emitSessionStopped(session: AutomationSession): void {
    this.emit('session:stopped', session);
  }
  
  /**
   * Emit a session completed event
   */
  emitSessionCompleted(session: AutomationSession): void {
    this.emit('session:completed', session);
  }
  
  /**
   * Emit a strategy changed event
   */
  emitStrategyChanged(oldStrategy: string, newStrategy: string): void {
    this.emit('strategy:changed', { oldStrategy, newStrategy });
  }
  
  /**
   * Emit an error event
   */
  emitError(error: Error, context?: Record<string, unknown>): void {
    this.emit('error', { error, context });
  }
  
  /**
   * Subscribe to screen visited events
   */
  onScreenVisited(callback: (screen: ScreenState) => void): void {
    this.on('screen:visited', callback);
  }
  
  /**
   * Subscribe to action executed events
   */
  onActionExecuted(callback: (data: { action: Action; result: ActionResult }) => void): void {
    this.on('action:executed', callback);
  }
  
  /**
   * Subscribe to issue detected events
   */
  onIssueDetected(callback: (issue: Issue) => void): void {
    this.on('issue:detected', callback);
  }
  
  /**
   * Subscribe to session events
   */
  onSessionEvent(event: 'started' | 'stopped' | 'completed', callback: (session: AutomationSession) => void): void {
    this.on(`session:${event}`, callback);
  }
  
  /**
   * Subscribe to errors
   */
  onError(callback: (data: { error: Error; context?: Record<string, unknown> }) => void): void {
    this.on('error', callback);
  }
  
  /**
   * Remove all listeners for a specific event
   */
  removeAllListenersForEvent(event: EventType): void {
    this.removeAllListeners(event);
  }
  
  /**
   * Get listener count for an event
   */
  getListenerCount(event: EventType): number {
    return this.listenerCount(event);
  }
}

// Export singleton instance
export const events = AutomationEventBus.getInstance();

// Export class for testing
export { AutomationEventBus };
