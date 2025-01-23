import { MessageQueue, QueuedMessage } from '../index';
import { Message } from '../../../../types/communication';

describe('MessageQueue', () => {
  let queue: MessageQueue;
  let processHandler: jest.Mock;
  let errorHandler: jest.Mock;

  beforeEach(() => {
    processHandler = jest.fn();
    errorHandler = jest.fn();
    queue = new MessageQueue({
      maxRetries: 2,
      retryDelay: 100,
      maxConcurrent: 2
    });
    queue.processHandler = processHandler;
    queue.errorHandler = errorHandler;
  });

  test('should process messages successfully', async () => {
    const message: Message = {
      id: 'test-1',
      from: 'system',
      to: 'user',
      content: 'test',
      channel: 'internal',
      timestamp: new Date()
    };

    processHandler.mockResolvedValueOnce(undefined);
    await queue.enqueue(message);

    expect(processHandler).toHaveBeenCalledWith(message);
    expect(errorHandler).not.toHaveBeenCalled();
  });

  test('should retry failed messages', async () => {
    const message: Message = {
      id: 'test-2',
      from: 'system',
      to: 'user',
      content: 'test',
      channel: 'internal',
      timestamp: new Date()
    };

    const error = new Error('Processing failed');
    processHandler
      .mockRejectedValueOnce(error)
      .mockRejectedValueOnce(error)
      .mockResolvedValueOnce(undefined);

    await queue.enqueue(message);
    await new Promise(resolve => setTimeout(resolve, 300)); // Wait for retries

    expect(processHandler).toHaveBeenCalledTimes(3);
    expect(errorHandler).not.toHaveBeenCalled();
  });

  test('should handle permanently failed messages', async () => {
    const message: Message = {
      id: 'test-3',
      from: 'system',
      to: 'user',
      content: 'test',
      channel: 'internal',
      timestamp: new Date()
    };

    const error = new Error('Processing failed');
    processHandler.mockRejectedValue(error);

    await queue.enqueue(message);
    await new Promise(resolve => setTimeout(resolve, 300)); // Wait for retries

    expect(processHandler).toHaveBeenCalledTimes(2); // maxRetries
    expect(errorHandler).toHaveBeenCalledWith(expect.objectContaining({
      message,
      attempts: 2,
      error
    }));
  });

  test('should respect concurrent processing limit', async () => {
    const messages = Array.from({ length: 4 }, (_, i) => ({
      id: `test-${i}`,
      from: 'system',
      to: 'user',
      content: `test-${i}`,
      channel: 'internal' as const,
      timestamp: new Date()
    }));

    // Make each handler take some time
    processHandler.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));

    // Enqueue all messages
    await Promise.all(messages.map(msg => queue.enqueue(msg)));

    // Should only be processing maxConcurrent (2) messages at a time
    expect(processHandler).toHaveBeenCalledTimes(2);
  });
});
