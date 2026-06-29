import { XTimeline } from "./XTimeline";

const ANSEM_HANDLE = "blknoiz06";
const COMMUNITY_URL = "https://x.com/i/communities/2015852887965085806";

/**
 * Right rail beside the airdrop web: a card linking the $ANSEM X Community
 * (Communities have no official embed) + a live embedded timeline of Ansem's
 * posts.
 */
export function XRail() {
  return (
    <div className="flex flex-col gap-3">
      <a
        href={COMMUNITY_URL}
        target="_blank"
        rel="noreferrer"
        className="group flex items-center justify-between rounded-2xl border border-[var(--accent)]/30 bg-[var(--accent)]/[0.06] px-4 py-3 transition hover:border-[var(--accent)]/60"
      >
        <span>
          <span className="block text-[11px] font-medium uppercase tracking-[0.16em] text-zinc-500">
            $ANSEM on X
          </span>
          <span className="block text-sm font-semibold text-zinc-100">Join the community</span>
        </span>
        <span className="text-lg text-[var(--accent-soft)] transition group-hover:translate-x-0.5">
          →
        </span>
      </a>

      <div className="overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0a0a0b]">
        <p className="border-b border-white/[0.06] px-4 py-3 text-[11px] font-medium uppercase tracking-[0.16em] text-zinc-500">
          Ansem on X · @{ANSEM_HANDLE}
        </p>
        <div className="px-2 pb-1">
          <XTimeline handle={ANSEM_HANDLE} height={460} />
        </div>
      </div>
    </div>
  );
}
