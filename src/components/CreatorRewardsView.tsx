import Image from "next/image";
import {
  ANSEM_MINT,
  ANSEM_PUMP_PROFILE_URL,
  ANSEM_PUMP_USERNAME,
  ANSEM_X_URL,
  BLACK_BULL_SITE,
  PRIMARY_SOURCE_WALLET,
  type CreatorRewards,
  type FeePoint,
  type TokenPanel,
} from "@/lib/domain";
import { short } from "@/lib/airdrop-view";
import { Unofficial } from "./Unofficial";

// pump.fun's profile "Total fees earned" (bonding-curve + AMM). It is rendered
// server-side on pump.fun and exposed by NO public API, so it can't be fetched live —
// this is a sourced, manually-captured reference. Update both when re-checking the profile.
const PUMP_LIFETIME_USD = "≈ $548K";
const PUMP_LIFETIME_AS_OF = "Jun 29, 2026";
const fmtSol = (n: number) => `${n.toLocaleString("en-US", { maximumFractionDigits: 2 })} SOL`;
const fmtUsd = (n: number | null, max = 0) =>
  n == null ? "—" : `$${n.toLocaleString("en-US", { maximumFractionDigits: max })}`;
const fmtCompact = (n: number | null) =>
  n == null ? "—" : `$${Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 2 }).format(n)}`;
const fmtNum = (n: number) => n.toLocaleString("en-US");
const fmtDay = (iso: string) =>
  new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

function RewardsChart({ points }: { points: FeePoint[] }) {
  if (points.length < 2) return null;
  const w = 800;
  const h = 200;
  const pad = 6;
  const max = Math.max(...points.map((p) => p.cumulativeSol), 1);
  const n = points.length;
  const x = (i: number) => (i / (n - 1)) * (w - 2 * pad) + pad;
  const y = (v: number) => h - pad - (v / max) * (h - 2 * pad);
  const line = points.map((p, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(p.cumulativeSol).toFixed(1)}`).join(" ");
  const area = `${line} L${x(n - 1).toFixed(1)},${h} L${x(0).toFixed(1)},${h} Z`;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className="h-40 w-full sm:h-48" aria-hidden>
      <defs>
        <linearGradient id="fill" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#b11226" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#b11226" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill="url(#fill)" />
      <path d={line} fill="none" stroke="#e0455a" strokeWidth="2" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-2xl border border-white/[0.08] bg-white/[0.025] p-4 sm:p-5">
      <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-zinc-500">{label}</p>
      <p className="tabular mt-2 font-mono text-lg font-semibold text-zinc-50 sm:text-xl">{value}</p>
      {sub ? <p className="mt-1 text-xs text-zinc-500">{sub}</p> : null}
    </div>
  );
}

function TokenSection({ ansem }: { ansem: TokenPanel }) {
  const change = ansem.priceChange24h;
  const up = (change ?? 0) >= 0;
  return (
    <section className="mt-5 rounded-3xl border border-white/[0.08] bg-[#0a0a0b] p-5 sm:p-7">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          {ansem.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={ansem.imageUrl}
              alt="$ANSEM"
              width={44}
              height={44}
              className="h-11 w-11 rounded-full border border-white/10 object-cover"
            />
          ) : null}
          <div>
            <h2 className="text-lg font-semibold text-white">$ANSEM · The Black Bull</h2>
            <p className="font-mono text-[11px] text-zinc-500">{short(ANSEM_MINT)}</p>
          </div>
        </div>
        <a
          href={`https://dexscreener.com/solana/${ANSEM_MINT}`}
          target="_blank"
          rel="noreferrer"
          className="rounded-full border border-white/[0.12] px-3 py-1.5 text-xs text-zinc-300 transition hover:border-white/30"
        >
          chart →
        </a>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <Stat label="Price" value={ansem.priceUsd != null ? `$${ansem.priceUsd.toPrecision(4)}` : "—"} />
        <Stat
          label="24h"
          value={change != null ? `${up ? "+" : ""}${change.toLocaleString("en-US", { maximumFractionDigits: 1 })}%` : "—"}
        />
        <Stat label="Market cap" value={fmtCompact(ansem.marketCapUsd)} />
        <Stat label="Liquidity" value={fmtCompact(ansem.liquidityUsd)} />
        <Stat label="24h volume" value={fmtCompact(ansem.volume24hUsd)} />
      </div>
    </section>
  );
}

export function CreatorRewardsView({
  rewards,
  ansem,
  solPriceUsd,
}: {
  rewards: CreatorRewards;
  ansem: TokenPanel;
  solPriceUsd: number | null;
}) {
  const updated = new Date(ansem.updatedAt ?? new Date().toISOString()).toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });

  return (
    <>
      {/* top bar */}
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.07] py-3">
        <div className="flex items-center gap-2.5">
          <span
            className="font-display text-xl tracking-wide text-white"
            style={{ fontFamily: "var(--font-display)" }}
          >
            BLACK BULL
          </span>
          <span className="hidden text-xs text-zinc-600 sm:inline">creator rewards</span>
        </div>
      </header>

      {/* hero */}
      <section className="relative overflow-hidden rounded-3xl border border-white/[0.08] bg-black">
        <div className="pointer-events-none absolute inset-y-0 right-0 w-[62%] sm:w-[48%]">
          <Image
            src="/black-bull.png"
            alt="The Black Bull — ANSEM token art"
            fill
            priority
            sizes="(max-width: 640px) 62vw, 48vw"
            className="object-cover object-center opacity-70"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black via-black/60 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
        </div>
        <div className="relative max-w-xl px-5 py-10 sm:px-8 sm:py-14">
          <h1
            className="font-display text-4xl leading-[0.95] tracking-tight text-white sm:text-6xl"
            style={{ fontFamily: "var(--font-display)" }}
          >
            ANSEM&apos;S CREATOR REWARDS, ON-CHAIN.
          </h1>
          <p className="mt-4 max-w-md text-sm leading-6 text-zinc-400">
            Live pump.fun creator fees earned by{" "}
            <a href={ANSEM_PUMP_PROFILE_URL} target="_blank" rel="noreferrer" className="text-zinc-200 underline decoration-white/20 underline-offset-2">
              @{ANSEM_PUMP_USERNAME}
            </a>{" "}
            (Ansem / @blknoiz06) from The Black Bull / $ANSEM. Read-only. Attribution per pump.fun profile.
          </p>
          <div className="mt-6 flex flex-wrap gap-2">
            <a
              href={`https://solscan.io/account/${PRIMARY_SOURCE_WALLET}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-9 items-center rounded-full border border-white/[0.14] px-3 font-mono text-xs text-zinc-200 transition hover:border-white/30 hover:bg-white/[0.04]"
            >
              {short(PRIMARY_SOURCE_WALLET)}
            </a>
            <a
              href={ANSEM_PUMP_PROFILE_URL}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-9 items-center rounded-full border border-white/[0.14] px-3 text-xs text-zinc-200 transition hover:border-white/30 hover:bg-white/[0.04]"
            >
              pump.fun profile
            </a>
          </div>
        </div>
      </section>

      {/* creator rewards */}
      <section className="mt-5 rounded-3xl border border-white/[0.08] bg-[#0a0a0b] p-5 sm:p-7">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-zinc-500">
              Creator fees earned · pump.fun lifetime
            </p>
            <p className="tabular mt-2 font-mono text-4xl font-semibold tracking-tight text-white sm:text-5xl">
              {PUMP_LIFETIME_USD}
            </p>
            <a
              href={ANSEM_PUMP_PROFILE_URL}
              target="_blank"
              rel="noreferrer"
              className="mt-1 inline-block text-sm text-zinc-500 underline decoration-white/15 underline-offset-2 transition hover:text-zinc-300"
            >
              as reported by pump.fun · {PUMP_LIFETIME_AS_OF} · view profile →
            </a>
          </div>
          <div className="rounded-xl border border-white/[0.1] bg-white/[0.02] px-3.5 py-2.5 text-right">
            <span className="block text-[11px] uppercase tracking-[0.14em] text-zinc-500">
              Verifiable on-chain · PumpSwap
            </span>
            <span className="tabular mt-1 block font-mono text-base font-semibold text-[var(--accent-soft)]">
              {fmtSol(rewards.totalSol)}
            </span>
            <span className="tabular mt-0.5 block font-mono text-xs text-zinc-400">
              {fmtUsd(rewards.totalUsd)}{" "}
              <span className="text-zinc-600">@ {solPriceUsd ? fmtUsd(solPriceUsd, 2) : "—"}/SOL · live</span>
            </span>
          </div>
        </div>

        <div className="mt-5 rounded-2xl border border-white/[0.06] bg-black/40 p-3">
          <RewardsChart points={rewards.series} />
          <p className="mt-1 px-1 text-[10px] text-zinc-600">
            Cumulative PumpSwap creator fees (SOL){rewards.firstActive ? ` · since ${fmtDay(rewards.firstActive)}` : ""}
          </p>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="Total trades" value={fmtNum(rewards.totalTrades)} />
          <Stat label="Fee days tracked" value={fmtNum(rewards.series.length)} />
          <Stat label="First fee" value={rewards.firstActive ? fmtDay(rewards.firstActive) : "—"} />
          <Stat label="Last fee" value={rewards.lastActive ? fmtDay(rewards.lastActive) : "—"} />
        </div>
      </section>

      {/* ANSEM token panel */}
      <TokenSection ansem={ansem} />

      {/* methodology */}
      <section className="mt-5 rounded-3xl border border-white/[0.08] bg-[#0a0a0b] p-5 text-sm leading-6 text-zinc-400 sm:p-7">
        <h2 className="text-base font-semibold text-white">Methodology &amp; caveats</h2>
        <ul className="mt-3 space-y-2">
          <li>
            The <strong className="text-zinc-300">pump.fun lifetime</strong> figure ({PUMP_LIFETIME_USD}, as of{" "}
            {PUMP_LIFETIME_AS_OF}) is pump.fun&apos;s own &quot;total fees earned&quot; (bonding-curve + AMM). It is
            rendered on their profile and exposed by no public API, so it is a sourced, manually-captured
            reference — not live. The <strong className="text-zinc-300">verifiable on-chain</strong> figure is the
            PumpSwap (post-bonding-curve AMM) portion from pump.fun&apos;s public{" "}
            <code className="text-zinc-400">swap-api</code>, in SOL at the live SOL price — the slice we can confirm
            on-chain.
          </li>
          <li>The $ANSEM panel uses the highest-liquidity DexScreener pair; current value drifts with price.</li>
          <li>
            Wallet {short(PRIMARY_SOURCE_WALLET)} is the{" "}
            <a href={ANSEM_PUMP_PROFILE_URL} target="_blank" rel="noreferrer" className="underline underline-offset-2">
              @{ANSEM_PUMP_USERNAME}
            </a>{" "}
            pump.fun creator wallet (linked to Ansem / @blknoiz06 via the profile).
          </li>
          <li>This is an independent, read-only tracker. Not affiliated with or endorsed by Ansem.</li>
          <li>This is not financial advice and not a trading signal. No wallet connect, signing, or trading exists here.</li>
        </ul>
      </section>

      <footer className="mt-8 flex flex-col items-center gap-2 border-t border-white/[0.07] pt-6 text-center text-xs text-zinc-600">
        <Unofficial />
        <p>
          Data: pump.fun swap-api · DexScreener ·{" "}
          <a href={ANSEM_X_URL} target="_blank" rel="noreferrer" className="underline underline-offset-2">
            @blknoiz06
          </a>{" "}
          ·{" "}
          <a href={BLACK_BULL_SITE} target="_blank" rel="noreferrer" className="underline underline-offset-2">
            blackbullsol.com
          </a>
        </p>
        <p className="text-zinc-700">Updated {updated}</p>
      </footer>
    </>
  );
}
