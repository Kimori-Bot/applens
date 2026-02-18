/**
 * Event Bus for AppLens Automation Engine
 * Provides event-driven communication between modules
 */
import { EventEmitter } from 'events';
class AutomationEventBus extends EventEmitter {
    constructor() {
        super();
        this.setMaxListeners(100);
    }
    static getInstance() {
        if (!AutomationEventBus.instance) {
            AutomationEventBus.instance = new AutomationEventBus();
        }
        return AutomationEventBus.instance;
    }
    /**
     * Emit a screen visited event
     */
    emitScreenVisited(screen) {
        this.emit('screen:visited', screen);
    }
    /**
     * Emit an action executed event
     */
    emitActionExecuted(action, result) {
        this.emit('action:executed', { action, result });
    }
    /**
     * Emit an issue detected event
     */
    emitIssueDetected(issue) {
        this.emit('issue:detected', issue);
    }
    /**
     * Emit a session started event
     */
    emitSessionStarted(session) {
        this.emit('session:started', session);
    }
    /**
     * Emit a session stopped event
     */
    emitSessionStopped(session) {
        this.emit('session:stopped', session);
    }
    /**
     * Emit a session completed event
     */
    emitSessionCompleted(session) {
        this.emit('session:completed', session);
    }
    /**
     * Emit a strategy changed event
     */
    emitStrategyChanged(oldStrategy, newStrategy) {
        this.emit('strategy:changed', { oldStrategy, newStrategy });
    }
    /**
     * Emit an error event
     */
    emitError(error, context) {
        this.emit('error', { error, context });
    }
    /**
     * Subscribe to screen visited events
     */
    onScreenVisited(callback) {
        this.on('screen:visited', callback);
    }
    /**
     * Subscribe to action executed events
     */
    onActionExecuted(callback) {
        this.on('action:executed', callback);
    }
    /**
     * Subscribe to issue detected events
     */
    onIssueDetected(callback) {
        this.on('issue:detected', callback);
    }
    /**
     * Subscribe to session events
     */
    onSessionEvent(event, callback) {
        this.on(`session:${event}`, callback);
    }
    /**
     * Subscribe to errors
     */
    onError(callback) {
        this.on('error', callback);
    }
    /**
     * Remove all listeners for a specific event
     */
    removeAllListenersForEvent(event) {
        this.removeAllListeners(event);
    }
    /**
     * Get listener count for an event
     */
    getListenerCount(event) {
        return this.listenerCount(event);
    }
}
// Export singleton instance
export const events = AutomationEventBus.getInstance();
// Export class for testing
export { AutomationEventBus };
//# sourceMappingURL=event-bus.js.map