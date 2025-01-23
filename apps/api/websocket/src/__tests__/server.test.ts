import WebSocket from 'ws';
import { NotificationServer, WebSocketEvent } from '../server';
import { CommunicationEvent } from '@sadellari-dao/sdk/types/communication';

describe('NotificationServer', () => {
  let server: NotificationServer;
  let client: WebSocket;
  const TEST_PORT = 8888;

  beforeEach(done => {
    server = new NotificationServer(TEST_PORT);
    client = new WebSocket(`ws://localhost:${TEST_PORT}`);
    client.on('open', () => done());
  });

  afterEach(done => {
    client.close();
    server.close();
    done();
  });

  test('should send welcome message on connection', done => {
    client.on('message', (data: string) => {
      const event: WebSocketEvent = JSON.parse(data);
      expect(event.type).toBe(CommunicationEvent.MESSAGE_RECEIVED);
      expect(event.payload.message).toBe('Connected to DAO notification server');
      expect(event.payload.clientId).toBeDefined();
      done();
    });
  });

  test('should broadcast messages to all clients', done => {
    const testEvent: WebSocketEvent = {
      type: CommunicationEvent.MESSAGE_SENT,
      payload: { content: 'Test broadcast' },
      timestamp: new Date()
    };

    // Create a second client
    const client2 = new WebSocket(`ws://localhost:${TEST_PORT}`);
    let receivedCount = 0;

    const messageHandler = (data: string) => {
      const event: WebSocketEvent = JSON.parse(data);
      if (event.type === CommunicationEvent.MESSAGE_SENT) {
        expect(event.payload.content).toBe('Test broadcast');
        receivedCount++;
        if (receivedCount === 2) {
          client2.close();
          done();
        }
      }
    };

    client.on('message', messageHandler);
    client2.on('message', messageHandler);

    client2.on('open', () => {
      // Wait for both clients to be ready
      setTimeout(() => {
        server.broadcast(testEvent);
      }, 100);
    });
  });

  test('should handle invalid messages', done => {
    client.on('message', (data: string) => {
      const event: WebSocketEvent = JSON.parse(data);
      if (event.type === CommunicationEvent.CHANNEL_ERROR) {
        expect(event.payload.error).toBe('Invalid message format');
        done();
      }
    });

    // Send invalid JSON
    client.send('invalid json');
  });

  test('should remove client on disconnect', done => {
    client.on('message', (data: string) => {
      const event: WebSocketEvent = JSON.parse(data);
      if (event.type === CommunicationEvent.MESSAGE_RECEIVED) {
        // Get initial client count
        const initialCount = (server as any).clients.size;
        
        // Create and immediately close a new client
        const tempClient = new WebSocket(`ws://localhost:${TEST_PORT}`);
        tempClient.on('open', () => {
          expect((server as any).clients.size).toBe(initialCount + 1);
          tempClient.close();
          
          // Wait for cleanup
          setTimeout(() => {
            expect((server as any).clients.size).toBe(initialCount);
            done();
          }, 100);
        });
      }
    });
  });
});
