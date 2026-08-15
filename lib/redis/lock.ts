import { randomUUID } from "node:crypto";

import { runRedisCommand } from "@/lib/redis/client";

const RELEASE_LOCK_SCRIPT = `
if redis.call('get', KEYS[1]) == ARGV[1] then
  return redis.call('del', KEYS[1])
end
return 0
`;

export type DistributedLock = { key: string; token: string };

export async function acquireDistributedLock(key: string, ttlMs = 3_000): Promise<DistributedLock | null> {
  const token = randomUUID();
  const result = await runRedisCommand("lock-acquire", (client) =>
    client.set(key, token, { NX: true, PX: ttlMs }),
  );
  return result === "OK" ? { key, token } : null;
}

export async function releaseDistributedLock(lock: DistributedLock) {
  await runRedisCommand("lock-release", (client) =>
    client.eval(RELEASE_LOCK_SCRIPT, { keys: [lock.key], arguments: [lock.token] }),
  );
}
