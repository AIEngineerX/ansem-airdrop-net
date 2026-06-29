import type { AirdropSnapshot } from "@/lib/airdrop-snapshot";

const t = (iso: string | null) => (iso ? new Date(iso).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" }) : "—");

export function DataStamp({ snap }: { snap: AirdropSnapshot }) {
  return (
    <p className="text-xs text-zinc-600">
      Data as of {t(snap.collectedAt)} · window {t(snap.totals.windowFrom)} → {t(snap.totals.windowThrough)}
      {snap.backfillComplete ? "" : " · backfill in progress"}
    </p>
  );
}
