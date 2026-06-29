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

test("backfill: must NOT regress newest once it is already set (subsequent older chunk)", () => {
  // Root-cause regression test. After bootstrap, newest = SIG_TOP (the global newest).
  // A later backfill chunk paginates OLDER (before: oldestScanned), so getOutgoingTransactions
  // reports that chunk's scan-local newestSignature — an OLDER signature. computeNextCursors
  // must IGNORE it; newest must stay at SIG_TOP. Adopting the older value drags the cursor
  // backward in time, which makes the next `until: newest` incremental scan re-fetch the whole
  // window between the (now-stale) cursor and head — and the additive fold double-counts it.
  const prev: CursorState = { newest: "SIG_TOP", oldestScanned: "SIG_MID", backfillComplete: false };
  const result = computeNextCursors(prev, {
    mode: "backfill",
    incNewestSignature: "SIG_OLDER_CHUNK_TOP", // newest of an OLDER chunk — must be ignored
    backfillOldest: "SIG_OLDEST",
    backfillCount: 1000,
    max: 1000,
  });
  assert.equal(result.newest, "SIG_TOP", "backfill must never drag newest backward once it is set");
  assert.equal(result.oldestScanned, "SIG_OLDEST", "oldestScanned still extends older");
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

// ─── FIX B1: backfillComplete judged on SIGNATURES fetched, not parsed txs ──
// rpc-source's getTransaction drops null results (pruned/not-found), so the
// parsed-tx count can be < the signature count. backfillComplete must compare the
// SIGNATURE count against max, or one pruned tx in a full chunk wrongly ends the
// backfill forever and drops older history.

test("B1: full signature chunk with a pruned (null) tx does NOT complete backfill", () => {
  // 1000 signatures fetched this run; one getTransaction returned null → 999 parsed txs.
  // The caller must feed signatureCount (1000), not txs.length (999), as backfillCount.
  const prev: CursorState = { newest: "SIG_TOP", oldestScanned: "SIG_MID", backfillComplete: false };
  const signatureCount = 1000;
  const result = computeNextCursors(prev, {
    mode: "backfill",
    incNewestSignature: null,
    backfillOldest: "SIG_OLDER",
    backfillCount: signatureCount, // SIGNATURES fetched, not the 999 parsed txs
    max: 1000,
  });
  assert.equal(
    result.backfillComplete,
    false,
    "a full (==max) signature chunk means more history may remain — must not complete",
  );
  assert.equal(result.oldestScanned, "SIG_OLDER", "oldestScanned advances from the oldest signature");
});

test("B1: short signature chunk completes backfill (reached genesis)", () => {
  const prev: CursorState = { newest: "SIG_TOP", oldestScanned: "SIG_MID", backfillComplete: false };
  const result = computeNextCursors(prev, {
    mode: "backfill",
    incNewestSignature: null,
    backfillOldest: "SIG_GENESIS",
    backfillCount: 640, // fewer signatures than max → no older page exists
    max: 1000,
  });
  assert.equal(result.backfillComplete, true, "fewer signatures than max → reached genesis");
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
