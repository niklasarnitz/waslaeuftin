export const tryCatchRetry = async <T>(
  fn: () => Promise<T>,
  retryCount = 3,
  retryDelay = 1000,
): Promise<T> => {
  try {
    return await fn();
  } catch (error) {
    if (retryCount > 0) {
      await new Promise((resolve) => setTimeout(resolve, retryDelay));

      return await tryCatchRetry(fn, retryCount - 1, retryDelay);
    }

    throw error;
  }
};
