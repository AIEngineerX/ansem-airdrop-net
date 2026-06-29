# ansem-airdrop-net — Deploy Guide

The site ships in two phases. **Phase 1 (now)** gets a working live URL serving the
real, committed seed snapshot (692 wallets) — static, no moving parts. **Phase 2
(later, optional)** turns on auto-updating live data.

---

## Phase 1 — Ship seed-only (do this now)

The app reads its snapshot from the committed `public/snapshot.seed.json` (served at
`/snapshot.seed.json`). `src/lib/snapshot-client.ts` has `LIVE_SNAPSHOT_ENABLED = false`,
so it serves the seed directly and makes no external data call. Real data, static until
you do Phase 2.

### 1. Push the branch and merge

```bash
git push -u origin feat/airdrop-web
```

Open a PR on GitHub and merge to `main` (or fast-forward `main` to the branch).

### 2. Connect to Netlify

- Build command: `pnpm build`
- Publish: per `@netlify/plugin-nextjs` (add via Netlify UI or the committed `netlify.toml`)

The Linux Netlify build avoids the Windows `@netlify/plugin-nextjs` EPERM symlink blocker
that prevents a local `pnpm build` from completing on Windows.

No environment variables or secrets are required for Phase 1 (the seed is committed).

### 3. First-deploy gate (spec §9)

Confirm on the live URL before calling v1 done:

- [ ] Airdrop Web tab is the default; graph renders real nodes with oxblood particles.
- [ ] Stat cards show non-zero wallets + ANSEM total + airdrops.
- [ ] Feed shows real airdrop rows with time-ago.
- [ ] Recipient lookup: a known wallet → hit (amount + dates + tx); random wallet → miss.
- [ ] Creator Rewards tab renders the existing dashboard unchanged.
- [ ] Persistent "Unofficial · not affiliated with Ansem" disclaimer visible on both tabs.
- [ ] `pnpm verify` green locally (boundary OK + lint + typecheck + all tests + build).
- [ ] Desktop + ~390px (iOS Safari) screenshots captured.

---

## Phase 2 — Enable live auto-updating data (optional, later)

The live pipeline = a GitHub Actions cron runs the collector → commits `snapshot.json` to
a `data` branch → the site fetches it. The fetch URL (`SNAPSHOT_CDN_URL`) uses jsDelivr's
`/gh/` endpoint, which **only serves public repos**. So pick a serving path first:

### Choose a serving path

**Path A — make the repo public (simplest).** jsDelivr works as-built, and GitHub Actions
becomes unlimited so the cron can run `*/15`. No secrets live in the repo (the Helius key
is a GitHub Actions secret, not committed). Then:
- In `src/lib/snapshot-client.ts`, set `LIVE_SNAPSHOT_ENABLED = true`.
- In `.github/workflows/collect.yml`, change the cron from `*/30` to `*/15`.

**Path B — keep the repo private (more ops).** Add a Netlify function that reads the
`data`-branch `snapshot.json` via a GitHub token and serves it; repoint `SNAPSHOT_CDN_URL`
at that function and set `LIVE_SNAPSHOT_ENABLED = true`. Keep the cron at `*/30` (private
repos have the 2,000 Actions-min/month cap).

### Then wire the pipeline

1. Set the Helius key secret:
   ```bash
   gh secret set HELIUS_API_KEY --repo AIEngineerX/ansem-airdrop-net
   ```
2. Seed the `data` branch once locally:
   ```bash
   git checkout --orphan data
   git rm -rf .
   cp public/snapshot.seed.json snapshot.json
   git add snapshot.json
   git commit -m "data: seed"
   git push -u origin data
   git checkout main
   ```
3. Trigger the first collector run and watch it:
   ```bash
   gh workflow run collect-snapshot
   gh run watch
   ```

The workflow runs the collector in **`sync` mode** each cron tick: an incremental pass
(new airdrops since `cursors.newest`) plus a backfill chunk (older history via
`cursors.oldestScanned`) until `backfillComplete: true`. The cursor logic advances
`newest` every run, so windows never overlap and stats never double-count.

### Live gate (after Phase 2)

- [ ] After two collector runs, the `data` branch `snapshot.json` `collectedAt` advances and new recipients merge (no inflation).
- [ ] The deployed site reflects the `data` branch (not just the build-time seed).
- [ ] `otherMintsSent` stays empty/near-empty (confirms the ANSEM-only finding over real backfill).
