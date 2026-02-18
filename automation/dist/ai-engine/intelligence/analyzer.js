/**
 * Screen Analyzer - Analyzes screens for element patterns and insights
 */
export class ScreenAnalyzer {
    /**
     * Analyze a screen and return insights
     */
    analyze(screen) {
        const elementTypes = new Map();
        const interactiveElements = [];
        const nonInteractiveElements = [];
        const potentialIssues = [];
        const recommendations = [];
        // Count and categorize elements
        for (const element of screen.elements) {
            // Count element types
            const count = elementTypes.get(element.type) || 0;
            elementTypes.set(element.type, count + 1);
            // Categorize by interactivity
            if (this.isInteractive(element)) {
                interactiveElements.push(element);
            }
            else {
                nonInteractiveElements.push(element);
            }
        }
        // Check for potential issues
        if (interactiveElements.length === 0) {
            potentialIssues.push({
                id: `issue_${screen.id}_no_interactive`,
                type: 'ui_bug',
                severity: 'medium',
                description: 'No interactive elements found on screen',
                screenId: screen.id,
                timestamp: Date.now(),
                status: 'open',
            });
            recommendations.push('Consider adding navigation elements to this screen');
        }
        // Check for too many elements
        if (screen.elements.length > 50) {
            recommendations.push('Screen has many elements - consider simplifying layout');
        }
        // Check for overlapping elements
        const overlaps = this.findOverlappingElements(screen.elements);
        if (overlaps.length > 0) {
            potentialIssues.push({
                id: `issue_${screen.id}_overlaps`,
                type: 'ui_bug',
                severity: 'low',
                description: `Found ${overlaps.length} potentially overlapping elements`,
                screenId: screen.id,
                timestamp: Date.now(),
                status: 'open',
            });
            recommendations.push('Review element positioning for potential overlaps');
        }
        return {
            screenId: screen.id,
            screenName: screen.name,
            elementCount: screen.elements.length,
            interactiveElements,
            nonInteractiveElements,
            elementTypes,
            potentialIssues,
            recommendations,
        };
    }
    /**
     * Determine if an element is interactive
     */
    isInteractive(element) {
        const interactiveTypes = ['button', 'link', 'input', 'tab', 'menu', 'listItem', 'drawer'];
        return interactiveTypes.includes(element.type) || element.interactive;
    }
    /**
     * Find potentially overlapping elements
     */
    findOverlappingElements(elements) {
        const overlaps = [];
        for (let i = 0; i < elements.length; i++) {
            for (let j = i + 1; j < elements.length; j++) {
                const a = elements[i];
                const b = elements[j];
                if (this.elementsOverlap(a, b)) {
                    overlaps.push([a, b]);
                }
            }
        }
        return overlaps;
    }
    /**
     * Check if two elements overlap
     */
    elementsOverlap(a, b) {
        // Simple bounding box overlap check
        return !(a.x + a.width < b.x ||
            b.x + b.width < a.x ||
            a.y + a.height < b.y ||
            b.y + b.height < a.y);
    }
    /**
     * Compare two screens to detect changes
     */
    compareScreens(before, after) {
        const beforeIds = new Set(before.elements.map((e) => e.id));
        const afterIds = new Set(after.elements.map((e) => e.id));
        const addedElements = after.elements.filter((e) => !beforeIds.has(e.id));
        const removedElements = before.elements.filter((e) => !afterIds.has(e.id));
        const modifiedElements = [];
        for (const afterEl of after.elements) {
            const beforeEl = before.elements.find((e) => e.id === afterEl.id);
            if (beforeEl) {
                if (JSON.stringify(beforeEl) !== JSON.stringify(afterEl)) {
                    modifiedElements.push(afterEl);
                }
            }
        }
        return {
            changed: addedElements.length > 0 || removedElements.length > 0 || modifiedElements.length > 0,
            addedElements,
            removedElements,
            modifiedElements,
        };
    }
    /**
     * Calculate similarity between two screens
     */
    calculateSimilarity(screenA, screenB) {
        if (screenA.elements.length === 0 && screenB.elements.length === 0) {
            return 1.0;
        }
        const idsA = new Set(screenA.elements.map((e) => e.id));
        const idsB = new Set(screenB.elements.map((e) => e.id));
        const intersection = [...idsA].filter(id => idsB.has(id)).length;
        const union = new Set([...idsA, ...idsB]).size;
        return union > 0 ? intersection / union : 0;
    }
}
export { ScreenAnalyzer as Analyzer };
//# sourceMappingURL=analyzer.js.map