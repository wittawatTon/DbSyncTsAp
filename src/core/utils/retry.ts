const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 2000; // 2 วินาที

/**
 * Retry async function with configurable attempts and delay.
 * @param fn - Async function to retry
 * @param maxRetries - Maximum retry attempts
 * @param delay - Delay between retries (ms)
 */
const retry = async <T>(
  fn: () => Promise<T>,
  maxRetries: number = MAX_RETRIES,
  delay: number = RETRY_DELAY_MS
): Promise<T> => {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      if (attempt === maxRetries) throw err;
      console.warn(`Retry ${attempt}/${maxRetries} failed. Retrying in ${delay}ms...`);
      await new Promise((res) => setTimeout(res, delay));
    }
  }
  // Should never reach here, but TypeScript needs a return
  throw new Error('Retry attempts exhausted');
};

export default retry;