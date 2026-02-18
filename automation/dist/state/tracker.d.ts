/**
 * State Tracker - Tracks visited screens and actions during exploration
 */
import type { ScreenState, UIElement, Action, ActionResult, Issue, ExplorationReport, NavigationGraph } from '../types.js';
export interface TrackerOptions {
    maxHistory?: number;
}
export declare class StateTracker {
    private visited;
    private actions;
    private results;
    private issues;
    private navigationGraph;
    private currentScreen?;
    private sameStateCount;
    private lastScreenHash?;
    private maxHistory;
    constructor(options?: TrackerOptions);
    /**
     * Mark a screen as visited
     */
    markVisited(screen: ScreenState): void;
    /**
     * Add an action to history
     */
    addAction(action: Action): void;
    /**
     * Add an action result
     */
    addResult(result: ActionResult): void;
    /**
     * Add an issue
     */
    addIssue(issue: Issue): void;
    /**
     * Add screen to navigation graph
     */
    private addToGraph;
    /**
     * Get next unexplored element
     */
    getNextUnexplored(elements: UIElement[]): UIElement | null;
    /**
     * Get screens we've visited
     */
    getVisitedScreens(): ScreenState[];
    /**
     * Get actions performed
     */
    getActions(): Action[];
    /**
     * Get issues found
     */
    getIssues(): Issue[];
    /**
     * Get navigation graph
     */
    getGraph(): NavigationGraph;
    /**
     * Get unique screens count
     */
    getUniqueScreensCount(): number;
    /**
     * Get unique elements count
     */
    getUniqueElementsCount(): number;
    /**
     * Check if we've hit the same state too many times
     */
    isStuck(): boolean;
    /**
     * Get the current screen
     */
    getCurrentScreen(): ScreenState | undefined;
    /**
     * Generate exploration report
     */
    generateReport(sessionId: string, startTime: Date): ExplorationReport;
    /**
     * Calculate estimated coverage
     */
    private calculateCoverage;
    /**
     * Generate hash for a screen
     */
    private hashScreen;
    /**
     * Reset state
     */
    reset(): void;
}
export { StateTracker as Tracker };
//# sourceMappingURL=tracker.d.ts.map