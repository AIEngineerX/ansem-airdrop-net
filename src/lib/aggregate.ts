import {
  ANSEM_MINT,
  NATIVE_SOL_MINT,
  type RecipientRow,
  type Snapshot,
  type TransferRow,
} from "./domain";

type BuildOpts = { sourceWallet: string; unparsed: number; lastSignature: string | null };

function dedupe(rows: TransferRow[]): TransferRow[] {
  const seen = new Set<string>();
  const out: TransferRow[] = [];
  for (const r of rows) {
    if (!seen.has(r.id)) {
      seen.add(r.id);
      out.push(r);
    }
  }
  return out;
}

function recipients(rows: TransferRow[]): RecipientRow[] {
  const by = new Map<string, RecipientRow>();
  for (const r of rows) {
    const cur = by.get(r.recipientWallet);
    if (!cur) {
      by.set(r.recipientWallet, {
        wallet: r.recipientWallet,
        transferCount: 1,
        firstSeen: r.blockTime,
        latestSeen: r.blockTime,
      });
      continue;
    }
    cur.transferCount += 1;
    if (r.blockTime < cur.firstSeen) cur.firstSeen = r.blockTime;
    if (r.blockTime > cur.latestSeen) cur.latestSeen = r.blockTime;
  }
  return [...by.values()].sort((a, b) => (a.latestSeen < b.latestSeen ? 1 : -1));
}

export function buildSnapshot(input: TransferRow[], opts: BuildOpts): Snapshot {
  const rows = dedupe(input).sort((a, b) => (a.blockTime < b.blockTime ? 1 : -1));
  const times = rows.map((r) => r.blockTime).sort();
  return {
    // stamped by the caller via withCollectedAt — pure functions don't read the clock
    collectedAt: new Date(0).toISOString(),
    coveredFrom: times[0] ?? null,
    coveredThrough: times[times.length - 1] ?? null,
    lastSignature: opts.lastSignature,
    sourceWallet: opts.sourceWallet,
    transfers: rows,
    recipients: recipients(rows),
    counts: {
      transfers: rows.length,
      uniqueRecipients: new Set(rows.map((r) => r.recipientWallet)).size,
      unparsed: opts.unparsed,
    },
    ansemSentUi: rows.filter((r) => r.mint === ANSEM_MINT).reduce((s, r) => s + r.amountUi, 0),
    solSentUi: rows.filter((r) => r.mint === NATIVE_SOL_MINT).reduce((s, r) => s + r.amountUi, 0),
  };
}

export function mergeSnapshots(prev: Snapshot, next: Snapshot): Snapshot {
  return buildSnapshot([...prev.transfers, ...next.transfers], {
    sourceWallet: next.sourceWallet,
    unparsed: prev.counts.unparsed + next.counts.unparsed,
    lastSignature: next.lastSignature ?? prev.lastSignature,
  });
}

export function withCollectedAt(snap: Snapshot, iso: string): Snapshot {
  return { ...snap, collectedAt: iso, coveredThrough: snap.coveredThrough ?? iso };
}
