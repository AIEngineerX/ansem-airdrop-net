import type { AirdropSnapshot } from "@/lib/airdrop-snapshot";

const fmt = (n: number) => n.toLocaleString("en-US", { maximumFractionDigits: 0 });

export function AirdropStats({ snap }: { snap: AirdropSnapshot }) {
  const cards = [
    { label: "Wallets airdropped", value: fmt(snap.totals.uniqueRecipients) },
    { label: "Total ANSEM airdropped", value: fmt(snap.totals.totalAnsemUi) },
    { label: "Total airdrops", value: fmt(snap.totals.totalAirdrops) },
  ];
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      {cards.map((c) => (
        <div key={c.label} className="rounded-2xl border border-white/[0.08] bg-white/[0.025] p-4 sm:p-5">
          <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-zinc-500">{c.label}</p>
          <p className="tabular mt-2 font-mono text-2xl font-semibold text-zinc-50">{c.value}</p>
        </div>
      ))}
    </div>
  );
}
