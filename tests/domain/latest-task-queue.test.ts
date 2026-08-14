import { describe, expect, it } from "vitest";

import { createLatestTaskQueue } from "@/lib/domain/latest-task-queue";

function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

describe("createLatestTaskQueue", () => {
  it("serializes writes and coalesces pending samples to the newest value", async () => {
    const firstWrite = deferred();
    const received: number[] = [];
    const queue = createLatestTaskQueue<number>(async (value) => {
      received.push(value);
      if (value === 10) await firstWrite.promise;
    });

    queue.enqueue(10);
    queue.enqueue(20);
    queue.enqueue(30);

    expect(received).toEqual([10]);
    firstWrite.resolve();
    await queue.whenIdle();

    expect(received).toEqual([10, 30]);
  });

  it("continues with the latest sample after a failed write", async () => {
    const firstWrite = deferred();
    const received: number[] = [];
    const queue = createLatestTaskQueue<number>(async (value) => {
      received.push(value);
      if (value === 1) {
        await firstWrite.promise;
        throw new Error("network failure");
      }
    });

    queue.enqueue(1);
    queue.enqueue(2);
    firstWrite.resolve();
    await queue.whenIdle();

    expect(received).toEqual([1, 2]);
  });
});
