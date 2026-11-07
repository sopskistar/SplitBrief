// Per-process only: cold starts and multiple serverless instances have separate buckets.
const buckets = new Map<string, { count: number; reset: number }>();
export function takeRequest(key: string, max = 10, now = Date.now()): boolean {
  for (const [id, item] of buckets) if (item.reset <= now) buckets.delete(id);
  if (buckets.size >= 2000 && !buckets.has(key)) return false;
  const item = buckets.get(key);
  if (!item || item.reset <= now) {
    buckets.set(key, { count: 1, reset: now + 60_000 });
    return true;
  }
  if (item.count >= max) return false;
  item.count++;
  return true;
}
