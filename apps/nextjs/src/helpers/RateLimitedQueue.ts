import { sleep } from "@waslaeuftin/helpers/sleep";

export class RateLimitedQueue {
  private activeRequests = 0;
  private readonly maxConcurrent: number;
  private readonly minDelayMs: number;
  private expectedNextRequestTime = 0;

  constructor(maxConcurrent: number = 3, minDelayMs: number = 334) {
    this.maxConcurrent = maxConcurrent;
    this.minDelayMs = minDelayMs; // ~3 requests per second
  }

  async run<T>(fn: () => Promise<T>): Promise<T> {
    while (this.activeRequests >= this.maxConcurrent) {
      await sleep(50);
    }

    this.activeRequests++;

    // Enforce minimum delay between requests atomically
    const now = Date.now();
    const targetTime = Math.max(now, this.expectedNextRequestTime);
    this.expectedNextRequestTime = targetTime + this.minDelayMs;

    const delay = targetTime - now;
    if (delay > 0) {
      await sleep(delay);
    }

    try {
      return await fn();
    } finally {
      this.activeRequests--;
    }
  }
}
