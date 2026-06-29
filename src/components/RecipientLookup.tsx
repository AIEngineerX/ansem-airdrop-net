"use client";
import { useState } from "react";
import type { AirdropSnapshot } from "@/lib/airdrop-snapshot";
import { lookupRecipient } from "@/lib/airdrop-view";

const COMMUNITY_URL = "https://x.com/i/communities/2015852887965085806";
const fmt = (n: number) => n.toLocaleString("en-US", { maximumFractionDigits: 0 });
const usdCompact = (n: number) =>
  `$${Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 2 }).format(n)}`;
const day = (iso: string) =>
  new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

export function RecipientLookup({
  snap,
  ansemPriceUsd,
}: {
  snap: AirdropSnapshot;
  ansemPriceUsd: number | null;
}) {
  const [q, setQ] = useState("");
  const [hit, setHit] = useState<ReturnType<typeof lookupRecipient> | "miss" | null>(null);
  const [reveal, setReveal] = useState(0); // bumps each check so the result re-animates
  const run = () => {
    setHit(lookupRecipient(snap, q) ?? "miss");
    setReveal((n) => n + 1);
  };

  return (
    <div className="rounded-2xl border border-white/[0.08] bg-[#0a0a0b] p-4 sm:p-5">
      <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-zinc-500">Did Ansem airdrop you?</p>
      <div className="mt-3 flex gap-2">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && run()}
          placeholder="Paste your wallet address"
          spellCheck={false}
          aria-label="Wallet address"
          className="min-w-0 flex-1 rounded-xl border border-white/[0.12] bg-black/40 px-3 py-2 font-mono text-sm text-zinc-100 outline-none focus:border-[var(--accent)]"
        />
        <button
          onClick={run}
          aria-label="Check if this wallet was airdropped"
          className="rounded-xl bg-[var(--accent)] px-4 text-sm font-medium text-white"
        >
          Check
        </button>
      </div>
      <p className="mt-1.5 text-[11px] text-zinc-500">Runs in your browser · nothing you enter is stored.</p>

      {hit === "miss" && (
        <div
          key={`miss-${reveal}`}
          className="lookup-reveal mt-3 rounded-xl border border-white/[0.1] bg-white/[0.02] p-4"
        >
          <p
            className="font-display text-2xl leading-none text-zinc-300 sm:text-3xl"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Not this drop
          </p>
          <p className="mt-2 text-sm text-zinc-500">
            No $ANSEM from Ansem on that wallet yet. Drops can land anytime. Keep an eye on the{" "}
            <a
              href={COMMUNITY_URL}
              target="_blank"
              rel="noreferrer"
              className="text-[var(--accent-soft)] underline underline-offset-2"
            >
              $ANSEM community
            </a>
            . 🀄
          </p>
        </div>
      )}

      {hit && hit !== "miss" && (
        <div
          key={`hit-${reveal}`}
          className="lookup-reveal mt-3 rounded-xl border border-[var(--accent)]/40 bg-[var(--accent)]/[0.07] p-4"
        >
          <p
            className="font-display text-3xl leading-none text-white sm:text-4xl"
            style={{ fontFamily: "var(--font-display)" }}
          >
            YES <span className="text-[var(--accent-soft)]">🀄</span>
          </p>
          <p className="mt-2 text-sm text-zinc-400">Ansem airdropped you</p>
          <p className="mt-0.5 flex flex-wrap items-baseline gap-x-2">
            <span className="tabular font-mono text-2xl font-bold text-white sm:text-3xl">
              {fmt(hit.totalAnsemUi)} $ANSEM
            </span>
            {ansemPriceUsd != null ? (
              <span className="text-base font-semibold text-[var(--accent-soft)]">
                ≈ {usdCompact(hit.totalAnsemUi * ansemPriceUsd)}
              </span>
            ) : null}
          </p>
          <p className="mt-2 text-xs text-zinc-500">
            {hit.transferCount} drop{hit.transferCount === 1 ? "" : "s"} · {day(hit.firstSeen)}
            {hit.firstSeen !== hit.latestSeen ? ` → ${day(hit.latestSeen)}` : ""}
          </p>
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 font-mono text-xs">
            <a
              href={`https://solscan.io/account/${hit.wallet}`}
              target="_blank"
              rel="noreferrer"
              className="text-zinc-400 underline underline-offset-2 hover:text-zinc-200"
            >
              your wallet ↗
            </a>
            <a
              href={`https://solscan.io/tx/${hit.latestSignature ?? hit.signatures[0]}`}
              target="_blank"
              rel="noreferrer"
              className="text-zinc-400 underline underline-offset-2 hover:text-zinc-200"
            >
              latest airdrop tx ↗
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
