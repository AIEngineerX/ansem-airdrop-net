import { NATIVE_SOL_MINT, type TransferRow } from "./domain";

type RawTokenAmount = {
  tokenAmount?: string | number;
  decimals?: number;
};

export type HeliusNativeTransfer = {
  fromUserAccount?: string;
  toUserAccount?: string;
  amount?: number;
};

export type HeliusTokenTransfer = {
  fromUserAccount?: string;
  toUserAccount?: string;
  fromTokenAccount?: string;
  toTokenAccount?: string;
  mint?: string;
  tokenAmount?: number;
  rawTokenAmount?: RawTokenAmount;
  tokenStandard?: string;
};

export type HeliusTransaction = {
  signature: string;
  slot?: number;
  timestamp?: number;
  transactionError?: unknown;
  nativeTransfers?: HeliusNativeTransfer[];
  tokenTransfers?: HeliusTokenTransfer[];
};

export type ParseResult = {
  transfers: TransferRow[];
  unparsed: Array<{ signature: string; reason: string }>;
};

function isoFromUnix(timestamp?: number): string {
  if (!timestamp) return new Date(0).toISOString();
  return new Date(timestamp * 1000).toISOString();
}

function rawTokenAmount(transfer: HeliusTokenTransfer): string {
  const raw = transfer.rawTokenAmount?.tokenAmount;
  if (raw !== undefined && raw !== null) return String(raw);
  return String(transfer.tokenAmount ?? 0);
}

function decimalsFor(transfer: HeliusTokenTransfer): number | undefined {
  return transfer.rawTokenAmount?.decimals;
}

function transferId(parts: {
  signature: string;
  sourceWallet: string;
  recipientWallet: string;
  mint: string;
  amountRaw: string;
  eventIndex: number;
}): string {
  return [
    parts.signature,
    parts.sourceWallet,
    parts.recipientWallet,
    parts.mint,
    parts.amountRaw,
    parts.eventIndex,
  ].join(":");
}

export function parseOutgoingTransfers(
  transactions: HeliusTransaction[],
  sourceWallet: string,
): ParseResult {
  const transfers: TransferRow[] = [];
  const unparsed: ParseResult["unparsed"] = [];

  for (const tx of transactions) {
    if (!tx.signature) {
      unparsed.push({ signature: "unknown", reason: "missing signature" });
      continue;
    }

    if (tx.transactionError) {
      continue;
    }

    let eventIndex = 0;

    for (const nativeTransfer of tx.nativeTransfers ?? []) {
      if (nativeTransfer.fromUserAccount !== sourceWallet) continue;
      if (!nativeTransfer.toUserAccount || nativeTransfer.amount === undefined) {
        unparsed.push({ signature: tx.signature, reason: "incomplete native transfer" });
        continue;
      }

      const amountRaw = String(nativeTransfer.amount);
      const row = {
        id: transferId({
          signature: tx.signature,
          sourceWallet,
          recipientWallet: nativeTransfer.toUserAccount,
          mint: NATIVE_SOL_MINT,
          amountRaw,
          eventIndex,
        }),
        signature: tx.signature,
        slot: tx.slot,
        blockTime: isoFromUnix(tx.timestamp),
        sourceWallet,
        recipientWallet: nativeTransfer.toUserAccount,
        mint: NATIVE_SOL_MINT,
        symbol: "SOL",
        amountRaw,
        amountUi: nativeTransfer.amount / 1_000_000_000,
        decimals: 9,
        transferType: "native_sol" as const,
        parserConfidence: "high" as const,
        eventIndex,
        txUrl: `https://solscan.io/tx/${tx.signature}`,
      } satisfies TransferRow;

      transfers.push(row);
      eventIndex += 1;
    }

    for (const tokenTransfer of tx.tokenTransfers ?? []) {
      if (tokenTransfer.fromUserAccount !== sourceWallet) continue;
      if (!tokenTransfer.toUserAccount || !tokenTransfer.mint) {
        unparsed.push({ signature: tx.signature, reason: "incomplete token transfer" });
        continue;
      }

      const amountRaw = rawTokenAmount(tokenTransfer);
      const row = {
        id: transferId({
          signature: tx.signature,
          sourceWallet,
          recipientWallet: tokenTransfer.toUserAccount,
          mint: tokenTransfer.mint,
          amountRaw,
          eventIndex,
        }),
        signature: tx.signature,
        slot: tx.slot,
        blockTime: isoFromUnix(tx.timestamp),
        sourceWallet,
        recipientWallet: tokenTransfer.toUserAccount,
        mint: tokenTransfer.mint,
        amountRaw,
        amountUi: Number(tokenTransfer.tokenAmount ?? 0),
        decimals: decimalsFor(tokenTransfer),
        transferType:
          tokenTransfer.tokenStandard === "FungibleToken2022" ? "token_2022" : "spl_token",
        parserConfidence: tokenTransfer.rawTokenAmount ? "high" : "medium",
        eventIndex,
        txUrl: `https://solscan.io/tx/${tx.signature}`,
      } satisfies TransferRow;

      transfers.push(row);
      eventIndex += 1;
    }

    if (eventIndex === 0) {
      unparsed.push({ signature: tx.signature, reason: "no outgoing transfers from source wallet" });
    }
  }

  const seen = new Set<string>();
  return {
    transfers: transfers.filter((transfer) => {
      if (seen.has(transfer.id)) return false;
      seen.add(transfer.id);
      return true;
    }),
    unparsed,
  };
}
