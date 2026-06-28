export const PRIMARY_SOURCE_WALLET = "GV6UUmNxz2RpKxmNAPadYKb7uQpszwqQAu3qLJxVdC52";
export const ANSEM_MINT = "9cRCn9rGT8V2imeM2BaKs13yhMEais3ruM3rPvTGpump";
export const NATIVE_SOL_MINT = "So11111111111111111111111111111111111111112";

export const SOURCE_ATTRIBUTION =
  "Public tracker and Pump.fun profile context link this wallet to ansemconzimp / @blknoiz06. Not exhaustive; not a wallet-ownership claim.";

export type SourceConfidence = "pump-profile-associated" | "candidate" | "rejected";
export type TransferType = "native_sol" | "spl_token" | "token_2022";
export type ParserConfidence = "high" | "medium" | "low";

export type SourceWallet = {
  walletAddress: string;
  label: string;
  confidence: SourceConfidence;
  evidence: string;
};

export type TransferRow = {
  id: string;
  signature: string;
  slot?: number;
  blockTime: string;
  sourceWallet: string;
  recipientWallet: string;
  mint: string;
  symbol?: string;
  amountRaw: string;
  amountUi: number;
  decimals?: number;
  transferType: TransferType;
  parserConfidence: ParserConfidence;
  eventIndex: number;
  txUrl: string;
};

export type TokenPanel = {
  mint: string;
  symbol: "ANSEM";
  name: "The Black Bull";
  priceUsd: number | null;
  liquidityUsd: number | null;
  marketCapUsd: number | null;
  volume24hUsd: number | null;
  updatedAt: string | null;
};

export type Summary = {
  trackedWallet: SourceWallet;
  transferCount: number;
  uniqueRecipients: number;
  totalCurrentUsd: number | null;
  totalAnsemSentUi: number | null;
  unparsedTransactionCount: number;
  lastCollectedAt: string | null;
};

export const PRIMARY_SOURCE: SourceWallet = {
  walletAddress: PRIMARY_SOURCE_WALLET,
  label: "Primary tracked Pump profile wallet",
  confidence: "pump-profile-associated",
  evidence: SOURCE_ATTRIBUTION,
};
