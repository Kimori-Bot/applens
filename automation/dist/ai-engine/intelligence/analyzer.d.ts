/**
 * Screen Analyzer - Analyzes screens for element patterns and insights
 */
import type { ScreenState, UIElement, Issue } from '../../types.js';
export interface ScreenAnalysis {
    screenId: string;
    screenName: string;
    elementCount: number;
    interactiveElements: UIElement[];
    nonInteractiveElements: UIElement[];
    elementTypes: Map<string, number>;
    potentialIssues: Issue[];
    recommendations: string[];
}
export declare class ScreenAnalyzer {
    /**
     * Analyze a screen and return insights
     */
    analyze(screen: ScreenState): ScreenAnalysis;
    /**
     * Determine if an element is interactive
     */
    private isInteractive;
    /**
     * Find potentially overlapping elements
     */
    private findOverlappingElements;
    /**
     * Check if two elements overlap
     */
    private elementsOverlap;
    /**
     * Compare two screens to detect changes
     */
    compareScreens(before: ScreenState, after: ScreenState): {
        changed: boolean;
        addedElements: UIElement[];
        removedElements: UIElement[];
        modifiedElements: UIElement[];
    };
    /**
     * Calculate similarity between two screens
     */
    calculateSimilarity(screenA: ScreenState, screenB: ScreenState): number;
}
export { ScreenAnalyzer as Analyzer };
//# sourceMappingURL=analyzer.d.ts.map