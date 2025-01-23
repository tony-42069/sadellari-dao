import { Message } from '../../../types/communication';

export interface QueueConfig {
  maxRetries: number;
  retryDelay: number; // milliseconds
  maxConcurrent: number;
}

export interface QueuedMessage {
  message: Message;
  attempts: number;
  lastAttempt?: Date;
  error?: Error;
}

export class MessageQueue {
  private queue: Map<string, QueuedMessage> = new Map();
  private processing: Set<string> = new Set();
  private config: QueueConfig;

  constructor(config: Partial<QueueConfig> = {}) {
    this.config = {
      maxRetries: 3,
      retryDelay: 5000,
      maxConcurrent: 5,
      ...config
    };
  }

  async enqueue(message: Message): Promise<void> {
    this.queue.set(message.id, {
      message,
      attempts: 0
    });
    await this.processQueue();
  }

  async processQueue(): Promise<void> {
    if (this.processing.size >= this.config.maxConcurrent) {
      return;
    }

    for (const [id, queuedMessage] of this.queue.entries()) {
      if (this.processing.size >= this.config.maxConcurrent) {
        break;
      }

      if (this.processing.has(id)) {
        continue;
      }

      if (queuedMessage.lastAttempt) {
        const elapsed = Date.now() - queuedMessage.lastAttempt.getTime();
        if (elapsed < this.config.retryDelay) {
          continue;
        }
      }

      await this.processMessage(id, queuedMessage);
    }
  }

  private async processMessage(id: string, queuedMessage: QueuedMessage): Promise<void> {
    this.processing.add(id);

    try {
      // Actual message processing will be implemented by consumers
      await this.processHandler?.(queuedMessage.message);
      this.queue.delete(id);
    } catch (error) {
      queuedMessage.attempts++;
      queuedMessage.lastAttempt = new Date();
      queuedMessage.error = error as Error;

      if (queuedMessage.attempts >= this.config.maxRetries) {
        await this.handleFailedMessage(id, queuedMessage);
      }
    } finally {
      this.processing.delete(id);
      await this.processQueue();
    }
  }

  private async handleFailedMessage(id: string, queuedMessage: QueuedMessage): Promise<void> {
    // Remove from main queue
    this.queue.delete(id);

    // Notify error handler
    await this.errorHandler?.(queuedMessage);
  }

  // Handlers to be set by consumers
  processHandler?: (message: Message) => Promise<void>;
  errorHandler?: (queuedMessage: QueuedMessage) => Promise<void>;
}
