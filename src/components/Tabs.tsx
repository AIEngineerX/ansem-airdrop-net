"use client";
import { useState, useEffect, type ReactNode } from "react";
import { EMPTY_SNAPSHOT, type AirdropSnapshot } from "@/lib/airdrop-snapshot";
import { fetchSnapshot, LIVE_SNAPSHOT_ENABLED } from "@/lib/snapshot-client";
import { AirdropWebView } from "./AirdropWebView";
import { Unofficial } from "./Unofficial";

// How often an open tab re-checks for a fresher snapshot (live mode only).
const POLL_MS = 120_000;

export function Tabs({
  creatorRewards,
  ansemPriceUsd,
}: {
  creatorRewards: ReactNode;
  ansemPriceUsd: number | null;
}) {
  const [tab, setTab] = useState<"web" | "rewards">("web");
  const [snap, setSnap] = useState(EMPTY_SNAPSHOT);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    const apply = (s: AirdropSnapshot) => {
      if (!alive) return;
      // Only swap state when the data actually changed, so polling never
      // re-lays-out the graph for an identical snapshot.
      setSnap((prev) => (s.collectedAt !== prev.collectedAt ? s : prev));
      setLoading(false);
    };
    fetchSnapshot().then(apply);
    // Seed-only mode is static — no point polling a file that never changes.
    if (!LIVE_SNAPSHOT_ENABLED) return () => { alive = false; };
    const id = setInterval(() => fetchSnapshot().then(apply), POLL_MS);
    return () => { alive = false; clearInterval(id); };
  }, []);

  return (
    <div className="grain mx-auto w-full max-w-6xl flex-1 px-4 pb-16 pt-4 sm:px-6 lg:px-8">
      <div className="mt-2 flex items-center justify-between gap-3">
        <div className="inline-flex rounded-full border border-white/[0.1] bg-white/[0.02] p-1 text-sm">
          <button onClick={() => setTab("web")} className={`rounded-full px-4 py-1.5 transition ${tab === "web" ? "bg-[var(--accent)] text-white" : "text-zinc-400 hover:text-zinc-200"}`}>Airdrop Web</button>
          <button onClick={() => setTab("rewards")} className={`rounded-full px-4 py-1.5 transition ${tab === "rewards" ? "bg-[var(--accent)] text-white" : "text-zinc-400 hover:text-zinc-200"}`}>Creator Rewards</button>
        </div>
        <Unofficial />
      </div>
      {/* Both panels stay mounted; CSS toggle avoids re-fetch on tab switch */}
      <div className={tab === "web" ? "" : "hidden"}>
        <AirdropWebView snap={snap} loading={loading} ansemPriceUsd={ansemPriceUsd} />
      </div>
      <div className={tab === "rewards" ? "mt-4" : "hidden"}>
        {creatorRewards}
      </div>
    </div>
  );
}
