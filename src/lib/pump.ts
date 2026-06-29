import {
  ANSEM_PUMP_USERNAME,
  PRIMARY_SOURCE_WALLET,
  pumpCreatorFeesUrl,
  type CreatorRewards,
  type FeePoint,
} from "./domain";

export type RawFeeTotal = { totalFees: string; totalFeesSOL: string };
export type RawFeeBucket = {
  bucket: string;
  creatorFee: string;
  creatorFeeSOL: string;
  numTrades: number;
  cumulativeCreatorFee: string;
  cumulativeCreatorFeeSOL: string;
};

/** Pure: shape the pump.fun swap-api creator-fee responses into the dashboard model. */
export function parseCreatorRewards(
  total: RawFeeTotal,
  series: RawFeeBucket[],
  solPriceUsd: number | null,
): CreatorRewards {
  const points: FeePoint[] = series.map((b) => ({
    date: b.bucket,
    cumulativeSol: Number(b.cumulativeCreatorFeeSOL),
    dailySol: Number(b.creatorFeeSOL),
    trades: b.numTrades,
  }));
  const active = points.filter((p) => p.trades > 0 || p.dailySol > 0);
  const totalSol = Number(total.totalFeesSOL);
  return {
    wallet: PRIMARY_SOURCE_WALLET,
    username: ANSEM_PUMP_USERNAME,
    totalSol,
    totalUsd: solPriceUsd != null ? totalSol * solPriceUsd : null,
    totalTrades: points.reduce((s, p) => s + p.trades, 0),
    series: points,
    firstActive: active[0]?.date ?? null,
    lastActive: active[active.length - 1]?.date ?? null,
  };
}

/** Safe-empty rewards used when pump.fun's swap-api is down/non-OK/non-JSON. */
function emptyCreatorRewards(): CreatorRewards {
  return {
    wallet: PRIMARY_SOURCE_WALLET,
    username: ANSEM_PUMP_USERNAME,
    totalSol: 0,
    totalUsd: null,
    totalTrades: 0,
    series: [],
    firstActive: null,
    lastActive: null,
  };
}

async function fetchJson<T>(url: string): Promise<T> {
  const r = await fetch(url, { next: { revalidate: 60 } });
  if (!r.ok) throw new Error(`pump.fun ${r.status} ${r.statusText} for ${url}`);
  return (await r.json()) as T;
}

/**
 * Fetch Ansem's live pump.fun creator fees (PumpSwap) and shape them.
 * Never throws: an upstream 429/5xx/non-JSON returns safe-empty rewards so the
 * server-rendered page (and `next build`) can't be taken down by a secondary-tab
 * API hiccup. `parseCreatorRewards` stays pure.
 */
export async function getCreatorRewards(solPriceUsd: number | null): Promise<CreatorRewards> {
  try {
    const base = pumpCreatorFeesUrl(PRIMARY_SOURCE_WALLET);
    const [total, series] = await Promise.all([
      fetchJson<RawFeeTotal>(`${base}/total`),
      fetchJson<RawFeeBucket[]>(`${base}?interval=1d`),
    ]);
    return parseCreatorRewards(total, Array.isArray(series) ? series : [], solPriceUsd);
  } catch {
    return emptyCreatorRewards();
  }
}
