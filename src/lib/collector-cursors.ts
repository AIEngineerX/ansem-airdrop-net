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
  // newest: advance to the latest signature ever seen; keep prev when this run saw nothing newer.
  const newest = opts.incNewestSignature ?? prev.newest;

  // oldestScanned: extend further back as backfill progresses.
  const oldestScanned = opts.backfillOldest ?? prev.oldestScanned;

  // backfillComplete: done once a backfill scan returns fewer than the cap (reached genesis).
  const ranBackfill = opts.mode === "backfill" || opts.mode === "sync";
  const backfillComplete =
    prev.backfillComplete || (ranBackfill && opts.backfillCount < opts.max);

  return { newest, oldestScanned, backfillComplete };
}
