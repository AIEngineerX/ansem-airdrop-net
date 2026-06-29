import type { AirdropSnapshot } from "@/lib/airdrop-snapshot";

const t = (iso: string | null) => (iso ? new Date(iso).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" }) : "—");

export function DataStamp({ snap, loading }: { snap: AirdropSnapshot; loading?: boolean }) {
  if (loading) return <p className="text-xs text-zinc-500">Loading the latest airdrop data…</p>;
  return (
    <p className="text-xs text-zinc-500">
      Live · last updated {t(snap.collectedAt)} · refreshes automatically about every 15 minutes. Covers{" "}
      {t(snap.totals.windowFrom)} → {t(snap.totals.windowThrough)}
      {snap.backfillComplete ? "." : " · still scanning older history."}
    </p>
  );
}
