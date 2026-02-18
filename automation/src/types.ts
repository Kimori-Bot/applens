/**
 * TypeScript Types for AppLens Automation Engine
 */

export interface ScreenState {
  id: string;
  name: string;
  elements: UIElement[];
  screenshot?: string;
  timestamp: number;
  hash?: string;
}

export interface UIElement {
  id: string;
  type: 'button' | 'link' | 'text' | 'input' | 'image' | 'listItem' | 'header' | 'tab' | 'menu' | 'drawer' | 'other';
  label?: string;
  text?: string;
  x: number;
  y: number;
  width: number;
  height: number;
  visible: boolean;
  enabled: boolean;
  interactive: boolean;
  screenId: string;
}

export interface Action {
  id: string;
  type: 'tap' | 'swipe' | 'input' | 'back' | 'wait';
  target?: UIElement;
  x?: number;
  y?: number;
  direction?: 'up' | 'down' | 'left' | 'right';
  text?: string;
  delay?: number;
  timestamp: number;
}

export interface ActionResult {
  success: boolean;
  action: Action;
  newScreen?: ScreenState;
  error?: string;
  duration: number;
}

export interface ExplorationStrategy {
  type: 'random' | 'bfs' | 'dfs' | 'smart';
  weight?: number;
}

export interface StrategyConfig {
  randomExploration: {
    enabled: boolean;
    weight: number;
    maxConsecutiveRandom: number;
  };
  smartExploration: {
    enabled: boolean;
    weight: number;
    preferUnvisited: boolean;
    prioritizeInteractive: boolean;
  };
  depthFirst: {
    enabled: boolean;
    maxDepth: number;
  };
  breadthFirst: {
    enabled: boolean;
    maxScreens: number;
  };
}

export interface AutomationConfig {
  strategy: StrategyConfig;
  actionWeights: Record<string, number>;
  elementPriorities: Record<string, number>;
  filters: {
    excludeElements: string[];
    minElementSize: number;
    requireVisible: boolean;
    requireEnabled: boolean;
  };
  limits: {
    maxActionsPerSession: number;
    maxTimePerSession: number;
    maxRetries: number;
    actionDelay: number;
    stateStabilityCheck: boolean;
    maxSameStateCount: number;
  };
  logging: {
    enabled: boolean;
    level: 'debug' | 'info' | 'warn' | 'error';
    logActions: boolean;
    logDecisions: boolean;
    logErrors: boolean;
  };
}

export interface NavigationNode {
  screenId: string;
  screenName: string;
  elements: UIElement[];
  actions: Action[];
  transitions: Map<string, string>; // actionId -> nextScreenId
}

export interface NavigationGraph {
  nodes: Map<string, NavigationNode>;
  startNode?: string;
}

export interface ExplorationReport {
  sessionId: string;
  startTime: Date;
  endTime: Date;
  totalActions: number;
  uniqueScreens: number;
  uniqueElements: number;
  issues: Issue[];
  graph: NavigationGraph;
  coverage: {
    screensFound: number;
    elementsFound: number;
    estimatedCoverage: number;
  };
}

export interface Issue {
  id: string;
  type: 'crash' | 'error' | 'ui_bug' | 'performance' | 'review_mark';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  screenId?: string;
  elementId?: string;
  timestamp: number;
  screenshot?: string;
  status: 'open' | 'resolved' | 'ignored';
}

export interface AutomationSession {
  id: string;
  appId: string;
  status: 'idle' | 'running' | 'paused' | 'completed' | 'stopped';
  config: AutomationConfig;
  startTime: Date;
  endTime?: Date;
  currentScreen?: ScreenState;
  actions: Action[];
  results: ActionResult[];
  issues: Issue[];
}

export interface Command {
  id: string;
  sessionId: string;
  type: 'tap' | 'swipe' | 'input' | 'back' | 'wait';
  x?: number;
  y?: number;
  direction?: string;
  text?: string;
  elementId?: string;
  delay?: number;
}

export interface CommandResult {
  commandId: string;
  success: boolean;
  error?: string;
  newScreen?: ScreenState;
  elements?: UIElement[];
}

export type EventType = 
  | 'screen:visited'
  | 'action:executed'
  | 'issue:detected'
  | 'session:started'
  | 'session:stopped'
  | 'session:completed'
  | 'strategy:changed'
  | 'error';

export interface EventData {
  screen?: ScreenState;
  action?: Action;
  result?: ActionResult;
  issue?: Issue;
  session?: AutomationSession;
  error?: Error;
}
