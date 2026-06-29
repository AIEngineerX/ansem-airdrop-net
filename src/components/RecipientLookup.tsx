"use client";
import { useState } from "react";
import type { AirdropSnapshot } from "@/lib/airdrop-snapshot";
import { lookupRecipient } from "@/lib/airdrop-view";

const fmt = (n: number) => n.toLocaleString("en-US", { maximumFractionDigits: 0 });
const day = (iso: string) => new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

export function RecipientLookup({ snap }: { snap: AirdropSnapshot }) {
  const [q, setQ] = useState("");
  const [hit, setHit] = useState<ReturnType<typeof lookupRecipient> | "miss" | null>(null);
  const run = () => setHit(lookupRecipient(snap, q) ?? "miss");
  return (
    <div className="rounded-2xl border border-white/[0.08] bg-[#0a0a0b] p-4 sm:p-5">
      <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-zinc-500">Did Ansem airdrop you?</p>
      <div className="mt-3 flex gap-2">
        <input value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === "Enter" && run()}
          placeholder="Paste your wallet address" spellCheck={false}
          className="min-w-0 flex-1 rounded-xl border border-white/[0.12] bg-black/40 px-3 py-2 font-mono text-sm text-zinc-100 outline-none focus:border-[var(--accent)]" />
        <button onClick={run} className="rounded-xl bg-[var(--accent)] px-4 text-sm font-medium text-white">Check</button>
      </div>
      {hit === "miss" && <p className="mt-3 text-sm text-zinc-500">No airdrop found for that wallet.</p>}
      {hit && hit !== "miss" && (
        <div className="mt-3 rounded-xl border border-[var(--accent)]/30 bg-[var(--accent)]/[0.06] p-3 text-sm">
          <p className="text-zinc-200">Airdropped <span className="tabular font-mono font-semibold">{fmt(hit.totalAnsemUi)} ANSEM</span> across {hit.transferCount} transfer{hit.transferCount === 1 ? "" : "s"}.</p>
          <p className="mt-1 text-zinc-500">First {day(hit.firstSeen)} · last {day(hit.latestSeen)}</p>
          <a href={`https://solscan.io/tx/${hit.latestSignature ?? hit.signatures[0]}`} target="_blank" rel="noreferrer" className="mt-1 inline-block font-mono text-xs text-zinc-400 underline underline-offset-2">latest tx →</a>
        </div>
      )}
    </div>
  );
}
