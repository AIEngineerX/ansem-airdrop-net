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
  priceChange24h: number | null;
  imageUrl: string | null;
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

export type RecipientRow = {
  wallet: string;
  transferCount: number;
  firstSeen: string;
  latestSeen: string;
};

export type Snapshot = {
  collectedAt: string;
  coveredFrom: string | null;
  coveredThrough: string | null;
  lastSignature: string | null;
  sourceWallet: string;
  transfers: TransferRow[];
  recipients: RecipientRow[];
  counts: { transfers: number; uniqueRecipients: number; unparsed: number };
  ansemSentUi: number;
  solSentUi: number;
};

// --- Creator rewards (the v0 product) ---------------------------------------
// GV6U... is Ansem's pump.fun creator wallet (profile @ansemconzimp / X @blknoiz06).
// He launched The Black Bull / $ANSEM; this tracks his on-chain pump.fun creator fees.

export const ANSEM_PUMP_USERNAME = "ansemconzimp";
export const ANSEM_PUMP_PROFILE_URL = "https://pump.fun/profile/ansemconzimp";
export const ANSEM_X_URL = "https://x.com/blknoiz06";
export const BLACK_BULL_SITE = "https://www.blackbullsol.com/";

export function pumpCreatorFeesUrl(wallet: string): string {
  return `https://swap-api.pump.fun/v1/creators/${wallet}/fees`;
}

export type FeePoint = {
  date: string; // ISO bucket
  cumulativeSol: number;
  dailySol: number;
  trades: number;
};

export type CreatorRewards = {
  wallet: string;
  username: string;
  // PumpSwap (post-bonding-curve AMM) creator fees — the on-chain, verifiable figure.
  totalSol: number;
  totalUsd: number | null; // totalSol * live SOL price
  totalTrades: number;
  series: FeePoint[];
  firstActive: string | null;
  lastActive: string | null;
};
