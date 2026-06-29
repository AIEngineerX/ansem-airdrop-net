@AGENTS.md

# ansem-airdrop-net — locked scope (do not drift)

**Product (v0, shipped):** an unofficial, read-only dashboard tracking **Ansem's
pump.fun creator rewards** + the **$ANSEM token**. Wallet
GV6UUmNxz2RpKxmNAPadYKb7uQpszwqQAu3qLJxVdC52 = Ansem's pump.fun creator profile
`ansemconzimp` (X @blknoiz06). Full design + the pivot story:
docs/superpowers/specs/2026-06-28-ansem-airdrop-v0-design.md (read the PIVOT banner first).

> Why not "airdrop tracker": real chain data showed GV6U is a passive holder that
> never sends — outgoing airdrops come from a separate dust-spray relay. The valuable,
> trackable metric is his pump.fun creator rewards. Pivoted 2026-06-29.

## Hard boundary (CI-enforced by `pnpm verify`)
No wallet connect / signing / swaps / claim / trading / execution. No wallet
adapters. Read-only public APIs only (pump.fun swap-api, DexScreener). No Helius key needed.

## v0 scope — ONLY this
Hero (Black Bull) · on-chain PumpSwap creator fees (SOL + live USD + daily chart +
trades) · pump.fun lifetime headline (referenced/linked) · $ANSEM token panel
(price/24h/mcap/liq/vol) · Methodology + disclaimers. Mobile-first.

## Data truth (do not fabricate)
- swap-api = PumpSwap (AMM) creator fees only (~95.82 SOL). Feature this live + sourced.
- pump.fun profile "$547.96K" = includes bonding-curve-era fees, NOT exposed by any
  public API. Reference + link it; never hardcode it as a computed live figure.
- Match by mint (9cRCn9…pump), never symbol.

## Deferred / shelved
Outgoing-transfer ledger, distributions/relay-cluster view, X-match, the standard-RPC
collector pipeline (rpc-source/aggregate — committed but unused). Recipient lookup.

## Rules
`pnpm verify` green before every commit. Review UI on desktop AND ~390px mobile at
every UI step. AIEngineerX git identity (local config).
