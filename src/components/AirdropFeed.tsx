"use client";
import { useEffect, useState } from "react";
import type { AirdropSnapshot } from "@/lib/airdrop-snapshot";
import { short, timeAgo } from "@/lib/airdrop-view";

const fmt = (n: number) => n.toLocaleString("en-US", { maximumFractionDigits: 0 });

export function AirdropFeed({ snap, loading }: { snap: AirdropSnapshot; loading?: boolean }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => { const id = setInterval(() => setNow(Date.now()), 30000); return () => clearInterval(id); }, []);
  const isEmpty = snap.feed.length === 0;
  return (
    <div className="rounded-2xl border border-white/[0.08] bg-[#0a0a0b]">
      <p className="border-b border-white/[0.06] px-4 py-3 text-[11px] font-medium uppercase tracking-[0.16em] text-zinc-500">Recent airdrops</p>
      <ul aria-busy={isEmpty || loading} className="max-h-[420px] divide-y divide-white/[0.05] overflow-y-auto">
        {isEmpty ? (
          <li className="px-4 py-3 text-sm text-zinc-500">Loading recent airdrops…</li>
        ) : (
          snap.feed.map((f) => (
            <li key={f.signature + f.wallet} className="flex items-center justify-between gap-3 px-4 py-2.5">
              <span className="flex items-center gap-2 truncate">
                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--accent)]" />
                <span className="tabular font-mono text-sm text-zinc-200">{fmt(f.amountUi)} ANSEM</span>
                <span className="text-zinc-500">→</span>
                <a href={f.txUrl} target="_blank" rel="noreferrer" className="font-mono text-xs text-zinc-400 underline decoration-white/15 underline-offset-2">{short(f.wallet)}</a>
              </span>
              <span className="shrink-0 text-xs text-zinc-500">{timeAgo(f.blockTime, now)}</span>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
