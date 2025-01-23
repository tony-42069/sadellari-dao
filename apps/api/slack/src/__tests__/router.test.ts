import { SlackMessageRouter } from '../../../../packages/sdk/src/internal/communication/router';
import { SlackMessage, Channel } from '../../../../packages/sdk/src/types/communication';

describe('SlackMessageRouter', () => {
  let router: SlackMessageRouter;

  beforeEach(() => {
    router = new SlackMessageRouter();
  });

  test('should route messages to channel handlers', async () => {
    const mockHandler = jest.fn();
    router.subscribe('slack', mockHandler);
    
    const testMessage: SlackMessage = {
      id: 'test-1',
      from: 'system',
      to: 'user123',
      content: 'test content',
      channel: 'slack',
      timestamp: new Date(),
      metadata: {
        priority: 'medium',
        threadId: 'T9876543',
        channelId: 'C1234567',
        reactions: []
      }
    };

    await router.send(testMessage);
    expect(mockHandler).toHaveBeenCalledWith(testMessage);
  });
});
