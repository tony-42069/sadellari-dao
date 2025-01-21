import { AgentRole, BaseAgent } from './agent';

/**
 * Public interface for managing agent instances
 */
export interface AgentRegistry {
  /**
   * Register a new agent in the system
   */
  registerAgent(agent: BaseAgent): Promise<void>;

  /**
   * Get an agent by its ID
   */
  getAgent(id: string): Promise<BaseAgent | null>;

  /**
   * Get an agent by its role
   */
  getAgentByRole(role: AgentRole): Promise<BaseAgent | null>;

  /**
   * Get all registered agents
   */
  getAllAgents(): Promise<BaseAgent[]>;

  /**
   * Remove an agent from the registry
   */
  removeAgent(id: string): Promise<void>;

  /**
   * Check if an agent exists
   */
  hasAgent(id: string): Promise<boolean>;

  /**
   * Get agents with specific capabilities
   */
  getAgentsByCapability(capability: string): Promise<BaseAgent[]>;
}

/**
 * Events emitted by the registry
 */
export enum AgentRegistryEvent {
  AGENT_REGISTERED = 'agent_registered',
  AGENT_REMOVED = 'agent_removed',
  AGENT_UPDATED = 'agent_updated'
}

/**
 * Listener for registry events
 */
export interface AgentRegistryListener {
  onAgentRegistered?(agent: BaseAgent): void;
  onAgentRemoved?(agentId: string): void;
  onAgentUpdated?(agent: BaseAgent): void;
}

// Note: Actual implementation will be in internal/agent-registry.ts
