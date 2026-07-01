// In-memory TTL cache for product-search results.
//
// Institutional buyers re-search the same items constantly ("gloves", "A4
// paper", "tomato"), and live prices don't move minute to minute. Caching the
// whole search response for a few hours avoids re-spending on BOTH the LLM and
// the pricing API for repeat queries — by far the biggest cost lever.
//
// This is a process-local Map: it survives across requests on a warm server and
// is simply a no-op miss on a cold start, so it never serves stale data beyond
// the TTL and needs no external store.

type Entry = { value: unknown; expires: number };

const store = new Map<string, Entry>();

// How long a search result stays fresh. Override with SEARCH_CACHE_TTL_MS.
const TTL_MS = Number(process.env.SEARCH_CACHE_TTL_MS) || 6 * 60 * 60 * 1000; // 6h
// Cap entries so a long-running process can't grow unbounded.
const MAX_ENTRIES = 500;

/** Normalise a heading+unit into a stable cache key (case/space-insensitive). */
export function searchKey(heading: string, unit: string): string {
  const h = heading.toLowerCase().replace(/\s+/g, " ").trim();
  return `${h}|${unit.toLowerCase().trim()}`;
}

export function getCached<T>(key: string): T | null {
  const hit = store.get(key);
  if (!hit) return null;
  if (hit.expires < Date.now()) {
    store.delete(key);
    return null;
  }
  return hit.value as T;
}

export function setCached(key: string, value: unknown): void {
  // Evict the oldest entry when full (Map preserves insertion order).
  if (store.size >= MAX_ENTRIES) {
    const oldest = store.keys().next().value;
    if (oldest !== undefined) store.delete(oldest);
  }
  store.set(key, { value, expires: Date.now() + TTL_MS });
}
