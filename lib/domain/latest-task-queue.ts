export type LatestTaskQueue<T> = {
  enqueue: (value: T) => void;
  whenIdle: () => Promise<void>;
};

/**
 * Runs at most one asynchronous task at a time. While a task is in flight,
 * intermediate values are discarded and only the newest value is retained.
 * This is useful for telemetry where freshness matters more than replaying
 * every sample, such as reader scroll progress.
 */
export function createLatestTaskQueue<T>(worker: (value: T) => Promise<void>): LatestTaskQueue<T> {
  let queued: T | undefined;
  let hasQueuedValue = false;
  let running = false;
  let idleWaiters: Array<() => void> = [];

  const resolveIdle = () => {
    const waiters = idleWaiters;
    idleWaiters = [];
    for (const resolve of waiters) resolve();
  };

  const drain = async () => {
    while (hasQueuedValue) {
      const value = queued as T;
      queued = undefined;
      hasQueuedValue = false;

      try {
        await worker(value);
      } catch {
        // Progress telemetry is best effort. A failed sample must not prevent
        // a newer queued sample from being persisted.
      }
    }

    running = false;
    resolveIdle();
  };

  return {
    enqueue(value) {
      queued = value;
      hasQueuedValue = true;
      if (running) return;
      running = true;
      void drain();
    },
    whenIdle() {
      if (!running && !hasQueuedValue) return Promise.resolve();
      return new Promise<void>((resolve) => idleWaiters.push(resolve));
    },
  };
}
