/**
 * Represents the possible roles an AI agent can have in the DAO
 */
export type AgentRole = 'CEO' | 'CFO' | 'CTO' | 'CLO';

/**
 * Represents the base capabilities that all agents must implement
 */
export interface BaseAgent {
  id: string;
  role: AgentRole;
  name: string;
  capabilities: Set<AgentCapability>;
}

/**
 * Core capabilities that agents can possess
 */
export enum AgentCapability {
  // Governance
  PROPOSE = 'propose',
  VOTE = 'vote',
  EXECUTE = 'execute',
  
  // Communication
  SEND_MESSAGE = 'send_message',
  RECEIVE_MESSAGE = 'receive_message',
  
  // Decision Making
  ANALYZE = 'analyze',
  DECIDE = 'decide',
  
  // Role-specific
  MANAGE_TREASURY = 'manage_treasury',    // CFO
  MANAGE_TECHNOLOGY = 'manage_technology', // CTO
  MANAGE_STRATEGY = 'manage_strategy',     // CEO
  MANAGE_COMPLIANCE = 'manage_compliance'  // CLO
}

/**
 * Context provided to agents for decision making
 */
export interface DecisionContext {
  timestamp: Date;
  trigger: DecisionTrigger;
  relevantData: Record<string, unknown>;
  constraints: DecisionConstraints;
}

/**
 * What triggered the need for a decision
 */
export enum DecisionTrigger {
  MESSAGE_RECEIVED = 'message_received',
  PROPOSAL_CREATED = 'proposal_created',
  SCHEDULED_TASK = 'scheduled_task',
  MARKET_EVENT = 'market_event',
  SYSTEM_ALERT = 'system_alert'
}

/**
 * Constraints that must be considered in decision making
 */
export interface DecisionConstraints {
  timeLimit?: number;
  resourceLimits?: Record<string, number>;
  requiredApprovals?: number;
  riskTolerance: 'low' | 'medium' | 'high';
}

/**
 * The result of an agent's decision-making process
 */
export interface Decision {
  id: string;
  agentId: string;
  timestamp: Date;
  type: string;
  action: DecisionAction;
  rationale: string;
  confidence: number;
  impact: DecisionImpact;
}

/**
 * Represents an action that can be taken as a result of a decision
 */
export interface DecisionAction {
  type: string;
  parameters: Record<string, unknown>;
  priority: 'low' | 'medium' | 'high';
  executionDeadline?: Date;
}

/**
 * Represents the projected impact of a decision
 */
export interface DecisionImpact {
  financial?: {
    cost: number;
    projectedReturn: number;
    timeframe: string;
  };
  operational?: {
    complexity: 'low' | 'medium' | 'high';
    resourceRequirements: string[];
  };
  risk?: {
    level: 'low' | 'medium' | 'high';
    factors: string[];
  };
}

// Export everything
export * from './agent-factory';
export * from './agent-registry';
