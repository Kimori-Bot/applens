/**
 * Navigation Graph - Manages the navigation structure between screens
 */
export class NavigationGraphManager {
    constructor() {
        this.graph = {
            nodes: new Map(),
        };
    }
    /**
     * Add a node (screen) to the graph
     */
    addNode(screen) {
        if (this.graph.nodes.has(screen.id)) {
            return; // Node already exists
        }
        const node = {
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
    addTransition(fromScreenId, action, toScreenId) {
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
    getNode(screenId) {
        return this.graph.nodes.get(screenId);
    }
    /**
     * Get all nodes
     */
    getAllNodes() {
        return Array.from(this.graph.nodes.values());
    }
    /**
     * Get outgoing transitions from a screen
     */
    getOutgoingTransitions(screenId) {
        const node = this.graph.nodes.get(screenId);
        return node?.transitions;
    }
    /**
     * Get incoming transitions to a screen
     */
    getIncomingTransitions(screenId) {
        const incoming = [];
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
    findReachableScreens(screenId) {
        const visited = new Set();
        const queue = [screenId];
        const reachable = [];
        while (queue.length > 0) {
            const currentId = queue.shift();
            if (visited.has(currentId))
                continue;
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
    findPaths(fromScreenId, toScreenId) {
        const paths = [];
        const visited = new Set();
        const dfs = (currentId, path) => {
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
    getStats() {
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
    toJSON() {
        const nodes = [];
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
    setStartNode(screenId) {
        if (this.graph.nodes.has(screenId)) {
            this.graph.startNode = screenId;
        }
    }
    /**
     * Get the start node
     */
    getStartNode() {
        return this.graph.startNode;
    }
    /**
     * Clear the graph
     */
    clear() {
        this.graph = {
            nodes: new Map(),
            startNode: undefined,
        };
    }
    /**
     * Get the raw graph
     */
    getGraph() {
        return this.graph;
    }
}
export { NavigationGraphManager as GraphManager };
//# sourceMappingURL=graph.js.map