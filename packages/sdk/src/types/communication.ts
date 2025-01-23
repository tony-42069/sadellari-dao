import { BaseAgent } from './agent';

/**
 * Supported communication channels
 */
export type Channel = 'slack' | 'email' | 'internal';

/**
 * Base message interface
 */
export interface Message {
  id: string;
  from: BaseAgent | string; // Can be agent or external source
  to: BaseAgent | string | null; // null for broadcast
  content: string;
  channel: Channel;
  timestamp: Date;
  metadata?: MessageMetadata;
}

/**
 * Additional message context
 */
export interface MessageMetadata {
  priority?: 'low' | 'medium' | 'high';
  category?: string;
  threadId?: string;
  replyTo?: string;
  attachments?: Attachment[];
  tags?: string[];
}

/**
 * Message attachment
 */
export interface Attachment {
  id: string;
  type: string;
  url?: string;
  content?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Channel-specific message formats
 */
export interface SlackMessage extends Message {
  channel: 'slack';
  metadata: MessageMetadata & {
    threadId: string;
    reactions?: string[];
    channelId: string;
  };
}

export interface EmailMessage extends Message {
  channel: 'email';
  metadata: MessageMetadata & {
    subject: string;
    cc?: string[];
    bcc?: string[];
    templateId?: string;
    templateData?: Record<string, string>;
    attachments?: Array<{
      filename: string;
      content: string;
      contentType: string;
    }>;
  };
   * Send a message through the appropriate channel
   */
  send(message: Message): Promise<void>;

  /**
   * Subscribe to messages on a specific channel
   */
  subscribe(channel: Channel, handler: MessageHandler): void;

  /**
   * Unsubscribe from a channel
   */
  unsubscribe(channel: Channel, handler: MessageHandler): void;

  /**
   * Broadcast a message to all subscribers
   */
  broadcast(message: Message): Promise<void>;
}

/**
 * Message handler type
 */
export type MessageHandler = (message: Message) => Promise<void>;

/**
 * Channel configuration
 */
export interface ChannelConfig {
  enabled: boolean;
  credentials?: Record<string, string>;
  settings?: Record<string, unknown>;
  rateLimits?: {
    messagesPerMinute?: number;
    messagesPerHour?: number;
  };
}

/**
 * Communication system events
 */
export enum CommunicationEvent {
  MESSAGE_SENT = 'message_sent',
  MESSAGE_RECEIVED = 'message_received',
  CHANNEL_ERROR = 'channel_error',
  RATE_LIMIT_REACHED = 'rate_limit_reached'
}

// Note: Actual implementation will be in internal/communication/
