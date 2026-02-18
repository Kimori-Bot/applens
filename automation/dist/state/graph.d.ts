/**
 * Navigation Graph - Manages the navigation structure between screens
 */
import type { NavigationNode, NavigationGraph, ScreenState, Action } from '../types.js';
export declare class NavigationGraphManager {
    private graph;
    constructor();
    /**
     * Add a node (screen) to the graph
     */
    addNode(screen: ScreenState): void;
    /**
     * Add a transition between screens
     */
    addTransition(fromScreenId: string, action: Action, toScreenId: string): void;
    /**
     * Get a node by screen ID
     */
    getNode(screenId: string): NavigationNode | undefined;
    /**
     * Get all nodes
     */
    getAllNodes(): NavigationNode[];
    /**
     * Get outgoing transitions from a screen
     */
    getOutgoingTransitions(screenId: string): Map<string, string> | undefined;
    /**
     * Get incoming transitions to a screen
     */
    getIncomingTransitions(screenId: string): Array<{
        fromScreenId: string;
        action: Action;
    }>;
    /**
     * Find screens reachable from a given screen
     */
    findReachableScreens(screenId: string): string[];
    /**
     * Find all paths between two screens
     */
    findPaths(fromScreenId: string, toScreenId: string): Action[][];
    /**
     * Get graph statistics
     */
    getStats(): {
        nodeCount: number;
        edgeCount: number;
        averageTransitions: number;
        maxTransitions: number;
    };
    /**
     * Export graph as JSON
     */
    toJSON(): object;
    /**
     * Set the start node
     */
    setStartNode(screenId: string): void;
    /**
     * Get the start node
     */
    getStartNode(): string | undefined;
    /**
     * Clear the graph
     */
    clear(): void;
    /**
     * Get the raw graph
     */
    getGraph(): NavigationGraph;
}
export { NavigationGraphManager as GraphManager };
//# sourceMappingURL=graph.d.ts.map