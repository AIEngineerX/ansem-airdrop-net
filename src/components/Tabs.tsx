"use client";
import { useState, type ReactNode } from "react";

export function Tabs({ creatorRewards }: { creatorRewards: ReactNode }) {
  const [tab, setTab] = useState<"web" | "rewards">("web");
  return (
    <div className="grain mx-auto w-full max-w-6xl flex-1 px-4 pb-16 pt-4 sm:px-6 lg:px-8">
      <div className="mt-2 inline-flex rounded-full border border-white/[0.1] bg-white/[0.02] p-1 text-sm">
        <button onClick={() => setTab("web")} className={`rounded-full px-4 py-1.5 transition ${tab === "web" ? "bg-[var(--accent)] text-white" : "text-zinc-400 hover:text-zinc-200"}`}>Airdrop Web</button>
        <button onClick={() => setTab("rewards")} className={`rounded-full px-4 py-1.5 transition ${tab === "rewards" ? "bg-[var(--accent)] text-white" : "text-zinc-400 hover:text-zinc-200"}`}>Creator Rewards</button>
      </div>
      {tab === "web" ? <AirdropWebPlaceholder /> : <div className="mt-4">{creatorRewards}</div>}
    </div>
  );
}

function AirdropWebPlaceholder() {
  return <div className="mt-6 text-zinc-500">Airdrop web loading…</div>;
}
