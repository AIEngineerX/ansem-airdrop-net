# ansem-airdrop-net — Deploy Guide

## Repo visibility note

This repo is **private**, so the CI collector cron runs at `*/30` (every 30 minutes) to stay under the 2,000 GitHub Actions minutes/month free cap. If the repo is made public, change the cron in `.github/workflows/collect.yml` to `*/15`.

---

## Steps

### 1. Push the branch and open a PR

```bash
git push -u origin feat/airdrop-web
```

Open a PR on GitHub and merge to `main`.

### 2. Set the Helius API key secret

```bash
gh secret set HELIUS_API_KEY --repo AIEngineerX/ansem-airdrop-net
```

Paste the key when prompted.

### 3. Seed the `data` branch (run once locally)

```bash
git checkout --orphan data
git rm -rf .
cp public/snapshot.seed.json snapshot.json
git add snapshot.json
git commit -m "data: seed"
git push -u origin data
git checkout feat/airdrop-web
```

This gives the CI workflow a starting point for incremental runs.

### 4. Trigger the first CI collector run

```bash
gh workflow run collect-snapshot
```

Watch it with:

```bash
gh run watch
```

After the first run the `data` branch will have a fresh `snapshot.json`. Subsequent runs use `--mode incremental`; to resume backfill (if `backfillComplete` is still `false`) change the conditional in the workflow to:

```bash
node --import tsx scripts/collect-snapshot.ts --in prev.json --out snapshot.json --mode backfill --max 2000
```

and revert once `backfillComplete: true` appears in the output.

### 5. Connect to Netlify

- Build command: `pnpm build`
- Publish directory: `.next`
- Plugin: `@netlify/plugin-nextjs` (add via Netlify UI or `netlify.toml`)

The Linux Netlify build avoids the Windows EPERM symlink blocker that prevents a local `pnpm build` from completing.

Environment variable to set in Netlify:
- `HELIUS_API_KEY` — same key as the GitHub secret.

### 6. First-deploy gate (spec §9)

Confirm the following on the live URL before marking v1 done:

- [ ] Airdrop Web tab is the default; graph renders real nodes with oxblood particles.
- [ ] Stats cards show non-zero wallets + ANSEM total + airdrops.
- [ ] Feed shows real airdrop rows with time-ago.
- [ ] Recipient lookup: known wallet → hit with amount + dates; random wallet → miss.
- [ ] Creator Rewards tab renders the existing dashboard unchanged.
- [ ] `pnpm verify` green locally (boundary OK + lint + typecheck + all tests + build).
- [ ] Persistent "Unofficial · not affiliated with Ansem" disclaimer visible.
- [ ] Desktop screenshot + ~390px (iOS Safari) screenshot captured.
- [ ] `otherMintsSent` from `public/snapshot.seed.json` logged (confirms ANSEM-only finding).
