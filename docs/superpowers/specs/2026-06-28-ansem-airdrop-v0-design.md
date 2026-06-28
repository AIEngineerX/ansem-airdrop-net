# ansem-airdrop-net — v0 Design Spec

- **Date:** 2026-06-28
- **Status:** Approved design, pre-implementation
- **Repo:** AIEngineerX/ansem-airdrop-net
- **Supersedes UI taste gate in:** `docs/chaos-handoff.md` (see §10)

## 1. Purpose & Definition of Done

A read-only, on-chain dashboard for outgoing transfers from one public Pump.fun
profile wallet associated with ansemconzimp / @blknoiz06 ("Ansem"). The scaffold
already renders but is **inert**: the collector writes JSON to stdout, the app
reads a hardcoded empty in-memory object, so nothing real ever appears.

**v0 is done when:** a Netlify scheduled function pulls real outgoing transfers
from the tracked wallet via standard Solana RPC, writes a snapshot to Netlify
Blobs, and the **deployed** site shows real transfer rows, real recipients, a
real main-ANSEM sent count, and the live ANSEM price — primary-wallet-only,
current-value-only.

## 2. Hard Boundary (non-negotiable)

No wallet connect. No signing. No swaps. No claim flow. No trading. No execution.
No wallet adapters (Phantom/Jupiter/etc.). This is a transparency ledger, not a
signal or a trading surface. Every visible sentence must help the user verify
wallet flow, understand attribution, or avoid a false claim.

## 3. Locked Decisions

| Decision | Choice |
|---|---|
| Host | Netlify + Scheduled Functions |
| Storage | Netlify Blobs (single `snapshot.json`); local-file fallback for `pnpm dev` |
| Data source | Standard Solana JSON-RPC via adapter (Approach A) — **not** Helius Enhanced Transactions |
| Price | DexScreener live, cached ~60s |
| Refresh | every 5 min (`*/5 * * * *`) |
| Backfill | cap initial backfill at ~1000 signatures, then incremental (only-new-since-lastSignature) |
| Value scope | Main ANSEM + native SOL valued in USD; other SPL recorded/listed but **not** USD-valued |
| UI | single-page, "Black Noise" editorial dark, oxblood/crimson accent (#B11226) |

### Constants (validated on-chain 2026-06-28)
- Primary source wallet: `GV6UUmNxz2RpKxmNAPadYKb7uQpszwqQAu3qLJxVdC52`
- Main ANSEM mint: `9cRCn9rGT8V2imeM2BaKs13yhMEais3ruM3rPvTGpump`
  (name "The Black Bull", Token-2022, decimals 6, supply ~999,995,732, price ~$0.0873)
- Native SOL sentinel mint: `So11111111111111111111111111111111111111112`
- Attribution copy: "Public tracker and Pump.fun profile context link this wallet
  to ansemconzimp / @blknoiz06. Not exhaustive; not a wallet-ownership claim."

### Why standard RPC, not Enhanced Transactions
On the user's current Helius plan, the Enhanced Transactions endpoints
(`/v0/addresses/{addr}/transactions`, `getTransfersByAddress`) return
`403 — restricted on your current plan`. The scaffold's collector calls exactly
that gated endpoint, so it would 403 in production. Standard Solana JSON-RPC
(`getSignaturesForAddress`, `getTransaction`) is available on any Helius key
(and any Solana RPC), so the collector cannot be blocked by a plan tier. This
removes an infra-fragility failure mode and is worth the extra adapter code.

### Why mint-exact matching is essential (validated)
The tracked wallet holds 98 tokens (~$163K), of which a dozen are literally named
ANSEM / Ansem / antsem / ansem🚆 / ANSEMBET / GIGAANSEM / "🐂🀄️" etc. Only one is
the real mint. Counting by symbol would be catastrophically wrong. Main ANSEM is
counted **only** when `mint === 9cRCn9...pump`.

## 4. Current State (what exists, what's inert)

Working and kept:
- Next.js 16.2.9 + React 19 + TS + Tailwind v4 (pnpm). `pnpm verify` = lint + typecheck + test + build.
- `src/lib/transfer-parser.ts` — `parseOutgoingTransfers(HeliusTransaction[], source)`:
  parses outgoing native SOL + SPL/Token-2022 from the Helius enhanced-tx **shape**,
  excludes failed txs, splits batched airdrops by `eventIndex`, dedupes on
  `sig:source:recipient:mint:amount:eventIndex`. **3 passing tests. Kept as-is.**
- `src/lib/domain.ts` — types + constants. Kept.
- 4 API route shells; single-page UI (`src/app/page.tsx`); CLI collector (fixture mode).

Inert / to fix:
- Collector live mode hits the gated Enhanced Transactions endpoint (→ 403). Replaced (§8).
- App reads hardcoded empty `dashboard-state.ts`. Rewired to read the snapshot (§6).
- `tokenPanel` price/liquidity/mcap/volume all `null`. Wired to DexScreener (§9).
- No persistence; collector output never reaches the app. Solved via Blobs snapshot (§7).

## 5. Architecture & Data Flow

```
Netlify Scheduled Function (*/5 min)  netlify/functions/collect.ts
  -> rpc-source: getSignaturesForAddress (paginate `before`) + getTransaction (jsonParsed, maxSupportedTransactionVersion: 0)
  -> rpc-adapter: raw tx -> HeliusTransaction shape (pure, no network)
  -> parseOutgoingTransfers (EXISTING, tested) -> TransferRow[]
  -> collector-core: aggregate recipients/counts, merge with prior snapshot (incremental)
  -> snapshot: write snapshot.json to Netlify Blobs

Next.js (server components + /api routes)
  -> snapshot.loadSnapshot() reads Blobs (local ./.data/snapshot.json fallback in dev)
  -> price.getAnsemMarket() / getSolPrice() from DexScreener (cached ~60s)
  -> render: Overview stats, ANSEM token panel, Transfers table, Recipients table, Methodology
```

Design principle: the only networked units are `rpc-source`, `price`, and the
Blobs read/write in `snapshot`. Everything else (`rpc-adapter`, `transfer-parser`,
aggregation) is pure and unit-testable.

## 6. Units / File Plan

New:
- `src/lib/rpc-adapter.ts` — pure `rawTxToHelius(tx): HeliusTransaction`.
  Native moves from `meta.pre/postBalances` aligned to `transaction.message.accountKeys`,
  fee excluded on the fee-payer account; token moves from
  `meta.pre/postTokenBalances` deltas carrying `owner` + `mint` + `uiTokenAmount`.
- `src/lib/rpc-source.ts` — the networked fetch: signature pagination + `getTransaction`
  against the Helius RPC URL (`https://mainnet.helius-rpc.com/?api-key=...`).
  Backfill cap + incremental cutoff at `lastSignature`.
- `src/lib/snapshot.ts` — `loadSnapshot()` / `saveSnapshot()` over Netlify Blobs
  (`getStore("ansem-snapshot")`), with `./.data/snapshot.json` fallback for dev.
- `src/lib/price.ts` — DexScreener fetch (ANSEM by mint, SOL), short in-memory cache.
- `src/lib/collector-core.ts` — orchestrates source -> adapter -> parser -> aggregate -> snapshot;
  imported by both the scheduled function and the CLI script.
- `netlify/functions/collect.ts` — thin scheduled wrapper (`export const config = { schedule: "*/5 * * * *" }`).
- `netlify.toml` — `@netlify/plugin-nextjs` + functions config.

Changed:
- `src/lib/dashboard-state.ts` — becomes a thin reader over `loadSnapshot()`
  (replaces hardcoded empties); keeps `recipientsFromTransfers` aggregation.
- `src/app/api/summary|transfers|recipients/route.ts` — read real snapshot data.
- `src/app/api/token/ansem/route.ts` — fold in live DexScreener market data.
- `src/app/page.tsx` — server component reads snapshot + price, renders real data; restyled (§10).
- `scripts/collect_airdrop_transfers.ts` — live mode delegates to `collector-core` (fixture mode kept).

## 7. Snapshot Schema (Netlify Blobs, `snapshot.json`)

```jsonc
{
  "collectedAt": "ISO-8601",
  "lastSignature": "base58 | null",   // newest signature seen, for incremental
  "sourceWallet": "GV6UUm...C52",
  "transfers": [ /* TransferRow[] from existing domain.ts */ ],
  "recipients": [ { "wallet", "transferCount", "firstSeen", "latestSeen" } ],
  "counts": { "transfers": 0, "uniqueRecipients": 0, "unparsed": 0 },
  "ansemSentUi": 0,        // sum of main-ANSEM amountUi (mint-exact)
  "solSentUi": 0           // sum of native SOL amountUi
}
```

Price is **never** stored — it is fetched live per request, so current-value is
always current. `totalCurrentUsd = ansemSentUi * ansemPrice + solSentUi * solPrice`,
computed server-side at render/response time.

## 8. Data-Source Detail (RPC adapter)

- **Signatures:** `getSignaturesForAddress(wallet, { before, limit: 1000 })`,
  page backward until either the ~1000-signature initial cap is hit or
  `lastSignature` from the prior snapshot is reached (incremental).
- **Transactions:** `getTransaction(sig, { maxSupportedTransactionVersion: 0,
  encoding: "jsonParsed" })`. Skip if `meta.err != null` (failed tx exclusion).
- **Native SOL:** for each account index, `post - pre` lamports; subtract `meta.fee`
  from the fee-payer (index 0) before deriving direction. Source = wallet with
  negative delta; recipient = account(s) with positive delta. Convert to the
  enhanced `nativeTransfers` shape so `parseOutgoingTransfers` is reused unchanged.
- **SPL / Token-2022:** diff `meta.preTokenBalances` vs `meta.postTokenBalances`
  by `accountIndex`; each carries `owner`, `mint`, `uiTokenAmount`. Negative owner
  delta = sender, positive = recipient. Emit `tokenTransfers` with
  `fromUserAccount`/`toUserAccount` = owners, `mint`, `rawTokenAmount`,
  `tokenStandard` (Token-2022 detected via program owner).
- **Dedup + batching:** unchanged — handled by the existing parser via `eventIndex`
  and the composite id.
- **Unparsed:** transactions that touch the wallet but yield no parseable outgoing
  transfer are recorded with a reason and surfaced as `counts.unparsed` (failures
  stay visible, never silently dropped).

## 9. Price & Valuation (current-value only)

- DexScreener token endpoint for the ANSEM mint → price, liquidity, market cap,
  24h volume, 24h change. SOL price from DexScreener (or a stable SOL pair).
- v0 values **main ANSEM + native SOL only.** Other SPL transfers are listed with
  amount/mint but show "—" for USD (valuing arbitrary tribute memecoins is
  unreliable and out of scope). This is stated in the Methodology copy.
- No at-transfer valuation in v0 (requires stored price snapshots — deferred).

## 10. UI / Visual Design — "Black Noise" editorial dark

**This section intentionally overrides the "Linear/Vercel restraint, no imagery"
taste gate in `docs/chaos-handoff.md`.** The forensic-ledger *rigor* (precise
tables, mono data, honest copy, one accent) is kept; the *skin* becomes on-brand
to Ansem / The Black Bull.

- **Palette:** pure black hero `#000` → app base `#050506` → charcoal cards
  `#0a0a0b`; hairline white borders (`rgba(255,255,255,0.06–0.10)`); text
  zinc-50 / zinc-400 / zinc-500.
- **Accent:** oxblood/crimson `#B11226` (+ a muted variant), used sparingly —
  live dot, key figures, active states, table emphasis. Replaces the scaffold's
  off-brand emerald-green. One accent max.
- **Hero:** full-bleed Black Bull token art, faded right-into-black with a
  vignette; headline set over it; the tracked-wallet pill. Single-light, cinematic.
- **Texture:** a very low-opacity film-grain overlay ("black noise") for editorial
  grit. No bright gradients, no glow, no casino shine.
- **Type:** a heavy editorial display face for the hero (strong grotesk /
  high-contrast); body in the existing sans; **mono (Geist Mono) for every address
  and amount** so tables read as a forensic ledger.
- **Layout:** keep the single scrolling page — Overview stat cards → ANSEM token
  panel → Transfers table → Recipients table → Methodology/caveats. Tables quiet,
  precise, faint row hover, oxblood only for emphasis.
- **Copy rules:** no emojis in UI chrome, no hype, no fake stats; expand the
  current "Method" panel into the full Methodology/caveats block (softened
  attribution + the no-connect/no-trade/no-sign boundary).

## 11. Verification Gate / Tests (real, no mocks)

`pnpm verify` (lint + typecheck + test + build) stays the gate. Honor
`AGENTS.md`: read the bundled Next 16 docs in `node_modules/next/dist/docs/`
before writing any route/handler code.

Keep the 3 existing parser tests. Add:
- same-amount duplicate dedup (two identical-amount sends in one tx stay distinct, exact dup collapses);
- self-transfer / ATA-noise exclusion (wallet → own account produces no row);
- **adapter tests against a real captured `getTransaction` jsonParsed fixture**
  (capture one real airdrop tx from the wallet during build) — native-fee
  exclusion and token-delta direction verified against actual chain data.

First-deploy gate (before calling v0 done):
1. Parse recent outgoing transfers from `GV6U...C52` against live RPC.
2. Confirm main-ANSEM transfers identified by mint, not symbol.
3. Show the unparsed-transaction count in the UI.
4. Source-wallet confidence/attribution visible.
5. No wallet adapter or execution dependency in the build.

## 12. Deferred (explicitly out of v0)

X reply matching; network graph; candidate-wallet clustering; Helius webhook
endpoint; at-transfer valuation; source-scope/value-basis toggles; multi-page
routing; asset/recipient filters; valuing arbitrary SPL tokens; the heavy
Postgres schema (`x_wallet_mentions`, `recipient_matches`, etc.). These stay out
until the primary transfer ledger is correct and deployed.

## 13. Anti-Drift Guardrail

The repo `CLAUDE.md` is currently 12 bytes (`@AGENTS.md`). Replace it with an
inked-style anti-drift spec encoding: the locked v0 scope (§3), the hard boundary
(§2), the explicit DEFERRED list (§12), the definition-of-done (§1), and the
verification gate (§11). Goal: prevent drift into deferred rabbit holes before the
ledger is real and deployed. (Keep the `@AGENTS.md` Next-16-docs reference inside it.)

## 14. Build Order (milestones)

1. `rpc-adapter` + adapter tests against a real captured tx fixture.
2. `rpc-source` + `collector-core`; CLI live mode delegates to it; run once locally,
   write `./.data/snapshot.json`, eyeball real rows.
3. `snapshot` (Blobs + dev fallback); rewire `dashboard-state` + API routes + page to real data.
4. `price` (DexScreener) + token panel + current-value totals.
5. UI restyle — "Black Noise" skin (§10).
6. `netlify/functions/collect.ts` + `netlify.toml`; deploy; verify scheduled run + first-deploy gate.
7. Replace `CLAUDE.md` with the anti-drift spec.

## 15. Open Risks

- Netlify scheduled-function + Blobs API specifics and Next.js 16 runtime support
  on Netlify must be confirmed against current docs during build (step 6).
- ATA → owner resolution edge cases for unusual token programs; covered by recording
  unparsed txs with reasons rather than guessing.
- RPC rate limits during the initial ~1000-signature backfill; mitigated by the cap
  + incremental thereafter, and modest paging.
