@AGENTS.md

# ansem-airdrop-net — locked scope (do not drift)

Read-only Solana ledger of OUTGOING transfers from one wallet:
GV6UUmNxz2RpKxmNAPadYKb7uQpszwqQAu3qLJxVdC52. Full design:
docs/superpowers/specs/2026-06-28-ansem-airdrop-v0-design.md.
Plan: docs/superpowers/plans/2026-06-28-ansem-airdrop-v0.md.

## Hard boundary (CI-enforced by `pnpm verify`)
No wallet connect / signing / swaps / claim / trading / execution. No wallet
adapters. Read-only RPC + price + Blobs only.

## v0 scope — ONLY this
Overview stats · ANSEM token panel (live price) · Recent transfers table ·
Recipients table · Methodology/caveats. Primary wallet only. Current-value only.
Value ANSEM (mint-exact) + SOL only. Mobile-first.

## Deferred — DO NOT build in v0
X-match · graph · candidate-wallet clustering · webhook · at-transfer valuation ·
scope/value toggles · multi-page routing · filters · valuing arbitrary SPL.
v0.1 fast-follow (after deploy): recipient lookup.

## Definition of done
Deployed Netlify site shows real outgoing rows + recipients + ANSEM-sent count +
live price + covered window. Each deploy-gate item backed by an artifact (spec §11).

## Rules
Match by mint, never symbol. Instruction-parse, not balance deltas. Backfill
out-of-band; scheduled function incremental-only. `pnpm verify` green before every
commit. Review UI on desktop AND ~390px mobile at every UI step.
