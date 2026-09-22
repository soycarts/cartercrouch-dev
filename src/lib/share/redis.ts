import { Redis } from "@upstash/redis";
import type { ShareStore, SharedDocument, SharedDocumentSummary } from "./store";

// Upstash Redis, provisioned through the Vercel Marketplace. One JSON value
// per document under share:doc:<id>, plus a set of IDs so the owner page can
// list what has been published. Nothing here is reachable without the
// REST token, which only ever lives server-side.
const DOC_PREFIX = "share:doc:";
const INDEX_KEY = "share:ids";

/** Archived drafts hang off the document's own key: share:doc:<id>:v:<slug>. */
function versionKey(id: string, slug: string): string {
  return `${DOC_PREFIX}${id}:v:${slug}`;
}

export class RedisShareStore implements ShareStore {
  constructor(private readonly redis: Redis) {}

  static fromEnv() {
    return new RedisShareStore(
      new Redis({
        url: process.env.KV_REST_API_URL ?? process.env.UPSTASH_REDIS_REST_URL,
        token:
          process.env.KV_REST_API_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN,
      }),
    );
  }

  async get(id: string) {
    return (await this.redis.get<SharedDocument>(DOC_PREFIX + id)) ?? null;
  }

  async put(doc: SharedDocument) {
    await Promise.all([
      this.redis.set(DOC_PREFIX + doc.id, doc),
      this.redis.sadd(INDEX_KEY, doc.id),
    ]);
  }

  async getVersion(id: string, slug: string) {
    return (await this.redis.get<SharedDocument>(versionKey(id, slug))) ?? null;
  }

  async putVersion(id: string, slug: string, doc: SharedDocument) {
    // Its own key, not a field on the document: the 900 KB ceiling then
    // applies per draft rather than to the whole history at once, and the
    // reader never fetches drafts it is not showing.
    await this.redis.set(versionKey(id, slug), doc);
  }

  async list(): Promise<SharedDocumentSummary[]> {
    const ids = await this.redis.smembers(INDEX_KEY);
    if (ids.length === 0) return [];
    const docs = await this.redis.mget<(SharedDocument | null)[]>(
      ...ids.map((id) => DOC_PREFIX + id),
    );
    return docs
      .filter((d): d is SharedDocument => d !== null)
      .map(({ id, title, createdAt, updatedAt, revokedAt }) => ({
        id,
        title,
        createdAt,
        updatedAt,
        revokedAt,
      }))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }
}
