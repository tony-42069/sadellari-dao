import { AgentRole, BaseAgent } from './agent';

/**
 * Public interface for agent creation
 */
export interface AgentFactory {
  /**
   * Creates a new agent with the specified role
   */
  createAgent(role: AgentRole, config: AgentConfig): Promise<BaseAgent>;
}

/**
 * Configuration options for creating a new agent
 */
export interface AgentConfig {
  name: string;
  description?: string;
  customCapabilities?: string[];
  settings?: Record<string, unknown>;
}

// Note: Actual implementation will be in internal/agent-factory.ts
