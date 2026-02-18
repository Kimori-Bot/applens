/**
 * Command Queue - Manages action execution queue
 */

import type { Command } from '../types.js';

export class CommandQueue {
  private queue: Command[] = [];
  private processing: boolean = false;
  private maxSize: number = 100;
  
  /**
   * Add a command to the queue
   */
  enqueue(command: Command): void {
    if (this.queue.length >= this.maxSize) {
      // Remove oldest command
      this.queue.shift();
    }
    this.queue.push(command);
  }
  
  /**
   * Remove and return the next command
   */
  dequeue(): Command | undefined {
    return this.queue.shift();
  }
  
  /**
   * Peek at the next command without removing
   */
  peek(): Command | undefined {
    return this.queue[0];
  }
  
  /**
   * Get all commands in queue
   */
  getAll(): Command[] {
    return [...this.queue];
  }
  
  /**
   * Get queue size
   */
  size(): number {
    return this.queue.length;
  }
  
  /**
   * Check if queue is empty
   */
  isEmpty(): boolean {
    return this.queue.length === 0;
  }
  
  /**
   * Check if queue is processing
   */
  isProcessing(): boolean {
    return this.processing;
  }
  
  /**
   * Set processing state
   */
  setProcessing(value: boolean): void {
    this.processing = value;
  }
  
  /**
   * Clear all commands
   */
  clear(): void {
    this.queue = [];
  }
  
  /**
   * Remove specific command by ID
   */
  remove(commandId: string): boolean {
    const index = this.queue.findIndex(c => c.id === commandId);
    if (index !== -1) {
      this.queue.splice(index, 1);
      return true;
    }
    return false;
  }
  
  /**
   * Get command by ID
   */
  get(commandId: string): Command | undefined {
    return this.queue.find(c => c.id === commandId);
  }
}

export { CommandQueue as Queue };
