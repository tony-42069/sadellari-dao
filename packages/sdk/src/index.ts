/**
 * Sadellari DAO SDK
 * Public interfaces and types for interacting with the DAO
 */

// Agent System
export * from './types/agent';
export * from './types/agent-factory';
export * from './types/agent-registry';

// Communication System
export * from './types/communication';

// Version information
export const SDK_VERSION = '0.1.0';

/**
 * SDK Configuration options
 */
export interface SadellarSDKConfig {
  environment: 'development' | 'staging' | 'production';
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  apiEndpoint?: string;
  defaultTimeout?: number;
}

/**
 * Initialize the SDK with configuration
 * Note: Implementation will be in internal/sdk.ts
 */
export async function initializeSDK(config: SadellarSDKConfig): Promise<void> {
  // This is just the public interface
  // Actual implementation will be in internal/sdk.ts
  throw new Error('SDK implementation not loaded');
}

/**
 * Get the current SDK instance
 * Note: Implementation will be in internal/sdk.ts
 */
export function getSDK(): unknown {
  // This is just the public interface
  // Actual implementation will be in internal/sdk.ts
  throw new Error('SDK implementation not loaded');
}

// Export utility types
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type Awaitable<T> = T | Promise<T>;

// Note: The actual SDK implementation will be in the internal directory
// This file only exports the public interfaces and types
