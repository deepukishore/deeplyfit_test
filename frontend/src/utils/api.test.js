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

  test('sends a new variation and current meals when refreshing suggestions', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ suggestions: [] }),
    });

    await api.getMealSuggestions('2026-07-29', {
      variant: 2,
      exclude: ['Protein shake', 'Greek yogurt bowl'],
    });

    const [url] = global.fetch.mock.calls[0];
    expect(url).toContain('/food/suggestions/2026-07-29?');
    expect(url).toContain('variant=2');
    expect(url).toContain('exclude=Protein+shake%7CGreek+yogurt+bowl');
  });
});
