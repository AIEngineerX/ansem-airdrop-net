import type { AirdropSnapshot } from "@/lib/airdrop-snapshot";

const fmt = (n: number) => n.toLocaleString("en-US", { maximumFractionDigits: 0 });
const fmtUsdCompact = (n: number) =>
  `$${Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 2 }).format(n)}`;

export function AirdropStats({
  snap,
  ansemPriceUsd,
}: {
  snap: AirdropSnapshot;
  ansemPriceUsd: number | null;
}) {
  // USD is never stored — derive it live from the ANSEM total × current price.
  const totalUsd = ansemPriceUsd != null ? snap.totals.totalAnsemUi * ansemPriceUsd : null;
  const cards: { label: string; value: string; sub?: string }[] = [
    { label: "Wallets airdropped", value: fmt(snap.totals.uniqueRecipients) },
    {
      label: "Total ANSEM airdropped",
      value: fmt(snap.totals.totalAnsemUi),
      sub: totalUsd != null ? `≈ ${fmtUsdCompact(totalUsd)} at live price` : undefined,
    },
    { label: "Total airdrops", value: fmt(snap.totals.totalAirdrops) },
  ];
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      {cards.map((c) => (
        <div key={c.label} className="rounded-2xl border border-white/[0.08] bg-white/[0.025] p-4 sm:p-5">
          <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-zinc-500">{c.label}</p>
          <p className="tabular mt-2 font-mono text-2xl font-semibold text-zinc-50">{c.value}</p>
          {c.sub ? (
            <p className="tabular mt-1 font-mono text-sm text-[var(--accent-soft)]">{c.sub}</p>
          ) : null}
        </div>
      ))}
    </div>
  );
}
