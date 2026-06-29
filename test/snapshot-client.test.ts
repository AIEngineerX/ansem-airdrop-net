import { test } from "node:test";
import assert from "node:assert/strict";
import { fetchSnapshot, SNAPSHOT_CDN_URL, SEED_FALLBACK_URL } from "../src/lib/snapshot-client";
import { EMPTY_SNAPSHOT } from "../src/lib/airdrop-snapshot";
import { PRIMARY_SOURCE_WALLET, ANSEM_MINT } from "../src/lib/domain";

// Test A: CDN throws, seed fallback URL succeeds → returns the fallback's snapshot
test("CDN failure falls back to seed URL and returns its snapshot (FIX 5)", async () => {
  const mockFetch = async (url: string) => {
    if (url.startsWith(SNAPSHOT_CDN_URL)) throw new Error("cdn down");
    if (url !== SEED_FALLBACK_URL) throw new Error(`unexpected url: ${url}`);
    return {
      ok: true,
      json: async () => ({ ...EMPTY_SNAPSHOT, source: PRIMARY_SOURCE_WALLET, mint: ANSEM_MINT }),
    } as Response;
  };
  const snap = await fetchSnapshot(mockFetch as typeof fetch);
  assert.equal(snap.source, PRIMARY_SOURCE_WALLET);
});

// Test B: both URLs fail → returns EMPTY_SNAPSHOT (not the old bundled seed)
test("both CDN and seed URL fail → returns EMPTY_SNAPSHOT shape (FIX 5)", async () => {
  const mockFetch = async (url: string): Promise<Response> => { throw new Error(`all down: ${url}`); };
  const snap = await fetchSnapshot(mockFetch as typeof fetch);
  assert.equal(snap.source, "");
  assert.equal(snap.totals.totalAirdrops, 0);
});
