/**
 * UI Driver - Executes actions via Test Mode API
 */
import type { Action, ActionResult, ScreenState, UIElement } from '../types.js';
import { CommandQueue } from './queue.js';
export interface DriverConfig {
    baseUrl: string;
    sessionId: string;
    timeout?: number;
    retryCount?: number;
}
export declare class UIDriver {
    private baseUrl;
    private sessionId;
    private timeout;
    private retryCount;
    private commandQueue;
    constructor(config: DriverConfig);
    /**
     * Execute an action and return the result
     */
    execute(action: Action): Promise<ActionResult>;
    /**
     * Convert action to API command
     */
    private actionToCommand;
    /**
     * Execute a command via the Test Mode API
     */
    private executeCommand;
    /**
     * Get the current screen state from the API
     */
    getCurrentScreen(): Promise<ScreenState | undefined>;
    /**
     * Get available elements from the API
     */
    getElements(): Promise<UIElement[]>;
    /**
     * Wait for a specific duration
     */
    wait(ms: number): Promise<void>;
    /**
     * Delay helper
     */
    private delay;
    /**
     * Set the session ID
     */
    setSessionId(sessionId: string): void;
    /**
     * Get the command queue
     */
    getQueue(): CommandQueue;
    /**
     * Clear the command queue
     */
    clearQueue(): void;
}
export { UIDriver as Driver };
//# sourceMappingURL=driver.d.ts.map