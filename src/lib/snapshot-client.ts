import { EMPTY_SNAPSHOT, type AirdropSnapshot } from "./airdrop-snapshot";

// The collector publishes snapshot.json to the public repo's `data` branch. We read it from
// raw.githubusercontent.com (sends Access-Control-Allow-Origin: *, so a browser fetch works).
// Freshness is bounded by raw github's CDN cache (Cache-Control: max-age=300 → up to ~5 min),
// which is fine for this tracker — new airdrops are rare.
//
// Two things verified the hard way (2026-06-30):
//   1. raw github's Fastly IGNORES the query string for its cache key (a unique `?t=` buster
//      still returns X-Cache: HIT / Source-Age > 0), so a cache-buster does NOTHING. We don't
//      use one. Same story for jsDelivr, which we dropped — its @branch-ref purge is also
//      ineffective (served a 108-min-stale copy while reporting purge success).
//   2. The collector must commit with normal FAST-FORWARD pushes, never force-push. A
//      history-rewrite leaves raw github's origin serving an old commit for far longer than
//      the 5-min cache (observed ~40 min). Fast-forward commits let it re-resolve within the
//      cache window. (See .github/workflows/collect.yml.)
//
// For sub-minute freshness, front this with a server proxy over the GitHub *contents API*
// (returns branch HEAD instantly) — not warranted at the current airdrop cadence.
export const SNAPSHOT_CDN_URL =
  "https://raw.githubusercontent.com/AIEngineerX/ansem-airdrop-net/data/snapshot.json";
export const SEED_FALLBACK_URL = "/snapshot.seed.json";

// Live: fetch the CDN snapshot, falling back to the committed seed if the CDN is
// unavailable. Requires the repo PUBLIC and the `data` branch seeded (see docs/DEPLOY.md).
export const LIVE_SNAPSHOT_ENABLED = true;

export async function fetchSnapshot(fetchImpl: typeof fetch = fetch): Promise<AirdropSnapshot> {
  const urls = LIVE_SNAPSHOT_ENABLED ? [SNAPSHOT_CDN_URL, SEED_FALLBACK_URL] : [SEED_FALLBACK_URL];
  for (const url of urls) {
    try {
      // `no-store` keeps the browser from caching; raw github's own 5-min CDN cache governs
      // freshness (a query buster would be inert — Fastly ignores the query string here).
      const res = await fetchImpl(url, { cache: "no-store" });
      if (!res.ok) continue;
      return (await res.json()) as AirdropSnapshot;
    } catch {
      /* try next */
    }
  }
  return EMPTY_SNAPSHOT;
}
