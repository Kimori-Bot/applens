/**
 * Smart Exploration Strategy
 * Combines multiple strategies for optimal exploration
 */

import { v4 as uuidv4 } from 'uuid';
import type { ScreenState, UIElement, Action, AutomationConfig } from '../../types.js';

export interface StrategyOptions {
  weights?: Record<string, number>;
  priorities?: Record<string, number>;
  filters?: AutomationConfig['filters'];
  maxConsecutiveRandom?: number;
}

export class SmartStrategy {
  private weights: Record<string, number>;
  private priorities: Record<string, number>;
  private filters: AutomationConfig['filters'];
  private maxConsecutiveRandom: number;
  private consecutiveRandomCount: number = 0;
  private usedElements: Set<string> = new Set();
  private lastAction: Action | null = null;
  
  constructor(options: StrategyOptions = {}) {
    this.weights = options.weights || {
      tap: 0.6,
      swipeUp: 0.15,
      swipeDown: 0.1,
      swipeLeft: 0.075,
      swipeRight: 0.075,
      input: 0.05,
    };
    this.priorities = options.priorities || {};
    this.filters = options.filters || {
      excludeElements: [],
      minElementSize: 10,
      requireVisible: true,
      requireEnabled: true,
    };
    this.maxConsecutiveRandom = options.maxConsecutiveRandom || 5;
  }
  
  /**
   * Decide the next action using smart strategy
   */
  decide(screen: ScreenState, elements: UIElement[], visitedScreens: Set<string>): Action {
    // Filter to get interactive elements
    const interactiveElements = elements.filter(e => this.isInteractive(e));
    
    // If we have unvisited elements, prioritize them
    const unvisitedElements = interactiveElements.filter(e => !this.usedElements.has(e.id));
    
    let selectedElement: UIElement | null = null;
    
    // Prefer unvisited elements
    if (unvisitedElements.length > 0) {
      // Sort by priority
      unvisitedElements.sort((a, b) => this.getPriority(b) - this.getPriority(a));
      selectedElement = unvisitedElements[0];
    } else if (interactiveElements.length > 0) {
      // All elements visited, pick one we haven't used recently
      const unusedElements = interactiveElements.filter(e => !this.usedElements.has(e.id));
      
      if (unusedElements.length > 0) {
        unusedElements.sort((a, b) => this.getPriority(b) - this.getPriority(a));
        selectedElement = unusedElements[0];
      } else {
        // Reset used elements and start over
        this.usedElements.clear();
        selectedElement = interactiveElements[Math.floor(Math.random() * interactiveElements.length)];
      }
    }
    
    // If we have an element, tap it
    if (selectedElement) {
      this.usedElements.add(selectedElement.id);
      this.consecutiveRandomCount = 0;
      
      const action: Action = {
        id: uuidv4(),
        type: 'tap',
        target: selectedElement,
        x: selectedElement.x + selectedElement.width / 2,
        y: selectedElement.y + selectedElement.height / 2,
        timestamp: Date.now(),
      };
      
      this.lastAction = action;
      return action;
    }
    
    // No elements available, try swipe
    this.consecutiveRandomCount++;
    const swipeAction = this.createSmartSwipeAction(screen, visitedScreens);
    this.lastAction = swipeAction;
    return swipeAction;
  }
  
  /**
   * Determine if we should use random exploration
   */
  shouldUseRandom(): boolean {
    return this.consecutiveRandomCount >= this.maxConsecutiveRandom;
  }
  
  /**
   * Check if element is interactive
   */
  private isInteractive(element: UIElement): boolean {
    const interactiveTypes = ['button', 'link', 'input', 'tab', 'menu', 'listItem'];
    return interactiveTypes.includes(element.type) || element.interactive;
  }
  
  /**
   * Get priority score for an element
   */
  private getPriority(element: UIElement): number {
    return this.priorities[element.type] || 0.5;
  }
  
  /**
   * Create a smart swipe action
   */
  private createSmartSwipeAction(screen: ScreenState, visitedScreens: Set<string>): Action {
    // Determine swipe direction based on screen context
    let direction: 'up' | 'down' | 'left' | 'right' = 'up';
    
    // Check last action to avoid repetitive swipes
    if (this.lastAction?.type === 'swipe') {
      const directions: Array<'up' | 'down' | 'left' | 'right'> = ['up', 'down', 'left', 'right'];
      const lastDirection = this.lastAction.direction;
      // Pick a different direction
      const filtered = directions.filter(d => d !== lastDirection);
      direction = filtered[Math.floor(Math.random() * filtered.length)];
    } else {
      // Random initial direction with bias toward up
      const rand = Math.random();
      if (rand < 0.4) direction = 'up';
      else if (rand < 0.7) direction = 'down';
      else if (rand < 0.85) direction = 'left';
      else direction = 'right';
    }
    
    return {
      id: uuidv4(),
      type: 'swipe',
      direction,
      x: 187, // Center of default mobile width
      y: 400, // Center of default mobile height
      timestamp: Date.now(),
    };
  }
  
  /**
   * Reset the strategy state
   */
  reset(): void {
    this.usedElements.clear();
    this.consecutiveRandomCount = 0;
    this.lastAction = null;
  }
}

export { SmartStrategy as Strategy };
