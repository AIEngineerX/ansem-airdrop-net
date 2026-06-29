# Deploy Guide — public + live

The site is configured for **live data** (`LIVE_SNAPSHOT_ENABLED = true`): it fetches
the snapshot from jsDelivr (served off the public repo's `data` branch, refreshed by the
collector cron), and falls back to the committed seed (`public/snapshot.seed.json`) if
the CDN is ever unavailable. So even mid-setup, the site always renders real data.

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
This is what lets jsDelivr serve the snapshot, and gives unlimited Actions minutes (so
the cron runs every 15 min). Nothing sensitive is in the repo — `.env` is gitignored,
no keys are committed, the snapshot is public on-chain data.

### 3. Add the Helius key as an Actions secret
```bash
gh secret set HELIUS_API_KEY --repo AIEngineerX/ansem-airdrop-net
```
Paste the key (same one in your local `.env`). Used only by the collector in CI.

### 4. Seed the `data` branch (once)
Gives jsDelivr a `snapshot.json` immediately:
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
Then confirm the CDN serves it (give jsDelivr a minute):
```bash
curl -sI "https://cdn.jsdelivr.net/gh/AIEngineerX/ansem-airdrop-net@data/snapshot.json" | head -1
```
The cron then keeps it fresh every 15 min (and purges the jsDelivr cache each run).

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
- **The ~$548K lifetime fee** is the one figure that isn't live (no public API exposes it). Refresh `PUMP_LIFETIME_USD` / `PUMP_LIFETIME_AS_OF` in `src/components/CreatorRewardsView.tsx` when you re-check his pump.fun profile.
- **jsDelivr branch cache** is ~12h; the cron purges it each run so updates land promptly.
