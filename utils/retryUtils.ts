export interface RetryOptions {
  maxRetries?: number;
  baseDelay?: number;
  maxDelay?: number;
  shouldRetry?: (error: Error) => boolean;
}

const DEFAULT_OPTIONS: Required<RetryOptions> = {
  maxRetries: 3,
  baseDelay: 1000, // 1 second
  maxDelay: 10000, // 10 seconds
  shouldRetry: (error: Error) => {
    // Retry on network errors but not on authentication or client errors
    return (
      error.name === 'TypeError' ||
      error.name === 'AbortError' ||
      (error.message ? error.message.includes('5') : false)
    );
  },
};

export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  let lastError: Error;

  for (let attempt = 0; attempt <= opts.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;

      // Don't retry on the last attempt or if we shouldn't retry this error
      if (attempt === opts.maxRetries || !opts.shouldRetry(lastError)) {
        throw lastError;
      }

      // Calculate delay with exponential backoff
      const delay = Math.min(
        opts.baseDelay * Math.pow(2, attempt),
        opts.maxDelay
      );

      console.log(
        `Retry attempt ${attempt + 1}/${opts.maxRetries} after ${delay}ms:`,
        lastError.message
      );

      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError!;
}
