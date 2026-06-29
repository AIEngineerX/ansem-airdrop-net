const ANSEM_HANDLE = "blknoiz06";
const PROFILE_URL = `https://x.com/${ANSEM_HANDLE}`;
const COMMUNITY_URL = "https://x.com/i/communities/2015852887965085806";

/**
 * Right rail beside the airdrop web: links to Ansem's X profile and the $ANSEM
 * X Community. (X has restricted unauthenticated profile-timeline embeds — the
 * old widget rendered a blank box — so these are plain link cards: reliable,
 * always render, and add zero third-party JavaScript.)
 */
export function XRail() {
  return (
    <div className="flex flex-col gap-3">
      <a
        href={PROFILE_URL}
        target="_blank"
        rel="noreferrer"
        className="group flex flex-col gap-1.5 rounded-2xl border border-white/[0.08] bg-[#0a0a0b] p-5 transition hover:border-white/[0.18]"
      >
        <span className="text-[11px] font-medium uppercase tracking-[0.16em] text-zinc-500">Ansem on X</span>
        <span className="text-lg font-semibold text-zinc-100">@{ANSEM_HANDLE}</span>
        <span className="text-sm text-zinc-500">The Black Bull · $ANSEM creator</span>
        <span className="mt-1 inline-flex items-center gap-1 text-sm text-[var(--accent-soft)]">
          Follow on X <span className="transition group-hover:translate-x-0.5">→</span>
        </span>
      </a>

      <a
        href={COMMUNITY_URL}
        target="_blank"
        rel="noreferrer"
        className="group flex items-center justify-between rounded-2xl border border-[var(--accent)]/30 bg-[var(--accent)]/[0.06] px-5 py-4 transition hover:border-[var(--accent)]/60"
      >
        <span className="flex flex-col">
          <span className="text-[11px] font-medium uppercase tracking-[0.16em] text-zinc-500">$ANSEM on X</span>
          <span className="text-sm font-semibold text-zinc-100">Join the community</span>
        </span>
        <span className="text-lg text-[var(--accent-soft)] transition group-hover:translate-x-0.5">→</span>
      </a>
    </div>
  );
}
