# ansem-airdrop-net

Read-only Solana transfer ledger for a tracked Pump.fun profile wallet.

## Boundary

- No wallet connect.
- No signing.
- No swaps.
- No claim flow.
- No trading or execution.
- Current-value only until stored price snapshots exist.

## Source wallet

```text
GV6UUmNxz2RpKxmNAPadYKb7uQpszwqQAu3qLJxVdC52
```

UI attribution copy is intentionally careful:

```text
Public tracker and Pump.fun profile context link this wallet to ansemconzimp / @blknoiz06.
Not exhaustive; not a wallet-ownership claim.
```

## Main ANSEM mint

```text
9cRCn9rGT8V2imeM2BaKs13yhMEais3ruM3rPvTGpump
```

## What exists now

- Next.js 16 + TypeScript + Tailwind scaffold.
- Clean dark ledger UI.
- API route shells:
  - `/api/summary`
  - `/api/token/ansem`
  - `/api/transfers`
  - `/api/recipients`
- Transfer parser for:
  - native SOL
  - SPL / Token-2022
  - failed transaction exclusion
  - batched same-amount transfer distinction via `eventIndex`
- Collector script:
  - `scripts/collect_airdrop_transfers.ts`
  - fixture mode works without credentials
  - live Helius mode requires `HELIUS_API_KEY`
- Handoff docs:
  - `docs/chaos-handoff.md`
  - `docs/codex-review.md`

## Commands

```bash
pnpm install
pnpm dev
pnpm verify
```

Run collector against a fixture:

```bash
pnpm tsx scripts/collect_airdrop_transfers.ts --fixture path/to/helius-transactions.json
```

Run collector against Helius:

```bash
HELIUS_API_KEY=... pnpm tsx scripts/collect_airdrop_transfers.ts --limit 100
```

## Verification snapshot

Last local verification before handoff:

```text
pnpm verify
lint OK
typecheck OK
3 parser tests passed
next build OK
```

## Deferred on purpose

- X reply matching.
- Network graph.
- Candidate wallet clustering.
- Helius webhook endpoint.
- At-transfer valuation without stored price snapshots.

Those stay out until the primary transfer ledger is correct.
