export type CursorState = {
  newest: string | null;
  oldestScanned: string | null;
  backfillComplete: boolean;
};

export function computeNextCursors(
  prev: CursorState,
  opts: {
    mode: "incremental" | "backfill" | "sync";
    /** newestSignature from the incremental/forward scan (null if none seen this run) */
    incNewestSignature: string | null;
    /** oldest signature seen in the backfill scan (null if none) */
    backfillOldest: string | null;
    /** number of signatures the backfill scan returned */
    backfillCount: number;
    /** the --max cap used for this run */
    max: number;
  },
): CursorState {
  // newest marks the head of already-counted history; only a FORWARD scan may advance it.
  // In backfill mode the scan paginates OLDER, so its scan-local newestSignature is an older
  // sig — adopt it ONLY to bootstrap when newest is still null, never to overwrite a real
  // cursor (that would drag the head backward and make the next incremental scan re-fetch —
  // and the additive fold double-count — the whole window). Sync/incremental advance normally.
  const newest =
    opts.mode === "backfill"
      ? prev.newest ?? opts.incNewestSignature
      : opts.incNewestSignature ?? prev.newest;

  // oldestScanned: extend further back as backfill progresses.
  const oldestScanned = opts.backfillOldest ?? prev.oldestScanned;

  // backfillComplete: done once a backfill scan returns fewer than the cap (reached genesis).
  const ranBackfill = opts.mode === "backfill" || opts.mode === "sync";
  const backfillComplete =
    prev.backfillComplete || (ranBackfill && opts.backfillCount < opts.max);

  return { newest, oldestScanned, backfillComplete };
}
