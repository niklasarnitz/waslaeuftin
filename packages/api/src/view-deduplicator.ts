export type TrackedViewType = "cinema" | "city";

export class ViewDeduplicator {
  readonly #lastViews = new Map<string, number>();
  #lastCleanup = 0;

  constructor(
    readonly windowMs: number,
    readonly cleanupIntervalMs = Math.min(windowMs, 60 * 1000),
  ) {}

  shouldTrack(
    hashedIp: string | undefined,
    type: TrackedViewType,
    slug: string,
    now = Date.now(),
  ) {
    this.#cleanup(now);

    if (!hashedIp) {
      return true;
    }

    const key = `${hashedIp}:${type}:${slug}`;
    const lastView = this.#lastViews.get(key);

    if (lastView !== undefined && now - lastView < this.windowMs) {
      return false;
    }

    this.#lastViews.set(key, now);
    return true;
  }

  #cleanup(now: number) {
    if (now - this.#lastCleanup < this.cleanupIntervalMs) {
      return;
    }

    this.#lastCleanup = now;

    for (const [key, viewedAt] of this.#lastViews) {
      if (now - viewedAt >= this.windowMs) {
        this.#lastViews.delete(key);
      }
    }
  }
}
