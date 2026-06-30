import { EMPTY_SNAPSHOT, type AirdropSnapshot } from "./airdrop-snapshot";

// The collector publishes snapshot.json to the public repo's `data` branch. We read it from
// raw.githubusercontent.com (sends Access-Control-Allow-Origin: *, so a browser fetch works)
// with a per-minute cache buster. We do NOT use jsDelivr: its @branch-ref cache is purge-proof
// in practice — verified 2026-06-30, jsDelivr served a 108-min-stale copy while the data branch
// was current, and five purge.jsdelivr.net calls all returned status=finished yet the CDN kept
// serving the old file. raw.githubusercontent.com is fronted by Fastly which keys on the FULL
// URL including query, so a buster that changes each minute is a fresh cache key — the origin
// (Source-Age: 0) is re-read at most once per minute, shared across all clients in that minute,
// and every visitor sees the latest snapshot within ~1 minute.
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
