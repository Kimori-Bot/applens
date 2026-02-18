/**
 * Depth-First Exploration Strategy
 * Goes deep into navigation paths before exploring siblings
 */

import { v4 as uuidv4 } from 'uuid';
import type { ScreenState, UIElement, Action, AutomationConfig } from '../../types.js';

export interface StrategyOptions {
  priorities?: Record<string, number>;
  filters?: AutomationConfig['filters'];
  maxDepth?: number;
}

export class DFSStrategy {
  private priorities: Record<string, number>;
  private filters: AutomationConfig['filters'];
  private maxDepth: number;
  private stack: UIElement[] = [];
  private currentDepth: number = 0;
  
  constructor(options: StrategyOptions = {}) {
    this.priorities = options.priorities || {};
    this.filters = options.filters || {
      excludeElements: [],
      minElementSize: 10,
      requireVisible: true,
      requireEnabled: true,
    };
    this.maxDepth = options.maxDepth || 10;
  }
  
  /**
   * Decide the next action using DFS
   */
  decide(screen: ScreenState, elements: UIElement[], visitedScreens: Set<string>): Action {
    // Add new elements to stack (at front for LIFO)
    for (const element of elements) {
      if (!this.isElementInStack(element)) {
        this.stack.unshift(element);
      }
    }
    
    // Get next element from stack
    if (this.stack.length === 0) {
      return this.createSwipeAction('up');
    }
    
    const element = this.stack.shift()!;
    
    this.currentDepth++;
    
    return {
      id: uuidv4(),
      type: 'tap',
      target: element,
      x: element.x + element.width / 2,
      y: element.y + element.height / 2,
      timestamp: Date.now(),
    };
  }
  
  /**
   * Check if element is already in stack
   */
  private isElementInStack(element: UIElement): boolean {
    return this.stack.some(e => e.id === element.id);
  }
  
  /**
   * Create a swipe action when stack is empty
   */
  private createSwipeAction(direction: string): Action {
    return {
      id: uuidv4(),
      type: 'swipe',
      direction: direction as 'up' | 'down' | 'left' | 'right',
      x: 187, // Center of default mobile width
      y: 400, // Center of default mobile height
      timestamp: Date.now(),
    };
  }
  
  /**
   * Reset the strategy state
   */
  reset(): void {
    this.stack = [];
    this.currentDepth = 0;
  }
}

export { DFSStrategy as Strategy };
