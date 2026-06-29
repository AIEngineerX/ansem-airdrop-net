import { ANSEM_MINT, type TokenPanel } from "./domain";

export type DexPair = {
  baseToken?: { address?: string; name?: string; symbol?: string };
  quoteToken?: { address?: string; symbol?: string };
  priceUsd?: string;
  priceNative?: string;
  liquidity?: { usd?: number };
  marketCap?: number;
  fdv?: number;
  volume?: { h24?: number };
  priceChange?: { h24?: number };
  info?: { imageUrl?: string };
};

/** Pure: the canonical pair for a token = highest USD liquidity. */
export function pickTopPair(pairs: DexPair[]): DexPair | null {
  if (!Array.isArray(pairs) || pairs.length === 0) return null;
  return pairs.reduce((best, p) => ((p.liquidity?.usd ?? 0) > (best.liquidity?.usd ?? 0) ? p : best));
}

/** Pure: shape the ANSEM DexScreener pairs into the token panel. */
export function parseAnsemMarket(pairs: DexPair[], nowIso: string): TokenPanel {
  const p = pickTopPair(pairs);
  return {
    mint: ANSEM_MINT,
    symbol: "ANSEM",
    name: "The Black Bull",
    priceUsd: p?.priceUsd ? Number(p.priceUsd) : null,
    liquidityUsd: p?.liquidity?.usd ?? null,
    marketCapUsd: p?.marketCap ?? p?.fdv ?? null,
    volume24hUsd: p?.volume?.h24 ?? null,
    priceChange24h: p?.priceChange?.h24 ?? null,
    imageUrl: p?.info?.imageUrl ?? null,
    updatedAt: nowIso,
  };
}

/**
 * Pure: derive SOL/USD from an ANSEM/SOL pair.
 * priceUsd = ANSEM in USD, priceNative = ANSEM in SOL, so SOL/USD = priceUsd / priceNative.
 */
export function solPriceFromPair(p: DexPair | null): number | null {
  if (!p) return null;
  const usd = Number(p.priceUsd);
  const native = Number(p.priceNative);
  return usd > 0 && native > 0 ? usd / native : null;
}

async function fetchPairs(mint: string): Promise<DexPair[]> {
  const res = await fetch(`https://api.dexscreener.com/tokens/v1/solana/${mint}`, {
    next: { revalidate: 60 },
  });
  if (!res.ok) return [];
  return (await res.json()) as DexPair[];
}

/** Fetch ANSEM market + derive the live SOL price from the same canonical pair (one request). */
export async function getMarket(): Promise<{ ansem: TokenPanel; solPriceUsd: number | null }> {
  const pairs = await fetchPairs(ANSEM_MINT);
  const ansem = parseAnsemMarket(pairs, new Date().toISOString());
  const solPriceUsd = solPriceFromPair(pickTopPair(pairs));
  return { ansem, solPriceUsd };
}
