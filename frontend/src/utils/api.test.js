import { api } from './api';

describe('API request timeout', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    jest.useFakeTimers();
    global.fetch = jest.fn((url, options) => new Promise((resolve, reject) => {
      options.signal.addEventListener('abort', () => {
        const error = new Error('Aborted');
        error.name = 'AbortError';
        reject(error);
      }, { once: true });
    }));
  });

  afterEach(() => {
    jest.useRealTimers();
    global.fetch = originalFetch;
  });

  test('stops a stalled request instead of leaving the page loading forever', async () => {
    const pendingRequest = api.get('/slow-endpoint');
    const rejection = expect(pendingRequest).rejects.toThrow('The server took too long to respond');

    jest.advanceTimersByTime(10001);

    await rejection;
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });
});
