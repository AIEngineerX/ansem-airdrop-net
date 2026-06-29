import { EMPTY_SNAPSHOT, type AirdropSnapshot } from "./airdrop-snapshot";

// The collector publishes snapshot.json to the public repo's `data` branch; jsDelivr
// serves it. We fetch jsDelivr DIRECTLY (the repo is public, so there is nothing to hide
// behind a same-origin proxy) with a per-minute cache buster. Branch-ref CDN caches —
// Netlify's edge proxy AND jsDelivr's own edges — otherwise serve a stale copy for a long
// time even after the collector pushes and purges. A buster that changes each minute makes
// the URL unique, so the client always pulls the latest within ~1 minute regardless of how
// slowly a purge propagates.
export const SNAPSHOT_CDN_URL =
  "https://cdn.jsdelivr.net/gh/AIEngineerX/ansem-airdrop-net@data/snapshot.json";
export const SEED_FALLBACK_URL = "/snapshot.seed.json";

// Live: fetch the CDN snapshot, falling back to the committed seed if the CDN is
// unavailable. Requires the repo PUBLIC and the `data` branch seeded (see docs/DEPLOY.md).
export const LIVE_SNAPSHOT_ENABLED = true;

export async function fetchSnapshot(fetchImpl: typeof fetch = fetch): Promise<AirdropSnapshot> {
  const urls = LIVE_SNAPSHOT_ENABLED ? [SNAPSHOT_CDN_URL, SEED_FALLBACK_URL] : [SEED_FALLBACK_URL];
  for (const url of urls) {
    try {
      // Per-minute cache buster on the CDN url defeats stale branch-ref caching; the
      // static, deploy-pinned seed needs none.
      const target = url === SNAPSHOT_CDN_URL ? `${url}?t=${Math.floor(Date.now() / 60000)}` : url;
      const res = await fetchImpl(target, { cache: "no-store" });
      if (!res.ok) continue;
      return (await res.json()) as AirdropSnapshot;
    } catch {
      /* try next */
    }
  }
  return EMPTY_SNAPSHOT;
}
