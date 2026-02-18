/**
 * Navigation Graph - Manages the navigation structure between screens
 */

import type { NavigationNode, NavigationGraph, ScreenState, Action } from '../types.js';

export class NavigationGraphManager {
  private graph: NavigationGraph;
  
  constructor() {
    this.graph = {
      nodes: new Map(),
    };
  }
  
  /**
   * Add a node (screen) to the graph
   */
  addNode(screen: ScreenState): void {
    if (this.graph.nodes.has(screen.id)) {
      return; // Node already exists
    }
    
    const node: NavigationNode = {
      screenId: screen.id,
      screenName: screen.name,
      elements: screen.elements,
      actions: [],
      transitions: new Map(),
    };
    
    this.graph.nodes.set(screen.id, node);
  }
  
  /**
   * Add a transition between screens
   */
  addTransition(fromScreenId: string, action: Action, toScreenId: string): void {
    const fromNode = this.graph.nodes.get(fromScreenId);
    const toNode = this.graph.nodes.get(toScreenId);
    
    if (fromNode && toNode) {
      fromNode.transitions.set(action.id, toScreenId);
      fromNode.actions.push(action);
    }
  }
  
  /**
   * Get a node by screen ID
   */
  getNode(screenId: string): NavigationNode | undefined {
    return this.graph.nodes.get(screenId);
  }
  
  /**
   * Get all nodes
   */
  getAllNodes(): NavigationNode[] {
    return Array.from(this.graph.nodes.values());
  }
  
  /**
   * Get outgoing transitions from a screen
   */
  getOutgoingTransitions(screenId: string): Map<string, string> | undefined {
    const node = this.graph.nodes.get(screenId);
    return node?.transitions;
  }
  
  /**
   * Get incoming transitions to a screen
   */
  getIncomingTransitions(screenId: string): Array<{ fromScreenId: string; action: Action }> {
    const incoming: Array<{ fromScreenId: string; action: Action }> = [];
    
    for (const node of this.graph.nodes.values()) {
      for (const [actionId, targetScreenId] of node.transitions) {
        if (targetScreenId === screenId) {
          const action = node.actions.find(a => a.id === actionId);
          if (action) {
            incoming.push({
              fromScreenId: node.screenId,
              action,
            });
          }
        }
      }
    }
    
    return incoming;
  }
  
  /**
   * Find screens reachable from a given screen
   */
  findReachableScreens(screenId: string): string[] {
    const visited = new Set<string>();
    const queue = [screenId];
    const reachable: string[] = [];
    
    while (queue.length > 0) {
      const currentId = queue.shift()!;
      
      if (visited.has(currentId)) continue;
      visited.add(currentId);
      
      const node = this.graph.nodes.get(currentId);
      if (node) {
        for (const targetId of node.transitions.values()) {
          if (!visited.has(targetId)) {
            queue.push(targetId);
            reachable.push(targetId);
          }
        }
      }
    }
    
    return reachable;
  }
  
  /**
   * Find all paths between two screens
   */
  findPaths(fromScreenId: string, toScreenId: string): Action[][] {
    const paths: Action[][] = [];
    const visited = new Set<string>();
    
    const dfs = (currentId: string, path: Action[]): void => {
      if (currentId === toScreenId) {
        paths.push([...path]);
        return;
      }
      
      visited.add(currentId);
      
      const node = this.graph.nodes.get(currentId);
      if (node) {
        for (const [actionId, targetId] of node.transitions) {
          const action = node.actions.find(a => a.id === actionId);
          if (action && !visited.has(targetId)) {
            path.push(action);
            dfs(targetId, path);
            path.pop();
          }
        }
      }
      
      visited.delete(currentId);
    };
    
    dfs(fromScreenId, []);
    return paths;
  }
  
  /**
   * Get graph statistics
   */
  getStats(): {
    nodeCount: number;
    edgeCount: number;
    averageTransitions: number;
    maxTransitions: number;
  } {
    let edgeCount = 0;
    let maxTransitions = 0;
    
    for (const node of this.graph.nodes.values()) {
      const transitionCount = node.transitions.size;
      edgeCount += transitionCount;
      maxTransitions = Math.max(maxTransitions, transitionCount);
    }
    
    const nodeCount = this.graph.nodes.size;
    
    return {
      nodeCount,
      edgeCount,
      averageTransitions: nodeCount > 0 ? edgeCount / nodeCount : 0,
      maxTransitions,
    };
  }
  
  /**
   * Export graph as JSON
   */
  toJSON(): object {
    const nodes: object[] = [];
    
    for (const node of this.graph.nodes.values()) {
      nodes.push({
        screenId: node.screenId,
        screenName: node.screenName,
        elementCount: node.elements.length,
        transitionCount: node.transitions.size,
        transitions: Array.from(node.transitions.entries()),
      });
    }
    
    return {
      nodes,
      stats: this.getStats(),
    };
  }
  
  /**
   * Set the start node
   */
  setStartNode(screenId: string): void {
    if (this.graph.nodes.has(screenId)) {
      this.graph.startNode = screenId;
    }
  }
  
  /**
   * Get the start node
   */
  getStartNode(): string | undefined {
    return this.graph.startNode;
  }
  
  /**
   * Clear the graph
   */
  clear(): void {
    this.graph = {
      nodes: new Map(),
      startNode: undefined,
    };
  }
  
  /**
   * Get the raw graph
   */
  getGraph(): NavigationGraph {
    return this.graph;
  }
}

export { NavigationGraphManager as GraphManager };
