import WebSocket from 'ws';
import { Message, CommunicationEvent } from '@sadellari-dao/sdk/types/communication';

export interface WebSocketEvent {
  type: CommunicationEvent;
  payload: any;
  timestamp: Date;
}

export class NotificationServer {
  private wss: WebSocket.Server;
  private clients: Map<string, WebSocket> = new Map();

  constructor(port: number) {
    this.wss = new WebSocket.Server({ port });
    this.setupServer();
  }

  private setupServer(): void {
    this.wss.on('connection', (ws: WebSocket) => {
      const clientId = this.generateClientId();
      this.clients.set(clientId, ws);

      ws.on('message', (data: string) => {
        try {
          const message = JSON.parse(data);
          this.handleMessage(clientId, message);
        } catch (error) {
          this.sendError(ws, 'Invalid message format');
        }
      });

      ws.on('close', () => {
        this.clients.delete(clientId);
      });

      // Send welcome message
      this.sendToClient(ws, {
        type: CommunicationEvent.MESSAGE_RECEIVED,
        payload: {
          message: 'Connected to DAO notification server',
          clientId
        },
        timestamp: new Date()
      });
    });
  }

  private handleMessage(clientId: string, message: any): void {
    // Handle client messages (e.g., subscriptions, acknowledgments)
    console.log(`Received message from ${clientId}:`, message);
  }

  public broadcast(event: WebSocketEvent): void {
    const message = JSON.stringify(event);
    this.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
  }

  public sendToClient(client: WebSocket, event: WebSocketEvent): void {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(event));
    }
  }

  private sendError(client: WebSocket, message: string): void {
    this.sendToClient(client, {
      type: CommunicationEvent.CHANNEL_ERROR,
      payload: { error: message },
      timestamp: new Date()
    });
  }

  private generateClientId(): string {
    return `client-${Math.random().toString(36).substr(2, 9)}`;
  }

  public close(): void {
    this.wss.close();
  }
}
