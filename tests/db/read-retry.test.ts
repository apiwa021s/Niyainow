import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { retryDatabaseRead } from "@/lib/db/read-retry";

const mocks = vi.hoisted(() => ({ warn: vi.fn() }));
vi.mock("@/lib/logger", () => ({ logger: { child: () => ({ warn: mocks.warn }) } }));

function connectionError(code: string) {
  return Object.assign(new Error("Database connection failed"), { code });
}

beforeEach(() => { vi.useFakeTimers(); vi.clearAllMocks(); });
afterEach(() => { vi.useRealTimers(); });

describe("bounded database read retry", () => {
  it("returns a healthy read immediately without scheduling a retry", async () => {
    const read = vi.fn().mockResolvedValue(["banner"]);
    await expect(retryDatabaseRead(read, "public-banners")).resolves.toEqual(["banner"]);
    expect(read).toHaveBeenCalledOnce();
    expect(vi.getTimerCount()).toBe(0);
    expect(mocks.warn).not.toHaveBeenCalled();
  });

  it.each(["CONNECT_TIMEOUT", "CONNECTION_CLOSED", "ECONNRESET", "ETIMEDOUT", "EPIPE", "EAI_AGAIN"])("retries one read after nested %s", async (code) => {
    const error = new Error("Failed query", { cause: new Error("Driver wrapper", { cause: connectionError(code) }) });
    const read = vi.fn().mockRejectedValueOnce(error).mockResolvedValueOnce(["recovered banner"]);
    const result = retryDatabaseRead(read, "public-banners");
    await vi.advanceTimersByTimeAsync(249);
    expect(read).toHaveBeenCalledOnce();
    await vi.advanceTimersByTimeAsync(1);
    await expect(result).resolves.toEqual(["recovered banner"]);
    expect(read).toHaveBeenCalledTimes(2);
    expect(mocks.warn).toHaveBeenCalledWith(expect.any(String), { operation: "public-banners", errorCode: code, retryDelayMs: 250 });
  });

  it("propagates the second failure without returning a cacheable fallback or trying again", async () => {
    const finalError = new Error("Still disconnected", { cause: connectionError("CONNECT_TIMEOUT") });
    const read = vi.fn().mockRejectedValueOnce(connectionError("CONNECT_TIMEOUT")).mockRejectedValueOnce(finalError);
    const result = retryDatabaseRead(read, "public-banners");
    const rejection = expect(result).rejects.toBe(finalError);
    await vi.runAllTimersAsync();
    await rejection;
    expect(read).toHaveBeenCalledTimes(2);
    expect(vi.getTimerCount()).toBe(0);
  });

  it.each(["42P01", "42601", "28P01", "42501", "CONNECTION_ENDED", "CONNECTION_DESTROYED"])("does not retry a SQL, authentication or shutdown error (%s)", async (code) => {
    const error = new Error("Failed query", { cause: connectionError(code) });
    const read = vi.fn().mockRejectedValue(error);
    await expect(retryDatabaseRead(read, "public-banners")).rejects.toBe(error);
    expect(read).toHaveBeenCalledOnce();
    expect(vi.getTimerCount()).toBe(0);
    expect(mocks.warn).not.toHaveBeenCalled();
  });

  it("does not classify an error by its message", async () => {
    const error = new Error("CONNECT_TIMEOUT appears in a SQL value");
    const read = vi.fn().mockRejectedValue(error);
    await expect(retryDatabaseRead(read, "public-banners")).rejects.toBe(error);
    expect(read).toHaveBeenCalledOnce();
  });

  it("handles cyclic causes without hanging or retrying", async () => {
    const error: { cause?: unknown } = {};
    error.cause = error;
    const read = vi.fn().mockRejectedValue(error);
    await expect(retryDatabaseRead(read, "public-banners")).rejects.toBe(error);
    expect(read).toHaveBeenCalledOnce();
  });

  it("retries a synchronous startup throw but lets a subsequent SQL error propagate", async () => {
    const sqlError = connectionError("42P01");
    const read = vi.fn().mockImplementationOnce(() => { throw connectionError("CONNECT_TIMEOUT"); }).mockRejectedValueOnce(sqlError);
    const result = retryDatabaseRead(read, "public-banners");
    const rejection = expect(result).rejects.toBe(sqlError);
    await vi.runAllTimersAsync();
    await rejection;
    expect(read).toHaveBeenCalledTimes(2);
  });
});
