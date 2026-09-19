import type { ShareStore } from "./store";
import { MemoryShareStore } from "./memory";
import { RedisShareStore } from "./redis";

let store: ShareStore | undefined;

/**
 * Picks the backing store from the environment, lazily so `next build`
 * never needs the Redis credentials. Redis when its env vars are present,
 * otherwise memory (with a loud warning outside tests).
 */
export function getStore(): ShareStore {
  if (store) return store;
  const hasRedis =
    (process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL) &&
    (process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN);
  if (process.env.SHARE_STORE !== "memory" && hasRedis) {
    store = RedisShareStore.fromEnv();
  } else {
    if (process.env.NODE_ENV === "production" && !process.env.VITEST) {
      console.warn(
        "[share] No Redis credentials found — using the in-memory store. Documents will not persist.",
      );
    }
    store = new MemoryShareStore();
  }
  return store;
}

export * from "./store";
export * from "./ids";
export * from "./urls";
