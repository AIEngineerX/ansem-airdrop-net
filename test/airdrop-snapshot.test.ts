import { test } from "node:test";
import assert from "node:assert/strict";
import { EMPTY_SNAPSHOT, foldTransfers } from "../src/lib/airdrop-snapshot";
import { ANSEM_MINT, NATIVE_SOL_MINT, type TransferRow } from "../src/lib/domain";

function row(over: Partial<TransferRow>): TransferRow {
  return {
    id: Math.random().toString(36),
    signature: "sig",
    blockTime: "2026-06-29T12:00:00.000Z",
    sourceWallet: "GV6U",
    recipientWallet: "R1",
    mint: ANSEM_MINT,
    amountRaw: "1",
    amountUi: 100,
    transferType: "token_2022",
    parserConfidence: "high",
    eventIndex: 0,
    txUrl: "https://solscan.io/tx/sig",
    ...over,
  };
}

const opts = (sig: string) => ({ newestSignature: sig, oldestScanned: null, backfillComplete: false, collectedAt: "2026-06-29T13:00:00.000Z" });

test("ANSEM transfers roll up per recipient with amount + counts", () => {
  const snap = foldTransfers(EMPTY_SNAPSHOT, [
    row({ recipientWallet: "R1", amountUi: 100, signature: "a", blockTime: "2026-06-29T12:00:00.000Z" }),
    row({ recipientWallet: "R1", amountUi: 50, signature: "b", blockTime: "2026-06-29T12:05:00.000Z" }),
    row({ recipientWallet: "R2", amountUi: 30, signature: "c" }),
  ], opts("a"));
  assert.equal(snap.totals.uniqueRecipients, 2);
  assert.equal(snap.totals.totalAirdrops, 3);
  assert.equal(snap.totals.totalAnsemUi, 180);
  const r1 = snap.recipients.find((r) => r.wallet === "R1")!;
  assert.equal(r1.totalAnsemUi, 150);
  assert.equal(r1.transferCount, 2);
  assert.equal(r1.firstSeen, "2026-06-29T12:00:00.000Z");
  assert.equal(r1.latestSeen, "2026-06-29T12:05:00.000Z");
});

test("SOL dust is overhead, not a recipient; decoy ANSEM-named mint is ignored", () => {
  const snap = foldTransfers(EMPTY_SNAPSHOT, [
    row({ recipientWallet: "R1", amountUi: 100 }),
    row({ recipientWallet: "DUST", mint: NATIVE_SOL_MINT, amountUi: 0.002074, transferType: "native_sol", symbol: "SOL" }),
    row({ recipientWallet: "R3", mint: "DECOYansemMint", amountUi: 9999, symbol: "ANSEM" }),
  ], opts("a"));
  assert.equal(snap.totals.uniqueRecipients, 1); // only R1
  assert.ok(snap.recipients.every((r) => r.wallet !== "DUST" && r.wallet !== "R3"));
  assert.ok(Math.abs(snap.totals.solOverheadUi - 0.002074) < 1e-9);
  assert.equal(snap.totals.totalAnsemUi, 100);
  assert.ok(snap.otherMintsSent.some((o) => o.mint === "DECOYansemMint" && o.totalUi === 9999));
});

test("merge accumulates across calls and feed is newest-first, capped", () => {
  let snap = foldTransfers(EMPTY_SNAPSHOT, [row({ recipientWallet: "R1", signature: "a", blockTime: "2026-06-29T12:00:00.000Z" })], opts("a"));
  snap = foldTransfers(snap, [row({ recipientWallet: "R1", signature: "b", blockTime: "2026-06-29T12:10:00.000Z" })], opts("b"));
  assert.equal(snap.totals.totalAirdrops, 2);
  assert.equal(snap.feed[0].signature, "b"); // newest first
  assert.equal(snap.feed[0].blockTime, "2026-06-29T12:10:00.000Z");
});
