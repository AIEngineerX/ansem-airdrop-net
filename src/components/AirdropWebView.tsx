"use client";
import type { AirdropSnapshot } from "@/lib/airdrop-snapshot";
import { AirdropStats } from "./AirdropStats";
import { AirdropGraph } from "./AirdropGraph";
import { AirdropFeed } from "./AirdropFeed";
import { RecipientLookup } from "./RecipientLookup";
import { DataStamp } from "./DataStamp";
import { XRail } from "./XRail";

export function AirdropWebView({
  snap,
  loading,
  ansemPriceUsd,
}: {
  snap: AirdropSnapshot;
  loading: boolean;
  ansemPriceUsd: number | null;
}) {
  return (
    <div className="mt-5 space-y-5">
      <p className="text-sm text-zinc-500">
        Unofficial, read-only tracker of every wallet Ansem&rsquo;s creator wallet airdropped $ANSEM to — read straight from Solana on-chain data via Helius.
      </p>
      <AirdropStats snap={snap} ansemPriceUsd={ansemPriceUsd} />
      <div className="grid gap-5 lg:grid-cols-[1fr_340px]">
        <AirdropGraph snap={snap} loading={loading} />
        <XRail />
      </div>
      <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
        <AirdropFeed snap={snap} loading={loading} />
        <RecipientLookup snap={snap} ansemPriceUsd={ansemPriceUsd} />
      </div>
      <DataStamp snap={snap} loading={loading} />

      {/* How this works */}
      <section className="rounded-2xl border border-white/[0.08] bg-[#0a0a0b] p-5 text-sm leading-6 text-zinc-400 sm:p-6">
        <h2 className="text-sm font-semibold text-zinc-300">How this works</h2>
        <ul className="mt-3 space-y-2">
          <li>
            <strong className="text-zinc-300">On-chain data.</strong> Every airdrop is read directly from the Solana blockchain via Helius RPC — no third-party databases, no estimates.
          </li>
          <li>
            <strong className="text-zinc-300">Exact mint match.</strong> Only genuine $ANSEM tokens (mint <span className="font-mono text-[11px]">9cRCn9…pump</span>) are counted. Copycat tokens are ignored.
          </li>
          <li>
            <strong className="text-zinc-300">SOL dust excluded.</strong> The tiny SOL sent to fund token accounts is not shown — only the actual $ANSEM transfers appear in the graph and stats.
          </li>
          <li>
            <strong className="text-zinc-300">USD value drifts.</strong> The dollar estimate is the ANSEM total × the current market price, so it changes as the price moves.
          </li>
          <li>
            <strong className="text-zinc-300">Read-only.</strong> This site cannot connect to, access, or move any wallet. There is no wallet connect, signing, or trading here.
          </li>
          <li>
            <strong className="text-zinc-300">Nothing is stored.</strong> The &ldquo;Did Ansem airdrop you?&rdquo; check runs entirely in your browser — the wallet you type is never sent to a server, logged, or saved.
          </li>
          <li className="text-zinc-500">
            Independent tracker · not financial advice.
          </li>
        </ul>
        <p className="mt-4 text-xs text-zinc-500">
          Built by{" "}
          <a
            href="https://x.com/DaddyGhost"
            target="_blank"
            rel="noreferrer"
            className="text-[var(--accent-soft)] underline underline-offset-2"
          >
            @DaddyGhost
          </a>
        </p>
      </section>
    </div>
  );
}
