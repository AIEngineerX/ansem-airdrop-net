"use client";

import Link from "next/link";

// Branded error boundary: the safety net if any *remaining* unhandled error escapes the
// guarded server fetches (price.ts / pump.ts). Shows the site's dark oxblood skin instead
// of Next's default white error page.
export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-[#050506] px-6 text-center">
      <p className="font-mono text-xs uppercase tracking-[0.3em] text-[#e0455a]">Error</p>
      <h1 className="font-display text-3xl text-[#ededed] sm:text-4xl">Something went wrong</h1>
      <p className="max-w-md text-sm text-zinc-400">
        The airdrop web hit a snag while loading. This is a read-only on-chain tracker — nothing
        you hold was touched.
      </p>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          onClick={reset}
          className="rounded-full border border-[#b11226] bg-[#b11226]/15 px-5 py-2 text-sm text-[#e0455a] transition hover:bg-[#b11226]/25"
        >
          Try again
        </button>
        <Link
          href="/"
          className="rounded-full border border-white/[0.12] px-5 py-2 text-sm text-zinc-300 transition hover:border-white/25"
        >
          Back home
        </Link>
      </div>
    </main>
  );
}
