/**
 * Command Queue - Manages action execution queue
 */
import type { Command } from '../types.js';
export declare class CommandQueue {
    private queue;
    private processing;
    private maxSize;
    /**
     * Add a command to the queue
     */
    enqueue(command: Command): void;
    /**
     * Remove and return the next command
     */
    dequeue(): Command | undefined;
    /**
     * Peek at the next command without removing
     */
    peek(): Command | undefined;
    /**
     * Get all commands in queue
     */
    getAll(): Command[];
    /**
     * Get queue size
     */
    size(): number;
    /**
     * Check if queue is empty
     */
    isEmpty(): boolean;
    /**
     * Check if queue is processing
     */
    isProcessing(): boolean;
    /**
     * Set processing state
     */
    setProcessing(value: boolean): void;
    /**
     * Clear all commands
     */
    clear(): void;
    /**
     * Remove specific command by ID
     */
    remove(commandId: string): boolean;
    /**
     * Get command by ID
     */
    get(commandId: string): Command | undefined;
}
export { CommandQueue as Queue };
//# sourceMappingURL=queue.d.ts.map