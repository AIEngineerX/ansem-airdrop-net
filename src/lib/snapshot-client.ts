import seed from "../../public/snapshot.seed.json";
import { type AirdropSnapshot } from "./airdrop-snapshot";

export const SNAPSHOT_CDN_URL =
  "https://cdn.jsdelivr.net/gh/AIEngineerX/ansem-airdrop-net@data/snapshot.json";

export async function fetchSnapshot(fetchImpl: typeof fetch = fetch): Promise<AirdropSnapshot> {
  try {
    const res = await fetchImpl(SNAPSHOT_CDN_URL, { cache: "no-store" });
    if (!res.ok) throw new Error(String(res.status));
    return (await res.json()) as AirdropSnapshot;
  } catch {
    return seed as AirdropSnapshot;
  }
}
