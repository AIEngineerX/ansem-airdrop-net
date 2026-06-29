@AGENTS.md

# ansem-airdrop-net — locked scope (do not drift)

**Product (v1):** an unofficial, read-only dashboard whose hero is the **live web of
wallets airdropped $ANSEM by GV6UUmNxz2RpKxmNAPadYKb7uQpszwqQAu3qLJxVdC52** (Ansem's
pump.fun creator wallet, profile @ansemconzimp / X @blknoiz06). The creator-rewards /
$ANSEM-market dashboard is KEPT as a secondary tab. Full design + plan:
docs/superpowers/specs/2026-06-29-ansem-airdrop-web-design.md.

> CORRECTION: the earlier "GV6U is a passive holder that never sends" claim is FALSE
> (it was a false negative from a rate-limited RPC). Re-verified 2026-06-29: GV6U is the
> live ANSEM airdrop source. No relay wallet.

## Hard boundary (CI-enforced by `pnpm verify`)
No wallet connect / signing / swaps / claim / trading / execution. No wallet adapters.
Read-only public data only. Recipient lookup is a client-side filter over the public
snapshot. Forbidden in src/: @solana/wallet-adapter, @jup-ag, phantom, signTransaction,
sendTransaction.

## v1 scope — ONLY this
Airdrop Web (2D canvas force-graph GV6U→recipients) · live feed · lifetime stat cards
(wallets airdropped / total ANSEM / total airdrops) · recipient lookup (paste wallet →
amount + dates + tx) · Creator Rewards tab (existing). Data = periodic snapshot built by
a CI-cron collector, committed to the `data` branch, served via jsDelivr; site is static.

## Data truth (do not fabricate)
- Match ANSEM by mint (9cRCn9…pump), never symbol.
- The 0.002074 SOL dust legs are ATA-funding overhead, not airdrops; they are not graph
  edges. Recipients/graph/stats are built from ANSEM transfers only.
- USD is never stored in the snapshot; if shown, multiply totals by the live price.

## v1 exit condition
Done when graph + feed + stats + lookup + creator-rewards tab are live on the deployed
URL, `pnpm verify` green, gate artifacts captured. Everything in spec §10 Deferred is out.
No new feature without editing the spec first.

## Rules
`pnpm verify` green before every commit. Review UI on desktop AND ~390px mobile (iOS
Safari) at every UI step. AIEngineerX git identity (local config). Never `git push`
(user hook); hand the push command to the user.
