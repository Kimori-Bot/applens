/**
 * State Tracker - Tracks visited screens and actions during exploration
 */

import { v4 as uuidv4 } from 'uuid';
import type { ScreenState, UIElement, Action, ActionResult, Issue, ExplorationReport, NavigationGraph, NavigationNode } from '../types.js';
import { logger } from '../logger.js';
import { events } from '../event-bus.js';

export interface TrackerOptions {
  maxHistory?: number;
}

export class StateTracker {
  private visited: Map<string, ScreenState> = new Map();
  private actions: Action[] = [];
  private results: ActionResult[] = [];
  private issues: Issue[] = [];
  private navigationGraph: NavigationGraph;
  private currentScreen?: ScreenState;
  private sameStateCount: number = 0;
  private lastScreenHash?: string;
  private maxHistory: number;
  
  constructor(options: TrackerOptions = {}) {
    this.maxHistory = options.maxHistory || 1000;
    this.navigationGraph = {
      nodes: new Map(),
    };
    
    logger.info('[StateTracker] Initialized');
  }
  
  /**
   * Mark a screen as visited
   */
  markVisited(screen: ScreenState): void {
    const hash = this.hashScreen(screen);
    
    // Check if screen already visited
    if (!this.visited.has(hash)) {
      this.visited.set(hash, screen);
      logger.info(`[StateTracker] New screen visited: ${screen.name} (total: ${this.visited.size})`);
      
      // Add to navigation graph
      this.addToGraph(screen);
    } else {
      // Increment same state count
      this.sameStateCount++;
      logger.debug(`[StateTracker] Revisiting screen: ${screen.name} (count: ${this.sameStateCount})`);
    }
    
    this.lastScreenHash = hash;
    this.currentScreen = screen;
  }
  
  /**
   * Add an action to history
   */
  addAction(action: Action): void {
    this.actions.push(action);
    
    // Trim history if needed
    if (this.actions.length > this.maxHistory) {
      this.actions = this.actions.slice(-this.maxHistory);
    }
  }
  
  /**
   * Add an action result
   */
  addResult(result: ActionResult): void {
    this.results.push(result);
    
    // Trim history if needed
    if (this.results.length > this.maxHistory) {
      this.results = this.results.slice(-this.maxHistory);
    }
  }
  
  /**
   * Add an issue
   */
  addIssue(issue: Issue): void {
    this.issues.push(issue);
    events.emitIssueDetected(issue);
    logger.warn(`[StateTracker] Issue detected: ${issue.type} - ${issue.description}`);
  }
  
  /**
   * Add screen to navigation graph
   */
  private addToGraph(screen: ScreenState): void {
    const node: NavigationNode = {
      screenId: screen.id,
      screenName: screen.name,
      elements: screen.elements,
      actions: [],
      transitions: new Map(),
    };
    
    this.navigationGraph.nodes.set(screen.id, node);
    
    // If there's a previous screen, create a transition
    if (this.currentScreen && this.actions.length > 0) {
      const lastAction = this.actions[this.actions.length - 1];
      const prevNode = this.navigationGraph.nodes.get(this.currentScreen.id);
      
      if (prevNode) {
        prevNode.transitions.set(lastAction.id, screen.id);
        prevNode.actions.push(lastAction);
      }
    }
  }
  
  /**
   * Get next unexplored element
   */
  getNextUnexplored(elements: UIElement[]): UIElement | null {
    const visitedElementIds = new Set<string>();
    
    // Collect all element IDs we've tapped on
    for (const action of this.actions) {
      if (action.target) {
        visitedElementIds.add(action.target.id);
      }
    }
    
    // Find first unvisited element
    for (const element of elements) {
      if (!visitedElementIds.has(element.id)) {
        return element;
      }
    }
    
    return null;
  }
  
  /**
   * Get screens we've visited
   */
  getVisitedScreens(): ScreenState[] {
    return Array.from(this.visited.values());
  }
  
  /**
   * Get actions performed
   */
  getActions(): Action[] {
    return [...this.actions];
  }
  
  /**
   * Get issues found
   */
  getIssues(): Issue[] {
    return [...this.issues];
  }
  
  /**
   * Get navigation graph
   */
  getGraph(): NavigationGraph {
    return this.navigationGraph;
  }
  
  /**
   * Get unique screens count
   */
  getUniqueScreensCount(): number {
    return this.visited.size;
  }
  
  /**
   * Get unique elements count
   */
  getUniqueElementsCount(): number {
    const elementIds = new Set<string>();
    
    for (const screen of this.visited.values()) {
      for (const element of screen.elements) {
        elementIds.add(element.id);
      }
    }
    
    return elementIds.size;
  }
  
  /**
   * Check if we've hit the same state too many times
   */
  isStuck(): boolean {
    return this.sameStateCount >= 5;
  }
  
  /**
   * Get the current screen
   */
  getCurrentScreen(): ScreenState | undefined {
    return this.currentScreen;
  }
  
  /**
   * Generate exploration report
   */
  generateReport(sessionId: string, startTime: Date): ExplorationReport {
    const endTime = new Date();
    
    const report: ExplorationReport = {
      sessionId,
      startTime,
      endTime,
      totalActions: this.actions.length,
      uniqueScreens: this.visited.size,
      uniqueElements: this.getUniqueElementsCount(),
      issues: this.issues,
      graph: this.navigationGraph,
      coverage: {
        screensFound: this.visited.size,
        elementsFound: this.getUniqueElementsCount(),
        estimatedCoverage: this.calculateCoverage(),
      },
    };
    
    logger.info(`[StateTracker] Report generated: ${this.actions.length} actions, ${this.visited.size} screens`);
    
    return report;
  }
  
  /**
   * Calculate estimated coverage
   */
  private calculateCoverage(): number {
    // Simple coverage estimation based on screens visited vs expected
    // In a real app, this would compare against a known screen count
    const screensVisited = this.visited.size;
    
    // Assume we've covered enough if we've visited 10+ screens or no new screens in 10+ actions
    if (screensVisited >= 10) return Math.min(1, screensVisited / 20);
    if (this.sameStateCount >= 10) return 0.8;
    
    return Math.min(0.8, screensVisited / 10);
  }
  
  /**
   * Generate hash for a screen
   */
  private hashScreen(screen: ScreenState): string {
    // Use screen ID if available
    if (screen.hash) return screen.hash;
    
    // Generate hash based on element count and types
    const elementTypes = screen.elements.map(e => e.type).sort().join(',');
    return `${screen.name}:${elementTypes.length}:${elementTypes.substring(0, 50)}`;
  }
  
  /**
   * Reset state
   */
  reset(): void {
    this.visited.clear();
    this.actions = [];
    this.results = [];
    this.issues = [];
    this.navigationGraph = {
      nodes: new Map(),
    };
    this.currentScreen = undefined;
    this.sameStateCount = 0;
    this.lastScreenHash = undefined;
    
    logger.info('[StateTracker] State reset');
  }
}

export { StateTracker as Tracker };
