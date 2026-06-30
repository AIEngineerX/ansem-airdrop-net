import { ANSEM_MINT, NATIVE_SOL_MINT, type TransferRow } from "./domain";

export const FEED_MAX = 100;
export const SIG_CAP = 10;
const EPOCH_ISO = new Date(0).toISOString();

export type AirdropRecipient = {
  wallet: string;
  totalAnsemUi: number;
  transferCount: number;
  firstSeen: string;
  latestSeen: string;
  latestSignature: string;
  signatures: string[];
  /** Current on-chain ANSEM balance — set by the collector for the top 50 only. */
  heldAnsemUi?: number;
};
export type AirdropFeedItem = {
  wallet: string;
  amountUi: number;
  blockTime: string;
  signature: string;
  txUrl: string;
};
export type OtherMintSent = { mint: string; count: number; totalUi: number };
export type AirdropSnapshot = {
  collectedAt: string;
  source: string;
  mint: string;
  backfillComplete: boolean;
  cursors: { newest: string | null; oldestScanned: string | null };
  totals: {
    uniqueRecipients: number;
    totalAnsemUi: number;
    totalAirdrops: number;
    solOverheadUi: number;
    windowFrom: string | null;
    windowThrough: string | null;
  };
  recipients: AirdropRecipient[];
  feed: AirdropFeedItem[];
  otherMintsSent: OtherMintSent[];
  /** Total unique wallets currently holding $ANSEM (ALL holders, not just airdrop
   *  recipients). Recomputed at most hourly by the collector — see tokenHoldersAsOf. */
  tokenHolders?: number;
  tokenHoldersAsOf?: string;
};

export const EMPTY_SNAPSHOT: AirdropSnapshot = {
  collectedAt: new Date(0).toISOString(),
  source: "",
  mint: ANSEM_MINT,
  backfillComplete: false,
  cursors: { newest: null, oldestScanned: null },
  totals: { uniqueRecipients: 0, totalAnsemUi: 0, totalAirdrops: 0, solOverheadUi: 0, windowFrom: null, windowThrough: null },
  recipients: [],
  feed: [],
  otherMintsSent: [],
};

const minIso = (a: string | null, b: string) => (a == null || b < a ? b : a);
const maxIso = (a: string | null, b: string) => (a == null || b > a ? b : a);

export function foldTransfers(
  prev: AirdropSnapshot,
  rows: TransferRow[],
  opts: { newestSignature: string | null; oldestScanned: string | null; backfillComplete: boolean; collectedAt: string },
): AirdropSnapshot {
  // Belt-and-suspenders: dedup incoming rows by TransferRow.id before folding.
  // Upstream parseOutgoingTransfers already dedups by id; the cursor prevents cross-run
  // overlap; this guard protects against accidental duplicate rows in the same call.
  const fresh: TransferRow[] = [];
  const seenIds = new Set<string>();
  for (const r of rows) {
    if (!seenIds.has(r.id)) { seenIds.add(r.id); fresh.push(r); }
  }

  const recipients = new Map(prev.recipients.map((r) => [r.wallet, { ...r, signatures: [...r.signatures] }]));
  const others = new Map(prev.otherMintsSent.map((o) => [o.mint, { ...o }]));
  let { totalAnsemUi, totalAirdrops, solOverheadUi, windowFrom, windowThrough } = prev.totals;
  const newFeed: AirdropFeedItem[] = [];

  for (const r of fresh) {
    if (r.mint === ANSEM_MINT) {
      totalAirdrops += 1;
      totalAnsemUi += r.amountUi;
      // Skip epoch blockTime (timestamp==null/0 → "1970…") so it never corrupts the window.
      if (r.blockTime !== EPOCH_ISO) {
        windowFrom = minIso(windowFrom, r.blockTime);
        windowThrough = maxIso(windowThrough, r.blockTime);
      }
      const cur = recipients.get(r.recipientWallet);
      if (!cur) {
        recipients.set(r.recipientWallet, {
          wallet: r.recipientWallet, totalAnsemUi: r.amountUi, transferCount: 1,
          firstSeen: r.blockTime, latestSeen: r.blockTime,
          latestSignature: r.signature,
          signatures: [r.signature],
        });
      } else {
        cur.totalAnsemUi += r.amountUi;
        cur.transferCount += 1;
        cur.firstSeen = minIso(cur.firstSeen, r.blockTime);
        if (r.blockTime >= cur.latestSeen) {
          cur.latestSeen = r.blockTime;
          cur.latestSignature = r.signature;
        }
        // Prepend and cap signatures; all increments are now unconditional (dedup above).
        cur.signatures = [r.signature, ...cur.signatures].slice(0, SIG_CAP);
      }
      newFeed.push({ wallet: r.recipientWallet, amountUi: r.amountUi, blockTime: r.blockTime, signature: r.signature, txUrl: r.txUrl });
    } else if (r.mint === NATIVE_SOL_MINT) {
      solOverheadUi += r.amountUi;
    } else {
      const o = others.get(r.mint) ?? { mint: r.mint, count: 0, totalUi: 0 };
      o.count += 1; o.totalUi += r.amountUi; others.set(r.mint, o);
    }
  }

  const recipientList = [...recipients.values()].sort((a, b) => b.totalAnsemUi - a.totalAnsemUi);
  const feed = [...newFeed, ...prev.feed]
    .filter((v, i, arr) => arr.findIndex((x) => x.signature === v.signature && x.wallet === v.wallet) === i)
    .sort((a, b) => (a.blockTime < b.blockTime ? 1 : -1))
    .slice(0, FEED_MAX);

  return {
    collectedAt: opts.collectedAt,
    source: prev.source,
    mint: ANSEM_MINT,
    backfillComplete: opts.backfillComplete,
    cursors: { newest: opts.newestSignature ?? prev.cursors.newest, oldestScanned: opts.oldestScanned ?? prev.cursors.oldestScanned },
    totals: { uniqueRecipients: recipientList.length, totalAnsemUi, totalAirdrops, solOverheadUi, windowFrom, windowThrough },
    recipients: recipientList,
    feed,
    otherMintsSent: [...others.values()].sort((a, b) => b.totalUi - a.totalUi),
  };
}
