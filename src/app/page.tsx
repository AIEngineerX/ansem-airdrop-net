import {
  ANSEM_MINT,
  PRIMARY_SOURCE_WALLET,
  SOURCE_ATTRIBUTION,
} from "@/lib/domain";
import { summary, tokenPanel, transfers, recipientsFromTransfers } from "@/lib/dashboard-state";

const short = (value: string) => `${value.slice(0, 6)}…${value.slice(-4)}`;

function StatCard({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <section className="rounded-2xl border border-white/[0.08] bg-white/[0.035] p-5 shadow-[0_1px_0_rgba(255,255,255,0.06)_inset]">
      <p className="text-xs font-medium uppercase tracking-[0.18em] text-zinc-500">{label}</p>
      <p className="mt-4 text-2xl font-semibold tracking-tight text-zinc-50">{value}</p>
      <p className="mt-2 text-sm leading-6 text-zinc-500">{detail}</p>
    </section>
  );
}

function EmptyRow({ columns, label }: { columns: number; label: string }) {
  return (
    <tr>
      <td colSpan={columns} className="px-4 py-8 text-center text-sm text-zinc-500">
        {label}
      </td>
    </tr>
  );
}

export default function Home() {
  const recipients = recipientsFromTransfers(transfers);

  return (
    <main className="min-h-screen bg-[#050506] text-zinc-100">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-5 py-6 sm:px-8 lg:px-10">
        <header className="flex flex-col gap-5 border-b border-white/[0.08] pb-8 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <div className="mb-4 flex items-center gap-3 text-xs uppercase tracking-[0.22em] text-zinc-500">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              Read-only Solana ledger
            </div>
            <h1 className="text-balance text-4xl font-semibold tracking-[-0.045em] text-white sm:text-6xl">
              Ansem airdrop flow, tracked cleanly.
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-zinc-400">
              {SOURCE_ATTRIBUTION}
            </p>
          </div>
          <a
            className="inline-flex h-11 items-center justify-center rounded-full border border-white/[0.12] px-4 text-sm font-medium text-zinc-200 transition hover:border-white/25 hover:bg-white/[0.04]"
            href={`https://solscan.io/account/${PRIMARY_SOURCE_WALLET}`}
            rel="noreferrer"
            target="_blank"
          >
            View wallet {short(PRIMARY_SOURCE_WALLET)}
          </a>
        </header>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Tracked wallet"
            value={short(summary.trackedWallet.walletAddress)}
            detail="Pump profile association; not an exhaustive identity claim."
          />
          <StatCard
            label="Transfers"
            value={String(summary.transferCount)}
            detail="Collector has not written a live ledger yet."
          />
          <StatCard
            label="Recipients"
            value={String(summary.uniqueRecipients)}
            detail="Unique destination wallets parsed from outgoing sends."
          />
          <StatCard
            label="Unparsed txs"
            value={String(summary.unparsedTransactionCount)}
            detail="Parser failures stay visible instead of disappearing."
          />
        </section>

        <section className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="rounded-3xl border border-white/[0.08] bg-[#0a0a0b] p-6">
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-zinc-500">ANSEM token</p>
            <div className="mt-5 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-2xl font-semibold tracking-tight text-white">{tokenPanel.name}</h2>
                <p className="mt-2 font-mono text-xs text-zinc-500">{ANSEM_MINT}</p>
              </div>
              <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-xs font-medium text-emerald-300">
                {tokenPanel.symbol}
              </span>
            </div>
            <dl className="mt-8 grid grid-cols-2 gap-4 text-sm">
              {[
                ["Price", tokenPanel.priceUsd ? `$${tokenPanel.priceUsd}` : "—"],
                ["Liquidity", tokenPanel.liquidityUsd ? `$${tokenPanel.liquidityUsd}` : "—"],
                ["Market cap", tokenPanel.marketCapUsd ? `$${tokenPanel.marketCapUsd}` : "—"],
                ["24h volume", tokenPanel.volume24hUsd ? `$${tokenPanel.volume24hUsd}` : "—"],
              ].map(([label, value]) => (
                <div key={label} className="rounded-2xl border border-white/[0.06] bg-white/[0.025] p-4">
                  <dt className="text-zinc-500">{label}</dt>
                  <dd className="mt-2 font-mono text-base text-zinc-100">{value}</dd>
                </div>
              ))}
            </dl>
          </div>

          <div className="rounded-3xl border border-white/[0.08] bg-[#0a0a0b] p-6">
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-zinc-500">Method</p>
            <div className="mt-5 space-y-4 text-sm leading-6 text-zinc-400">
              <p>Only outgoing transfers from the tracked source wallet are counted.</p>
              <p>Main ANSEM is identified by mint, never by symbol.</p>
              <p>Current value is allowed. Exact at-transfer value requires stored price snapshots.</p>
              <p>No wallet connection, claim flow, signing, swaps, or trading exists here.</p>
            </div>
          </div>
        </section>

        <section className="overflow-hidden rounded-3xl border border-white/[0.08] bg-[#0a0a0b]">
          <div className="flex items-center justify-between border-b border-white/[0.08] px-5 py-4">
            <div>
              <h2 className="text-base font-semibold text-white">Transfers</h2>
              <p className="mt-1 text-sm text-zinc-500">One row per parsed recipient transfer.</p>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-left text-sm">
              <thead className="border-b border-white/[0.08] text-xs uppercase tracking-[0.14em] text-zinc-500">
                <tr>
                  <th className="px-4 py-3 font-medium">Time</th>
                  <th className="px-4 py-3 font-medium">Asset</th>
                  <th className="px-4 py-3 font-medium">Amount</th>
                  <th className="px-4 py-3 font-medium">Recipient</th>
                  <th className="px-4 py-3 font-medium">Confidence</th>
                  <th className="px-4 py-3 font-medium">Tx</th>
                </tr>
              </thead>
              <tbody>
                {transfers.length === 0 ? (
                  <EmptyRow columns={6} label="No transfer ledger loaded. Run the collector to populate this table." />
                ) : null}
              </tbody>
            </table>
          </div>
        </section>

        <section className="overflow-hidden rounded-3xl border border-white/[0.08] bg-[#0a0a0b]">
          <div className="border-b border-white/[0.08] px-5 py-4">
            <h2 className="text-base font-semibold text-white">Recipients</h2>
            <p className="mt-1 text-sm text-zinc-500">Wallets that received parsed outgoing transfers.</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px] text-left text-sm">
              <thead className="border-b border-white/[0.08] text-xs uppercase tracking-[0.14em] text-zinc-500">
                <tr>
                  <th className="px-4 py-3 font-medium">Wallet</th>
                  <th className="px-4 py-3 font-medium">Transfers</th>
                  <th className="px-4 py-3 font-medium">First seen</th>
                  <th className="px-4 py-3 font-medium">Latest seen</th>
                </tr>
              </thead>
              <tbody>
                {recipients.length === 0 ? (
                  <EmptyRow columns={4} label="No recipients loaded." />
                ) : null}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}
