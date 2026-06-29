export const PRIMARY_SOURCE_WALLET = "GV6UUmNxz2RpKxmNAPadYKb7uQpszwqQAu3qLJxVdC52";
export const ANSEM_MINT = "9cRCn9rGT8V2imeM2BaKs13yhMEais3ruM3rPvTGpump";
export const NATIVE_SOL_MINT = "So11111111111111111111111111111111111111112";

export type TransferType = "native_sol" | "spl_token" | "token_2022";
export type ParserConfidence = "high" | "medium" | "low";

// One outgoing transfer parsed from a GV6U transaction (the unit the collector folds
// into the AirdropSnapshot). See src/lib/airdrop-snapshot.ts.
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

// $ANSEM market panel (Creator Rewards tab), from DexScreener.
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

// --- Creator rewards (the secondary tab) ------------------------------------
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
