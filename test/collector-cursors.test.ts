import assert from "node:assert/strict";
import test from "node:test";
import { computeNextCursors, type CursorState } from "../src/lib/collector-cursors";

// ─── FIX A: cursor-advance invariant tests ─────────────────────────────────
// These are pure-function tests — no network, no fs.

test("sync: advances newest when incremental scan sees a new signature", () => {
  const prev: CursorState = { newest: "SIG_OLD", oldestScanned: "SIG_OLD2", backfillComplete: false };
  const result = computeNextCursors(prev, {
    mode: "sync",
    incNewestSignature: "SIG_NEW",
    backfillOldest: null,
    backfillCount: 0,
    max: 1000,
  });
  assert.equal(result.newest, "SIG_NEW");
});

test("sync: keeps newest when incremental scan returns nothing newer", () => {
  const prev: CursorState = { newest: "SIG_OLD", oldestScanned: "SIG_OLD2", backfillComplete: false };
  const result = computeNextCursors(prev, {
    mode: "sync",
    incNewestSignature: null,
    backfillOldest: null,
    backfillCount: 0,
    max: 1000,
  });
  assert.equal(result.newest, "SIG_OLD");
});

test("backfill bootstrap: seeds newest from the scan newestSignature (fixes bootstrap double-count)", () => {
  // On first ever run: prev has no newest, no oldestScanned.
  const prev: CursorState = { newest: null, oldestScanned: null, backfillComplete: false };
  const result = computeNextCursors(prev, {
    mode: "backfill",
    incNewestSignature: "SIG_TOP",   // top of all history, seen on bootstrap
    backfillOldest: "SIG_BOTTOM",
    backfillCount: 1000,
    max: 1000,
  });
  assert.equal(result.newest, "SIG_TOP", "newest must be seeded from bootstrap scan");
  assert.equal(result.backfillComplete, false, "full page → backfill not complete yet");
});

test("backfill: marks complete when scan returns fewer than max (reached genesis)", () => {
  const prev: CursorState = { newest: "SIG_TOP", oldestScanned: "SIG_MID", backfillComplete: false };
  const result = computeNextCursors(prev, {
    mode: "backfill",
    incNewestSignature: null,
    backfillOldest: "SIG_GENESIS",
    backfillCount: 300,
    max: 1000,
  });
  assert.equal(result.backfillComplete, true, "partial page → reached genesis");
});

test("double-count prevention: two consecutive sync runs produce non-overlapping windows", () => {
  // Run 1: incremental scan sees SIG_NEW as the newest sig.
  const prev1: CursorState = { newest: "SIG_ORIG", oldestScanned: null, backfillComplete: false };
  const after1 = computeNextCursors(prev1, {
    mode: "sync",
    incNewestSignature: "SIG_NEW",
    backfillOldest: null,
    backfillCount: 0,
    max: 200,
  });
  // newest must have advanced to the latest seen signature.
  assert.equal(after1.newest, "SIG_NEW", "run 1 must advance newest to the latest sig seen");

  // Run 2: the next getOutgoingTransactions({ until: after1.newest }) would only return sigs
  // STRICTLY NEWER than SIG_NEW.  Assume nothing newer happened — incremental returns nothing.
  const after2 = computeNextCursors(after1, {
    mode: "sync",
    incNewestSignature: null, // nothing newer in the seconds between runs
    backfillOldest: null,
    backfillCount: 0,
    max: 200,
  });
  // newest must stay at SIG_NEW — the same batch of transfers is NOT re-folded.
  assert.equal(after2.newest, "SIG_NEW", "run 2 newest must remain unchanged (no re-fold of run 1 transfers)");
});
