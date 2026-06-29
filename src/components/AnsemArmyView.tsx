"use client";
import { useState } from "react";
import type { AirdropSnapshot } from "@/lib/airdrop-snapshot";
import { armyRows, short } from "@/lib/airdrop-view";

const fmt = (n: number) => n.toLocaleString("en-US", { maximumFractionDigits: 0 });
const compactUsd = (n: number) =>
  "$" + new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(n);
const solscan = (w: string) => `https://solscan.io/account/${w}`;

function holdingLabel(held: number | undefined, airdropped: number): { text: string; flair: string } {
  if (held === undefined) return { text: "—", flair: "" };
  const kept = airdropped > 0 ? held / airdropped : 0;
  const flair = kept >= 0.8 ? "💎" : kept <= 0.2 ? "📉" : "";
  return { text: `${fmt(held)} · kept ${Math.round(kept * 100)}%`, flair };
}

export function AnsemArmyView({
  snap,
  loading,
  ansemPriceUsd,
}: {
  snap: AirdropSnapshot;
  loading: boolean;
  ansemPriceUsd: number | null;
}) {
  const [query, setQuery] = useState("");
  const [limit, setLimit] = useState(50);
  const view = armyRows(snap.recipients, query, limit);

  return (
    <div className="mt-5 space-y-4">
      <div>
        <h2
          className="font-display text-2xl tracking-wide text-white sm:text-3xl"
          style={{ fontFamily: "var(--font-display)" }}
        >
          The Ansem Army <span className="align-middle">🐂🀄</span>
        </h2>
        <p className="mt-1 text-sm text-zinc-500">
          Every wallet The Black Bull dropped $ANSEM to — {fmt(snap.totals.uniqueRecipients)} strong and counting.
        </p>
      </div>

      <input
        type="text"
        inputMode="text"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setLimit(50);
        }}
        placeholder="Search any wallet…"
        aria-label="Search the Ansem Army by wallet address"
        className="w-full rounded-xl border border-white/[0.1] bg-white/[0.02] px-4 py-2.5 font-mono text-sm text-zinc-200 placeholder:text-zinc-600 focus:border-[var(--accent)]/50 focus:outline-none"
      />

      <div className="overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0a0a0b]">
        <ul aria-busy={loading} className="divide-y divide-white/[0.05]">
          {loading ? (
            <li className="px-4 py-3 text-sm text-zinc-500">Loading the Army…</li>
          ) : view.total === 0 ? (
            <li className="px-4 py-3 text-sm text-zinc-500">
              {query ? `No wallet matches “${query}” in the Army yet.` : "No recipients to show yet."}
            </li>
          ) : (
            view.rows.map((r) => {
              const top3 = r.rank <= 3;
              const usd = ansemPriceUsd != null ? r.totalAnsemUi * ansemPriceUsd : null;
              const hold = holdingLabel(r.heldAnsemUi, r.totalAnsemUi);
              return (
                <li key={r.wallet}>
                  <a
                    href={solscan(r.wallet)}
                    target="_blank"
                    rel="noreferrer"
                    className={`flex items-center gap-3 px-4 py-2.5 transition hover:bg-white/[0.02] ${top3 ? "bg-[var(--accent)]/[0.04]" : ""}`}
                  >
                    <span
                      className={`flex w-12 shrink-0 items-center gap-1 font-mono text-sm ${top3 ? "text-[var(--accent-soft)]" : "text-zinc-500"}`}
                    >
                      {top3 ? "🀄" : ""}#{r.rank}
                    </span>
                    <span className="flex-1 truncate font-mono text-sm text-zinc-200">{short(r.wallet)}</span>
                    <span className="hidden w-40 shrink-0 text-right font-mono text-sm text-zinc-300 sm:block">
                      {fmt(r.totalAnsemUi)} {usd != null && <span className="text-zinc-500">≈ {compactUsd(usd)}</span>}
                    </span>
                    <span className="hidden w-16 shrink-0 text-right text-xs text-zinc-500 sm:block">
                      {r.transferCount} drop{r.transferCount === 1 ? "" : "s"}
                    </span>
                    <span className="w-36 shrink-0 text-right text-xs text-zinc-400">
                      {hold.text} {hold.flair}
                    </span>
                    <span className="shrink-0 text-zinc-600">↗</span>
                  </a>
                </li>
              );
            })
          )}
        </ul>
        {!loading && view.hasMore && (
          <button
            type="button"
            onClick={() => setLimit((l) => l + 50)}
            className="w-full border-t border-white/[0.06] px-4 py-3 text-sm text-[var(--accent-soft)] transition hover:bg-white/[0.03]"
          >
            Load more (+{Math.min(50, view.total - view.shown)})
          </button>
        )}
      </div>

      <p className="text-xs text-zinc-600">
        Holdings shown for the top 50 by airdrop size, as of the last refresh. “—” = not tracked.
      </p>
    </div>
  );
}
