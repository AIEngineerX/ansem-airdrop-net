import { EMPTY_SNAPSHOT, type AirdropSnapshot } from "./airdrop-snapshot";

export const SNAPSHOT_CDN_URL =
  "https://cdn.jsdelivr.net/gh/AIEngineerX/ansem-airdrop-net@data/snapshot.json";
export const SEED_FALLBACK_URL = "/snapshot.seed.json";

export async function fetchSnapshot(fetchImpl: typeof fetch = fetch): Promise<AirdropSnapshot> {
  for (const url of [SNAPSHOT_CDN_URL, SEED_FALLBACK_URL]) {
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
