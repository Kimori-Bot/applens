/**
 * Event Bus for AppLens Automation Engine
 * Provides event-driven communication between modules
 */
import { EventEmitter } from 'events';
import type { EventType, ScreenState, Action, ActionResult, Issue, AutomationSession } from './types.js';
declare class AutomationEventBus extends EventEmitter {
    private static instance;
    private constructor();
    static getInstance(): AutomationEventBus;
    /**
     * Emit a screen visited event
     */
    emitScreenVisited(screen: ScreenState): void;
    /**
     * Emit an action executed event
     */
    emitActionExecuted(action: Action, result: ActionResult): void;
    /**
     * Emit an issue detected event
     */
    emitIssueDetected(issue: Issue): void;
    /**
     * Emit a session started event
     */
    emitSessionStarted(session: AutomationSession): void;
    /**
     * Emit a session stopped event
     */
    emitSessionStopped(session: AutomationSession): void;
    /**
     * Emit a session completed event
     */
    emitSessionCompleted(session: AutomationSession): void;
    /**
     * Emit a strategy changed event
     */
    emitStrategyChanged(oldStrategy: string, newStrategy: string): void;
    /**
     * Emit an error event
     */
    emitError(error: Error, context?: Record<string, unknown>): void;
    /**
     * Subscribe to screen visited events
     */
    onScreenVisited(callback: (screen: ScreenState) => void): void;
    /**
     * Subscribe to action executed events
     */
    onActionExecuted(callback: (data: {
        action: Action;
        result: ActionResult;
    }) => void): void;
    /**
     * Subscribe to issue detected events
     */
    onIssueDetected(callback: (issue: Issue) => void): void;
    /**
     * Subscribe to session events
     */
    onSessionEvent(event: 'started' | 'stopped' | 'completed', callback: (session: AutomationSession) => void): void;
    /**
     * Subscribe to errors
     */
    onError(callback: (data: {
        error: Error;
        context?: Record<string, unknown>;
    }) => void): void;
    /**
     * Remove all listeners for a specific event
     */
    removeAllListenersForEvent(event: EventType): void;
    /**
     * Get listener count for an event
     */
    getListenerCount(event: EventType): number;
}
export declare const events: AutomationEventBus;
export { AutomationEventBus };
//# sourceMappingURL=event-bus.d.ts.map