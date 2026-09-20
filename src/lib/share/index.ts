import type { ShareStore } from "./store";
import { MemoryShareStore } from "./memory";
import { RedisShareStore } from "./redis";

// Cached on globalThis rather than in a module local: the dev server bundles
// route handlers and pages separately, so a plain module singleton hands the
// reader page a *different* (empty) in-memory store from the one the publish
// route wrote to, and every locally published document 404s in the reader.
const CACHE = Symbol.for("cartercrouch.share.store");
const cache = globalThis as typeof globalThis & { [CACHE]?: ShareStore };

/**
 * Picks the backing store from the environment, lazily so `next build`
 * never needs the Redis credentials. Redis when its env vars are present,
 * otherwise memory (with a loud warning outside tests).
 */
export function getStore(): ShareStore {
  const cached = cache[CACHE];
  if (cached) return cached;
  let store: ShareStore;
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
  cache[CACHE] = store;
  return store;
}

export * from "./store";
export * from "./ids";
export * from "./urls";
