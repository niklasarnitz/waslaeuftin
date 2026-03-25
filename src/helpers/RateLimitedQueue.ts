import { sleep } from "./sleep";

export class RateLimitedQueue {
    private activeRequests = 0;
    private readonly maxConcurrent: number;
    private readonly minDelayMs: number;
    private lastRequestTime = 0;

    constructor(maxConcurrent: number = 3, minDelayMs: number = 334) {
        this.maxConcurrent = maxConcurrent;
        this.minDelayMs = minDelayMs; // ~3 requests per second
    }

    async run<T>(fn: () => Promise<T>): Promise<T> {
        while (this.activeRequests >= this.maxConcurrent) {
            await sleep(50);
        }

        this.activeRequests++;

        try {
            // Enforce minimum delay between requests
            const timeSinceLastRequest = Date.now() - this.lastRequestTime;
            if (timeSinceLastRequest < this.minDelayMs) {
                await sleep(this.minDelayMs - timeSinceLastRequest);
            }

            this.lastRequestTime = Date.now();
            return await fn();
        } finally {
            this.activeRequests--;
        }
    }
}
