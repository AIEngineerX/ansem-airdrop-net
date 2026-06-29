"use client";
import Link from "next/link";
import { useState, useEffect, type ReactNode } from "react";
import { EMPTY_SNAPSHOT, type AirdropSnapshot } from "@/lib/airdrop-snapshot";
import { fetchSnapshot, LIVE_SNAPSHOT_ENABLED } from "@/lib/snapshot-client";
import { AirdropWebView } from "./AirdropWebView";
import { AnsemArmyView } from "./AnsemArmyView";
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
  const [tab, setTab] = useState<"web" | "army" | "rewards">("web");
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
    <div className="mx-auto w-full max-w-6xl flex-1 px-4 pb-16 pt-4 sm:px-6 lg:px-8">
      <div className="mt-2 flex items-center justify-between gap-3">
        <Link
          href="/"
          aria-label="did ansem airdrop me — home"
          className="font-display text-xl tracking-wide text-white sm:text-2xl"
          style={{ fontFamily: "var(--font-display)" }}
        >
          did ansem airdrop me<span className="text-[var(--accent)]">?</span>
        </Link>
        <Unofficial />
      </div>
      <div role="tablist" className="mt-3 inline-flex rounded-full border border-white/[0.1] bg-white/[0.02] p-1 text-sm">
        <button
          id="tab-web"
          role="tab"
          aria-selected={tab === "web"}
          aria-controls="panel-web"
          onClick={() => setTab("web")}
          className={`rounded-full px-4 py-1.5 transition ${tab === "web" ? "bg-[var(--accent)] text-white" : "text-zinc-400 hover:text-zinc-200"}`}
        >
          Airdrop Web
        </button>
        <button
          id="tab-army"
          role="tab"
          aria-selected={tab === "army"}
          aria-controls="panel-army"
          onClick={() => setTab("army")}
          className={`rounded-full px-4 py-1.5 transition ${tab === "army" ? "bg-[var(--accent)] text-white" : "text-zinc-400 hover:text-zinc-200"}`}
        >
          Ansem Army
        </button>
        <button
          id="tab-rewards"
          role="tab"
          aria-selected={tab === "rewards"}
          aria-controls="panel-rewards"
          onClick={() => setTab("rewards")}
          className={`rounded-full px-4 py-1.5 transition ${tab === "rewards" ? "bg-[var(--accent)] text-white" : "text-zinc-400 hover:text-zinc-200"}`}
        >
          Creator Rewards
        </button>
      </div>
      {/* Both panels stay mounted; CSS toggle avoids re-fetch on tab switch */}
      <div
        id="panel-web"
        role="tabpanel"
        aria-labelledby="tab-web"
        tabIndex={0}
        className={tab === "web" ? "" : "hidden"}
      >
        <AirdropWebView snap={snap} loading={loading} ansemPriceUsd={ansemPriceUsd} />
      </div>
      <div
        id="panel-army"
        role="tabpanel"
        aria-labelledby="tab-army"
        tabIndex={0}
        className={tab === "army" ? "" : "hidden"}
      >
        <AnsemArmyView snap={snap} loading={loading} ansemPriceUsd={ansemPriceUsd} />
      </div>
      <div
        id="panel-rewards"
        role="tabpanel"
        aria-labelledby="tab-rewards"
        tabIndex={0}
        className={tab === "rewards" ? "mt-4" : "hidden"}
      >
        {creatorRewards}
      </div>
    </div>
  );
}
