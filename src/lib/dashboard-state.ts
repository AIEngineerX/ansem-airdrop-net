import {
  ANSEM_MINT,
  PRIMARY_SOURCE,
  type Summary,
  type TokenPanel,
  type TransferRow,
} from "./domain";

export const tokenPanel: TokenPanel = {
  mint: ANSEM_MINT,
  symbol: "ANSEM",
  name: "The Black Bull",
  priceUsd: null,
  liquidityUsd: null,
  marketCapUsd: null,
  volume24hUsd: null,
  updatedAt: null,
};

export const transfers: TransferRow[] = [];

export const summary: Summary = {
  trackedWallet: PRIMARY_SOURCE,
  transferCount: 0,
  uniqueRecipients: 0,
  totalCurrentUsd: null,
  totalAnsemSentUi: null,
  unparsedTransactionCount: 0,
  lastCollectedAt: null,
};

export function recipientsFromTransfers(rows: TransferRow[]) {
  const byWallet = new Map<string, { wallet: string; transferCount: number; firstSeen: string; latestSeen: string }>();

  for (const row of rows) {
    const current = byWallet.get(row.recipientWallet);
    if (!current) {
      byWallet.set(row.recipientWallet, {
        wallet: row.recipientWallet,
        transferCount: 1,
        firstSeen: row.blockTime,
        latestSeen: row.blockTime,
      });
      continue;
    }

    current.transferCount += 1;
    if (row.blockTime < current.firstSeen) current.firstSeen = row.blockTime;
    if (row.blockTime > current.latestSeen) current.latestSeen = row.blockTime;
  }

  return Array.from(byWallet.values());
}
