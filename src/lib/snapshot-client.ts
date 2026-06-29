import { EMPTY_SNAPSHOT, type AirdropSnapshot } from "./airdrop-snapshot";

// Same-origin proxy. Netlify rewrites `/api/snapshot` → the jsDelivr CDN server-side
// (see the `[[redirects]]` block in netlify.toml), so the GitHub owner/repo lives only in
// server config — never in the client bundle or a DevTools network trace. The CDN serves
// the public repo's `data` branch (refreshed by the collector cron).
export const SNAPSHOT_CDN_URL = "/api/snapshot";
export const SEED_FALLBACK_URL = "/snapshot.seed.json";

// Ship mode. Live: fetch the proxied CDN snapshot, falling back to the committed seed if
// the proxy/CDN is unavailable. Requires the repo to be PUBLIC and the `data` branch
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
