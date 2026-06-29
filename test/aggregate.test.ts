import assert from "node:assert/strict";
import test from "node:test";
import { ANSEM_MINT, NATIVE_SOL_MINT, type TransferRow } from "../src/lib/domain";
import { buildSnapshot, mergeSnapshots } from "../src/lib/aggregate";

const row = (over: Partial<TransferRow>): TransferRow => ({
  id: over.id ?? `${over.signature}:${over.mint}:${over.eventIndex ?? 0}`,
  signature: "sig",
  blockTime: "2026-06-28T00:00:00.000Z",
  sourceWallet: "SRC",
  recipientWallet: "R1",
  mint: ANSEM_MINT,
  amountRaw: "1000000",
  amountUi: 1,
  transferType: "token_2022",
  parserConfidence: "high",
  eventIndex: 0,
  txUrl: "x",
  ...over,
});

test("mint-exact: a decoy 'ANSEM' symbol with a different mint is NOT counted", () => {
  const rows = [
    row({ id: "a", mint: ANSEM_MINT, amountUi: 10, symbol: "ANSEM" }),
    row({ id: "b", mint: "DECOYmint", amountUi: 999, symbol: "ANSEM" }), // decoy
    row({ id: "c", mint: NATIVE_SOL_MINT, amountUi: 2, transferType: "native_sol" }),
  ];
  const snap = buildSnapshot(rows, { sourceWallet: "SRC", unparsed: 0, lastSignature: "s" });
  assert.equal(snap.ansemSentUi, 10);
  assert.equal(snap.solSentUi, 2);
  assert.equal(snap.counts.transfers, 3);
});

test("recipients aggregate with first/latest seen and unique count", () => {
  const rows = [
    row({ id: "a", recipientWallet: "R1", blockTime: "2026-06-01T00:00:00.000Z" }),
    row({ id: "b", recipientWallet: "R1", blockTime: "2026-06-10T00:00:00.000Z" }),
    row({ id: "c", recipientWallet: "R2", blockTime: "2026-06-05T00:00:00.000Z" }),
  ];
  const snap = buildSnapshot(rows, { sourceWallet: "SRC", unparsed: 0, lastSignature: null });
  assert.equal(snap.counts.uniqueRecipients, 2);
  const r1 = snap.recipients.find((r) => r.wallet === "R1")!;
  assert.equal(r1.transferCount, 2);
  assert.equal(r1.firstSeen, "2026-06-01T00:00:00.000Z");
  assert.equal(r1.latestSeen, "2026-06-10T00:00:00.000Z");
});

test("merge dedups overlapping transfer ids across snapshots", () => {
  const prev = buildSnapshot([row({ id: "dup", amountUi: 5 })], {
    sourceWallet: "SRC",
    unparsed: 1,
    lastSignature: "old",
  });
  const next = buildSnapshot(
    [row({ id: "dup", amountUi: 5 }), row({ id: "new", amountUi: 7 })],
    { sourceWallet: "SRC", unparsed: 2, lastSignature: "new" },
  );
  const merged = mergeSnapshots(prev, next);
  assert.equal(merged.counts.transfers, 2); // dup collapsed
  assert.equal(merged.ansemSentUi, 12);
  assert.equal(merged.lastSignature, "new"); // newest wins
});
