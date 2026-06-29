import { EMPTY_SNAPSHOT, type AirdropSnapshot } from "./airdrop-snapshot";

export const SNAPSHOT_CDN_URL =
  "https://cdn.jsdelivr.net/gh/AIEngineerX/ansem-airdrop-net@data/snapshot.json";
export const SEED_FALLBACK_URL = "/snapshot.seed.json";

// Ship mode. The repo is currently PRIVATE, so jsDelivr's /gh/ endpoint 404s —
// we serve the committed seed (built into the deploy) from the same origin and
// skip the dead CDN call. To enable live auto-updates later, flip this to true
// AFTER either making the repo public (jsDelivr works) or repointing
// SNAPSHOT_CDN_URL at a Netlify function that serves the data-branch snapshot.
export const LIVE_SNAPSHOT_ENABLED = false;

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
