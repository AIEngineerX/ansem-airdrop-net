# Deploy Guide — public + live

The site is configured for **live data** (`LIVE_SNAPSHOT_ENABLED = true`): the client fetches
the snapshot directly from `raw.githubusercontent.com/AIEngineerX/ansem-airdrop-net/data/snapshot.json`
(the public repo's `data` branch, refreshed by the collector cron). raw.githubusercontent sends
`Access-Control-Allow-Origin: *`, so the browser fetch works. Freshness is bounded by raw github's
CDN cache (`Cache-Control: max-age=300` → **up to ~5 min**) — fine here, since new airdrops are rare.
Note: a query cache-buster is useless (raw github's Fastly ignores the query string for its cache
key), and the collector must use fast-forward commits, never force-push (a history rewrite leaves
raw github serving an old commit for ~40 min — far past the 5-min cache). It falls back to the
committed seed (`public/snapshot.seed.json`) if the CDN is ever unavailable, so even mid-setup the
site always renders real data. (jsDelivr was used originally but dropped: its `@branch`-ref cache is
purge-proof in practice — verified 2026-06-30 it served 108-min-stale content while five purge calls
all reported success. For sub-minute freshness, front the snapshot with a server proxy over the
GitHub contents API.)

Do the steps **in order** — seeding the `data` branch before Netlify goes live means the
CDN already has a snapshot when the site first loads (no 404 flash).

## Steps (yours to run)

### 1. Merge to `main`
Already staged locally on `main`. Push it:
```bash
git push origin main
```
(Optional cleanup: `git push origin --delete feat/airdrop-web` once you're happy.)

### 2. Make the repo public
GitHub → repo **Settings → General → Danger Zone → Change visibility → Public**.
This is what lets raw.githubusercontent.com serve the snapshot to browsers, and gives
unlimited Actions minutes (so the cron runs every 15 min). Nothing sensitive is in the repo —
`.env` is gitignored, no keys are committed, the snapshot is public on-chain data.

### 3. Add the Helius key as an Actions secret
```bash
gh secret set HELIUS_API_KEY --repo AIEngineerX/ansem-airdrop-net
```
Paste the key (same one in your local `.env`). Used only by the collector in CI.

### 4. Seed the `data` branch (once)
Gives the site a `snapshot.json` to read immediately:
```bash
git checkout --orphan data
git rm -rf .
cp public/snapshot.seed.json snapshot.json
git add snapshot.json
git commit -m "data: seed"
git push -u origin data
git checkout main
```

### 5. Trigger the collector + confirm CDN
```bash
gh workflow run collect-snapshot
gh run watch
```
Then confirm the snapshot is served (raw github's cache refreshes within ~5 min of the push):
```bash
curl -s "https://raw.githubusercontent.com/AIEngineerX/ansem-airdrop-net/data/snapshot.json" | head -c 120
```
The cron then keeps the `data` branch fresh every 15 min, committing with fast-forward pushes.

### 6. Connect Netlify (deploy from `main`)
- Build command: `pnpm build` · publish per `@netlify/plugin-nextjs` (or the committed `netlify.toml`)
- The Linux build sidesteps the Windows `@netlify/plugin-nextjs` EPERM blocker.
- **Set an env var** so social-share images resolve: `NEXT_PUBLIC_SITE_URL = https://<your-netlify-domain>` (and redeploy). Without it, the OG/Twitter card image points at localhost.
- No `HELIUS_API_KEY` needed on Netlify (the site never calls Helius — only the CI collector does).

## Go-live checklist

- [ ] `main` deployed; Airdrop Web tab is default; graph renders 702 nodes with the Black Bull behind it.
- [ ] Stats show 702 wallets / 67.36M ANSEM / live USD; "Total airdrops" 702.
- [ ] Recent-airdrops feed populated; recipient lookup returns a hit for a known wallet, miss for a random one.
- [ ] **X timeline** renders Ansem's posts in the rail (check in a real browser; it's the one third-party piece).
- [ ] Creator Rewards tab: ~$548K lifetime leads, on-chain PumpSwap below, $ANSEM market panel live.
- [ ] Share the URL in a DM/test channel → confirm the **graph preview card** shows (needs `NEXT_PUBLIC_SITE_URL` set).
- [ ] After two cron runs, the `data` branch `snapshot.json` `collectedAt` advances and the site reflects it (open tabs re-poll every 2 min).

## Notes

- **The airdrop is complete** (`backfillComplete: true`), so the live pipeline mostly matters for *future* airdrops — the committed seed is already the full, accurate dataset. Live mode + polling means any new Ansem airdrop would appear automatically.
- **The ~$548K lifetime fee** is the one figure that isn't live (no public API exposes it). Update it by editing `pump-lifetime.json` on the `data` branch (`{"usd":"≈ $548K","asOf":"Jun 29, 2026"}`) — no code change, no rebuild; `page.tsx` reads it server-side (ISR) with the in-source value as a fallback. Re-check his pump.fun profile periodically.
- **Snapshot freshness:** the client reads the `data` branch from raw.githubusercontent.com. Freshness is bounded by raw github's CDN cache (`max-age=300` → ~5 min); a query buster is inert (Fastly ignores it) and the collector uses fast-forward commits (force-push leaves it ~40 min stale). jsDelivr was dropped — its `@branch`-ref cache is purge-proof in practice (served 108-min-stale content while purge calls reported success). Sub-minute freshness would need a server proxy over the GitHub contents API.
