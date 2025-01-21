import { Message, SlackMessage } from '@sadellari-dao/sdk/types/communication';
import { BaseAgent } from '@sadellari-dao/sdk/types/agent';
import { z } from 'zod';

/**
 * Slack-specific configuration schema
 */
export const SlackConfigSchema = z.object({
  appToken: z.string().min(1),
  botToken: z.string().min(1),
  signingSecret: z.string().min(1),
  defaultChannel: z.string().optional(),
  allowedChannels: z.array(z.string()).optional(),
  messageRetention: z.number().min(1).max(30).default(7),
  rateLimits: z.object({
    messagesPerMinute: z.number().min(1).max(100).default(30),
    messagesPerHour: z.number().min(1).max(1000).default(300)
  }).optional()
});

export type SlackConfig = z.infer<typeof SlackConfigSchema>;

/**
 * Slack command structure
 */
export interface SlackCommand {
  name: string;
  description: string;
  handler: SlackCommandHandler;
  options?: {
    requiresAuth?: boolean;
    allowedRoles?: string[];
    rateLimit?: number;
  };
}

export type SlackCommandHandler = (
  params: SlackCommandParams
) => Promise<SlackCommandResponse>;

export interface SlackCommandParams {
  command: string;
  text: string;
  userId: string;
  channelId: string;
  threadTs?: string;
  responseUrl: string;
  agent?: BaseAgent;
}

export interface SlackCommandResponse {
  text: string;
  blocks?: any[];
  threadTs?: string;
  ephemeral?: boolean;
}

/**
 * Slack event handling
 */
export interface SlackEventHandler {
  type: string;
  handler: (event: any) => Promise<void>;
  options?: {
    filterBot?: boolean;
    requireThread?: boolean;
  };
}

/**
 * Message transformation
 */
export interface MessageTransformer {
  toSlack: (message: Message) => Promise<SlackMessage>;
  fromSlack: (event: any) => Promise<Message>;
}

/**
 * Slack service interface
 */
export interface SlackService {
  /**
   * Initialize the Slack service
   */
  initialize(config: SlackConfig): Promise<void>;

  /**
   * Register a command handler
   */
  registerCommand(command: SlackCommand): void;

  /**
   * Register an event handler
   */
  registerEventHandler(handler: SlackEventHandler): void;

  /**
   * Send a message to Slack
   */
  sendMessage(message: Message): Promise<void>;

  /**
   * Update a message in Slack
   */
  updateMessage(message: SlackMessage): Promise<void>;

  /**
   * Add a reaction to a message
   */
  addReaction(messageTs: string, reaction: string): Promise<void>;

  /**
   * Get thread replies
   */
  getThreadReplies(threadTs: string): Promise<Message[]>;

  /**
   * Health check
   */
  healthCheck(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    details: Record<string, unknown>;
  }>;
}

// Export event type constants
export const SlackEventTypes = {
  MESSAGE: 'message',
  REACTION_ADDED: 'reaction_added',
  APP_MENTION: 'app_mention',
  COMMAND: 'command'
} as const;

// Export command constants
export const SlackCommands = {
  ASK: '/ask',
  PROPOSE: '/propose',
  STATUS: '/status',
  HELP: '/help'
} as const;

// Note: Implementation details will be in internal/
