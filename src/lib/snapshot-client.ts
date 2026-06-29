import { EMPTY_SNAPSHOT, type AirdropSnapshot } from "./airdrop-snapshot";

export const SNAPSHOT_CDN_URL =
  "https://cdn.jsdelivr.net/gh/AIEngineerX/ansem-airdrop-net@data/snapshot.json";
export const SEED_FALLBACK_URL = "/snapshot.seed.json";

// Ship mode. Live: fetch the CDN snapshot (jsDelivr over the public repo's `data`
// branch, refreshed by the collector cron), falling back to the committed seed if
// the CDN is unavailable. Requires the repo to be PUBLIC and the `data` branch
// seeded (see docs/DEPLOY.md) — until then the CDN 404s and the seed is served.
export const LIVE_SNAPSHOT_ENABLED = true;

export async function fetchSnapshot(fetchImpl: typeof fetch = fetch): Promise<AirdropSnapshot> {
  const urls = LIVE_SNAPSHOT_ENABLED ? [SNAPSHOT_CDN_URL, SEED_FALLBACK_URL] : [SEED_FALLBACK_URL];
  for (const url of urls) {
    try {
      const res = await fetchImpl(url, { cache: "no-store" });
      if (!res.ok) continue;
      return (await res.json()) as AirdropSnapshot;
    } catch {
      /* try next */
    }
  }
  return EMPTY_SNAPSHOT;
}
