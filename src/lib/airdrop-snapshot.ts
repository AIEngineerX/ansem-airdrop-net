import { ANSEM_MINT, NATIVE_SOL_MINT, type TransferRow } from "./domain";

export const FEED_MAX = 100;
export const SIG_CAP = 10;

export type AirdropRecipient = {
  wallet: string;
  totalAnsemUi: number;
  transferCount: number;
  firstSeen: string;
  latestSeen: string;
  signatures: string[];
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
  const recipients = new Map(prev.recipients.map((r) => [r.wallet, { ...r, signatures: [...r.signatures] }]));
  const others = new Map(prev.otherMintsSent.map((o) => [o.mint, { ...o }]));
  let { totalAnsemUi, totalAirdrops, solOverheadUi, windowFrom, windowThrough } = prev.totals;
  const newFeed: AirdropFeedItem[] = [];

  for (const r of rows) {
    if (r.mint === ANSEM_MINT) {
      totalAirdrops += 1;
      totalAnsemUi += r.amountUi;
      windowFrom = minIso(windowFrom, r.blockTime);
      windowThrough = maxIso(windowThrough, r.blockTime);
      const cur = recipients.get(r.recipientWallet);
      if (!cur) {
        recipients.set(r.recipientWallet, {
          wallet: r.recipientWallet, totalAnsemUi: r.amountUi, transferCount: 1,
          firstSeen: r.blockTime, latestSeen: r.blockTime, signatures: [r.signature],
        });
      } else {
        cur.totalAnsemUi += r.amountUi;
        cur.transferCount += 1;
        cur.firstSeen = minIso(cur.firstSeen, r.blockTime);
        cur.latestSeen = maxIso(cur.latestSeen, r.blockTime);
        if (!cur.signatures.includes(r.signature)) cur.signatures = [r.signature, ...cur.signatures].slice(0, SIG_CAP);
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
