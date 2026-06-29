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

/** Fetch Ansem's live pump.fun creator fees (PumpSwap) and shape them. */
export async function getCreatorRewards(solPriceUsd: number | null): Promise<CreatorRewards> {
  const base = pumpCreatorFeesUrl(PRIMARY_SOURCE_WALLET);
  const [total, series] = await Promise.all([
    fetch(`${base}/total`, { next: { revalidate: 60 } }).then((r) => r.json() as Promise<RawFeeTotal>),
    fetch(`${base}?interval=1d`, { next: { revalidate: 60 } }).then(
      (r) => r.json() as Promise<RawFeeBucket[]>,
    ),
  ]);
  return parseCreatorRewards(total, series, solPriceUsd);
}
