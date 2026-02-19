// Global type extensions for AppLens SDK

declare global {
  interface Window {
    applensLastCommand?: {
      type: string;
      [key: string]: unknown;
    };
  }
}

export {};
