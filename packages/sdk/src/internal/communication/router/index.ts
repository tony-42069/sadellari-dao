import { Message, MessageHandler, MessageRouter, Channel } from '../../../types/communication';

export class SlackMessageRouter implements MessageRouter {
  private handlers: Map<Channel, Set<MessageHandler>> = new Map();

  async send(message: Message): Promise<void> {
    if (message.channel !== 'slack') {
      throw new Error('SlackMessageRouter can only handle slack messages');
    }
    const handlers = this.handlers.get(message.channel) || new Set();
    await Promise.all([...handlers].map(handler => handler(message)));
  }

  subscribe(channel: Channel, handler: MessageHandler): void {
    if (!this.handlers.has(channel)) {
      this.handlers.set(channel, new Set());
    }
    this.handlers.get(channel)?.add(handler);
  }

  unsubscribe(channel: Channel, handler: MessageHandler): void {
    this.handlers.get(channel)?.delete(handler);
  }

  async broadcast(message: Message): Promise<void> {
    await this.send({ ...message, to: null });
  }
}

export class EmailMessageRouter implements MessageRouter {
  private handlers: Map<Channel, Set<MessageHandler>> = new Map();

  async send(message: Message): Promise<void> {
    if (message.channel !== 'email') {
      throw new Error('EmailMessageRouter can only handle email messages');
    }
    const handlers = this.handlers.get(message.channel) || new Set();
    await Promise.all([...handlers].map(handler => handler(message)));
  }

  subscribe(channel: Channel, handler: MessageHandler): void {
    if (!this.handlers.has(channel)) {
      this.handlers.set(channel, new Set());
    }
    this.handlers.get(channel)?.add(handler);
  }

  unsubscribe(channel: Channel, handler: MessageHandler): void {
    this.handlers.get(channel)?.delete(handler);
  }

  async broadcast(message: Message): Promise<void> {
    await this.send({ ...message, to: null });
  }
}

export class CompositeMessageRouter implements MessageRouter {
  private routers: Map<Channel, MessageRouter> = new Map();

  registerRouter(channel: Channel, router: MessageRouter): void {
    this.routers.set(channel, router);
  }

  async send(message: Message): Promise<void> {
    const router = this.routers.get(message.channel);
    if (!router) {
      throw new Error(`No router registered for channel: ${message.channel}`);
    }
    await router.send(message);
  }

  subscribe(channel: Channel, handler: MessageHandler): void {
    const router = this.routers.get(channel);
    if (router) {
      router.subscribe(channel, handler);
    }
  }

  unsubscribe(channel: Channel, handler: MessageHandler): void {
    const router = this.routers.get(channel);
    if (router) {
      router.unsubscribe(channel, handler);
    }
  }

  async broadcast(message: Message): Promise<void> {
    const router = this.routers.get(message.channel);
    if (router) {
      await router.broadcast(message);
    }
  }
}
