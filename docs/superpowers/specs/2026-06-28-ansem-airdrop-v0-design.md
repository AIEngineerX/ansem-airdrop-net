# ansem-airdrop-net — v0 Design Spec (v2, post-review)

- **Date:** 2026-06-28
- **Status:** Approved design, pre-implementation. v2 folds in three independent review passes (technical, scope/boundary/attribution, plan/sequencing) and two product decisions (balanced branding; 30-day history).
- **Repo:** AIEngineerX/ansem-airdrop-net
- **Supersedes UI taste gate in:** `docs/chaos-handoff.md` (see §10)

## 1. Purpose & Definition of Done

A read-only, on-chain dashboard for **outgoing** transfers from one public Pump.fun
profile wallet associated with ansemconzimp / @blknoiz06 ("Ansem"). The scaffold
already renders but is **inert**: the collector writes JSON to stdout, the app reads
a hardcoded empty in-memory object, so nothing real ever appears.

**v0 is done when:** a one-time out-of-band backfill seeds ~30 days of outgoing
transfers into Netlify Blobs; a Netlify scheduled function keeps it current with
incremental pulls; and the **deployed** site shows real transfer rows, real
recipients, a real main-ANSEM sent count, the live ANSEM price, and the covered
time window — primary-wallet-only, current-value-only — with each first-deploy gate
item backed by an artifact (§11), not a visual guess.

## 2. Hard Boundary (non-negotiable)

No wallet connect. No signing. No swaps. No claim flow. No trading. No execution.
No wallet adapters (Phantom/Jupiter/etc.). Read-only data only. The boundary is
architecturally guaranteed (the only networked units are read RPC, read price, and
Blobs read/write) **and** enforced in CI: `pnpm verify` fails if `src/` references
`@solana/wallet-adapter`, `@jup-ag`, `phantom`, `signTransaction`, or
`sendTransaction` (§11).

## 3. Locked Decisions

| Decision | Choice |
|---|---|
| Host | Netlify + Scheduled Functions |
| Storage | Netlify Blobs (single `snapshot.json`); local-file fallback for dev when Blobs env is absent |
| Data source | Standard Solana JSON-RPC + **instruction-parsing** adapter (Approach A) — not Helius Enhanced Transactions, not balance deltas |
| Backfill | **One-time, out-of-band** CLI job seeds ~30 days of outgoing transfers directly to Blobs (not inside the 30s scheduled function) |
| Steady state | Scheduled function (`*/5 * * * *`) does **incremental-only**: `getSignaturesForAddress({ until: lastSignature })`, JSON-RPC batched |
| History horizon | **Last 30 days** of outgoing transfers; covered window shown in UI |
| Price | DexScreener live via `fetch(..., { next: { revalidate: 60 } })` |
| Value scope | Main ANSEM + native SOL valued in USD; other SPL recorded/listed but **not** USD-valued |
| Branding posture | **Balanced**: Black Bull aesthetic (oxblood #B11226 + grain + editorial dark) kept; bull art shown as the *tracked token* (captioned), not the site's mark; headline describes the *wallet*; persistent non-affiliation disclaimer in header + footer (§10) |
| UI process | Visually review the running UI (render + screenshot + eyeball) at every UI-affecting step — never "it compiles" |

### Constants (validated on-chain 2026-06-28)
- Primary source wallet: `GV6UUmNxz2RpKxmNAPadYKb7uQpszwqQAu3qLJxVdC52`
- Main ANSEM mint: `9cRCn9rGT8V2imeM2BaKs13yhMEais3ruM3rPvTGpump`
  (name "The Black Bull", Token-2022 program `TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb`, decimals 6, supply ~999,995,732, price ~$0.0873)
- Native SOL sentinel mint: `So11111111111111111111111111111111111111112`
- Helius RPC URL: `https://mainnet.helius-rpc.com/?api-key=<HELIUS_API_KEY>`

### Why standard RPC (not Enhanced Transactions)
On the user's key, the Enhanced Transactions endpoints 403. More fundamentally,
standard `getSignaturesForAddress` / `getTransaction` cost **1 credit** vs **100**
for Enhanced, are not plan-gated, and at this wallet's velocity keep an incremental
tracker well within the free credit cap. (Correction to v1: the 403 is key/account
specific, not a universal free-tier gate — but the cost + no-gating reasons make
standard RPC the right choice regardless.)

### Why instruction-parsing (not balance deltas)
All three reviewers converged here. Net per-owner balance deltas cannot distinguish
an airdrop from a swap/DEX leg, carry no source→destination pairing, and fold in
ATA-creation rent and fees — corrupting `ansemSentUi`, `solSentUi`, and the
recipient list. The adapter instead extracts **transfer instructions** (§8), which
is what Helius Enhanced did internally. This still produces the existing
`HeliusTransaction` shape and feeds the already-tested parser unchanged.

### Why mint-exact matching is essential (validated)
The tracked wallet holds 98 tokens (~$163K), of which ~12 are literally named
ANSEM / Ansem / antsem / ansem🚆 / ANSEMBET / GIGAANSEM / "🐂🀄️" etc. Only one is the
real mint. Main ANSEM is counted **only** when `mint === 9cRCn9...pump`. This rule
lives in the pure aggregation and has a dedicated decoy test (§11).

## 4. Current State (kept vs fixed)

Kept: Next.js 16.2.9 + React 19 + TS + Tailwind v4 (pnpm); `pnpm verify` =
lint+typecheck+test+build; `src/lib/transfer-parser.ts` (consumes the Helius
enhanced **shape**, excludes failed txs, splits batches by `eventIndex`, dedupes on
`sig:source:recipient:mint:amount:eventIndex`, 3 passing tests); `src/lib/domain.ts`
types/constants; single-page UI; CLI collector fixture mode.

Fixed: collector live mode (was the gated REST endpoint → instruction-parsing over
standard RPC); inert in-memory `dashboard-state` (→ reads snapshot); null token
panel (→ DexScreener); no persistence (→ Blobs snapshot); off-brand emerald (→
oxblood); missing disclaimers/headline (→ §10).

## 5. Architecture & Data Flow

```
ONE-TIME BACKFILL (out-of-band CLI, run once)   scripts/collect_airdrop_transfers.ts --backfill
  -> rpc-source: getSignaturesForAddress (paginate `before` until 30-day cutoff)
  -> getTransaction (jsonParsed, maxSupportedTransactionVersion: 0), JSON-RPC batched
  -> rpc-adapter: instruction-parse -> HeliusTransaction shape (pure)
  -> parseOutgoingTransfers (EXISTING, tested) -> TransferRow[]
  -> collector-core: aggregate -> snapshot -> write to Netlify Blobs

STEADY STATE (Netlify scheduled function, */5 min)   netlify/functions/collect.ts
  -> loadSnapshot() -> getSignaturesForAddress({ until: lastSignature }) (incremental)
  -> same adapter/parser/aggregate -> merge with prior snapshot (id-dedup) -> save

READ PATH (Next.js server components + /api routes)
  -> snapshot.loadSnapshot() reads Blobs (local ./.data/snapshot.json fallback in dev)
  -> price.getAnsemMarket()/getSolPrice() from DexScreener (revalidate 60)
  -> render: Overview, ANSEM token panel, Recent transfers, Recipients, Methodology
```

Only networked units: `rpc-source`, `price`, Blobs I/O in `snapshot`. Everything
else (`rpc-adapter`, `transfer-parser`, aggregation/merge) is pure and unit-tested.

## 6. Units / File Plan

New libs:
- `src/lib/rpc-adapter.ts` — pure `rawTxToHelius(tx): HeliusTransaction` (§8). No network.
- `src/lib/rpc-source.ts` — networked: signature pagination + batched `getTransaction`
  against the Helius RPC URL; backfill (`before`, 30-day cutoff) and incremental (`until`).
- `src/lib/snapshot.ts` — `loadSnapshot()` / `saveSnapshot()` over Netlify Blobs
  (`getStore("ansem-snapshot")`, `get(key,{type:"json"})`, `setJSON`), called inside
  handlers; `./.data/snapshot.json` fallback triggered by **Blobs-env absence**.
- `src/lib/price.ts` — DexScreener (§9).
- `src/lib/collector-core.ts` — orchestrates source→adapter→parser→aggregate→merge→snapshot;
  imported by both the scheduled function and the CLI.

New infra:
- `netlify/functions/collect.ts` — incremental-only scheduled wrapper (`export const config = { schedule: "*/5 * * * *" }`).
- `netlify.toml` — `@netlify/plugin-nextjs` + functions config.
- `.env.example` — `HELIUS_API_KEY=` (+ optional `HELIUS_RPC_URL=`).
- deps added: `@netlify/blobs`, `@netlify/plugin-nextjs`, `@netlify/functions` (types).
- `.gitignore` += `.data/`, `.netlify/`.
- CI boundary guard wired into `pnpm verify` (§2).

Changed:
- `src/lib/dashboard-state.ts` — thin reader over `loadSnapshot()`; **recipients come
  precomputed from the snapshot (single source of truth)**; maps `counts.unparsed` → `summary.unparsedTransactionCount`.
- `src/app/api/summary|transfers|recipients/route.ts` — read real snapshot data.
- `src/app/api/token/ansem/route.ts` — fold in live DexScreener market data.
- `src/app/page.tsx` — server component reads snapshot + price; restyled (§10).
- `src/app/layout.tsx` / `globals.css` — add display font (`--font-display`); purge emerald `::selection`.
- `next.config.ts` — `images.remotePatterns` only if the hero art is remote (prefer a committed `/public` asset).
- `scripts/collect_airdrop_transfers.ts` — `--backfill` (30-day, writes Blobs) + live mode delegate to `collector-core`; fixture mode kept; old Helius-REST path removed.

## 7. Snapshot Schema (Netlify Blobs, `snapshot.json`)

```jsonc
{
  "collectedAt": "ISO-8601",
  "coveredFrom": "ISO-8601",          // oldest blockTime in the ledger (window start)
  "coveredThrough": "ISO-8601",       // = collectedAt
  "lastSignature": "base58 | null",   // newest signature seen, for incremental `until`
  "sourceWallet": "GV6UUm...C52",
  "transfers": [ /* TransferRow[] from domain.ts */ ],
  "recipients": [ { "wallet", "transferCount", "firstSeen", "latestSeen" } ],  // source of truth
  "counts": { "transfers": 0, "uniqueRecipients": 0, "unparsed": 0 },
  "ansemSentUi": 0,        // sum amountUi where mint === ANSEM_MINT (mint-exact)
  "solSentUi": 0           // sum amountUi where mint === NATIVE_SOL_MINT
}
```

Price is **never** stored (fetched live). `totalCurrentUsd = ansemSentUi*ansemPrice
+ solSentUi*solPrice`, computed at render/response time.

## 8. Data-Source Detail (instruction-parsing adapter)

**Signatures.** `getSignaturesForAddress(wallet, { before, limit: 1000 })`. Backfill:
page backward until `blockTime` < (now − 30d). Incremental:
`getSignaturesForAddress(wallet, { until: lastSignature })` (server-side cutoff, no
arbitrary cap — closes the downtime-gap risk).

**Transactions.** `getTransaction(sig, { maxSupportedTransactionVersion: 0,
encoding: "jsonParsed" })`, requested in JSON-RPC **batches** (~100/req). Skip when
`meta.err != null` (failed-tx exclusion). Under `jsonParsed`, `message.accountKeys`
is the full merged list (static + ALT-loaded, each tagged `source`), and
`pre/postTokenBalances[].accountIndex` index into it — verified on a real v0/ALT tx.
**Read `accountKeys[i].pubkey`; never use `encoding:"json"`; never also append
`meta.loadedAddresses` (double-count).** Assert `preBalances.length === accountKeys.length`.

**Instruction extraction (the core change).** Gather instructions =
`message.instructions` ∪ `flatten(meta.innerInstructions[].instructions)` (multisend
airdrop tools transfer via CPI, so inner instructions are required). Build a token-account
map from `pre/postTokenBalances` (union of `accountIndex`): `tokenAccountPubkey → { owner, mint, decimals, programId }`.

- **Native SOL out:** `system` program `transfer` / `transferChecked` where
  `parsed.info.source === wallet`. `toUserAccount = info.destination`,
  `amountRaw = info.lamports`, `amountUi = lamports / 1e9`. (Rent/`createAccount`
  are different instruction types and are never emitted as transfers — this removes
  the M3 rent inflation by construction.)
- **SPL / Token-2022 out:** `spl-token` / `spl-token-2022` program `transfer` /
  `transferChecked` where the source token account's **owner === wallet**.
  `mint` from `transferChecked.info.mint` or the token-account map; `decimals` from
  the map; `amountRaw` from `info.amount` (transfer) or `info.tokenAmount.amount`
  (transferChecked); `amountUi` from `tokenAmount.uiAmount` or `raw / 10^decimals`.
  `toUserAccount` = **owner** of `info.destination` (via the map / postTokenBalances),
  not the token account. `tokenStandard = "FungibleToken2022"` iff the instruction's
  programId is the Token-2022 program, else emit as plain SPL (so the existing parser
  maps `token_2022` vs `spl_token` correctly).
- **Self-transfer guard:** skip if the destination owner === wallet (ATA-to-own-ATA noise).

Emit these into the `nativeTransfers` / `tokenTransfers` arrays with
`fromUserAccount = wallet`, preserving order so the parser's `eventIndex` keeps
batched same-amount sends distinct. Dedup (incl. the same tx appearing twice across
backfill/incremental overlap) is handled by the parser's composite id; cross-snapshot
merge re-applies id-dedup in `collector-core`. Transactions touching the wallet that
yield no outgoing transfer are recorded as `counts.unparsed` with a reason.

## 9. Price & Valuation (current-value only)

- ANSEM: `GET https://api.dexscreener.com/tokens/v1/solana/9cRCn9...pump`; the array
  returns many pairs (≈36 for ANSEM) and is not pre-sorted — **select the pair with
  the highest `liquidity.usd`**. `priceUsd`/`priceNative` are **strings** (parse);
  `marketCap` may be absent → fall back to `fdv`. Take `liquidity.usd`,
  `volume.h24`, `priceChange.h24` from the same canonical pair.
- SOL price: derive `priceUsd / priceNative` from a SOL-quoted ANSEM pair (no extra
  request), or query wrapped-SOL mint's highest-liquidity USDC pair.
- v0 values **main ANSEM + native SOL only.** Other SPL transfers list amount/mint
  with "—" for USD. No at-transfer valuation (deferred). No Buy/Trade CTA; explorer
  links only. Fetch with `{ next: { revalidate: 60 } }` (serverless-safe; not in-memory). Rate limit 300/min.

## 10. UI / Visual Design — "Black Noise" editorial dark (balanced branding)

**Overrides the "Linear/Vercel, no imagery" gate in `docs/chaos-handoff.md`.** The
forensic-ledger *rigor* (precise mono tables, honest copy, one accent) is kept; the
*skin* becomes on-brand to Ansem / The Black Bull — but **balanced** so it never
implies official endorsement.

- **Palette:** pure black hero `#000` → app `#050506` → cards `#0a0a0b`; hairline
  white borders; text zinc-50/400/500. **Accent: oxblood/crimson `#B11226`** used
  sparingly (key figures, active states, table emphasis). **Purge all emerald**
  (page.tsx live dot + symbol pill; `globals.css` `::selection`).
- **Bull art = the tracked token, not the site mark.** Render the Black Bull art
  as a captioned token identity ("Tracked token: ANSEM / The Black Bull · mint
  9cRCn9…pump"), subordinate to the disclaimer — not as the site logo/wordmark.
  Prefer a committed `/public` asset over a remote URL. Cinematic dark treatment,
  film-grain overlay ("black noise"), no bright gradients/glow.
- **Headline (describe the wallet, not assert Ansem's airdrops):**
  > Outgoing transfers from a Pump.fun wallet linked to Ansem
  > Read-only on-chain ledger. Unofficial. Attribution unconfirmed — see Methodology.
- **Persistent non-affiliation disclaimer** in header + footer (exact copy):
  > **Unofficial.** Independent, read-only on-chain tracker. Not operated by,
  > affiliated with, or endorsed by Ansem / @blknoiz06. The "ANSEM" / "The Black
  > Bull" names, ticker, and token art belong to their respective owners and appear
  > only to identify the token being tracked.
- **No "live" framing** (data is ≤5 min stale): static accent dot labeled "Read-only
  ledger" + visible **"Last updated {collectedAt}"** + covered window
  ("{coveredFrom} → {coveredThrough}"). Table titled **"Recent transfers"**.
- **Type:** heavy editorial **display face** for the hero via `next/font` +
  `--font-display`; body in existing sans; **mono (Geist Mono, already wired) for
  every address + amount.**
- **Methodology block (pin all caveats, verbatim-ish):** attribution is
  strong-but-unconfirmed and no direct wallet post from Ansem was found; only
  outgoing transfers from one primary wallet are counted, not exhaustive of Ansem's
  activity; current value drifts with price, no at-transfer valuation in v0; only
  main ANSEM (mint-exact) and native SOL are USD-valued, other SPL shown un-valued;
  wallet ownership is not identity and recipients are listed neutrally (not implied
  insiders/farmers); no wallet connect/claim/sign/swap/trade exists; **not financial
  advice and not a trading signal**; plus the non-affiliation line.
- **Mobile (first-class, not an afterthought):** the whole UI must look and work
  well on phones — especially **iOS Safari**. Mobile-first responsive layout: hero
  scales/crops cleanly, the wide transfers/recipients tables become horizontally
  scrollable or stack into cards on narrow widths (no overflow, no clipped data),
  tap targets ≥44px, `viewport` + `theme-color` + safe-area insets set, no fixed
  layouts that break <400px. Use the `mobile-responsive-audit` skill during the UI
  step. Long base58 addresses must truncate gracefully (mono + middle ellipsis).
- **Process:** render + screenshot + eyeball at every UI step (this section, plus
  every later tweak) at **both desktop and a mobile viewport (~390px, iPhone
  Safari)**, per the standing instruction.

## 11. Verification Gate / Tests (real, no mocks)

`pnpm verify` (lint+typecheck+test+build, plus the §2 boundary grep) stays the gate.
Honor `AGENTS.md`: confirm and read the bundled Next 16 docs before writing
route/handler code (Step 0 validates the path exists; redefine the gate if not).

**Fixture matrix** (captured from real chain in Step 1, committed JSON, each noted):
ANSEM Token-2022 multi-recipient airdrop; native SOL send; a **v0/ALT tx**
(index-alignment); an **ATA-creation/rent** tx; a **self/own-account move**; and (if
findable) a **fee-payer≠source** tx.

**Pure tests (free, no mocks):**
- Adapter (`rawTxToHelius`) per fixture: ANSEM → `transferType === "token_2022"`;
  native amount correct with no fee/rent contamination; multi-recipient → N rows with
  distinct `eventIndex`; ALT tx aligns to correct recipients/amounts; rent-to-token-account
  **not** emitted; self-move excluded; CPI/inner transfers captured.
- Parser: keep the 3; add same-tx-appearing-twice **collapse** dedup; add
  `toUserAccount === sourceWallet` guard test.
- `collector-core` aggregation/merge: a **decoy token with `symbol:"ANSEM"` but a
  different mint does NOT contribute** to `ansemSentUi`; cross-snapshot merge re-dedups.
- Field contracts asserted: `timestamp` in seconds (parser ×1000); `tokenAmount` =
  UI amount (so `amountUi` ≠ 0); `meta.err` path skipped.

**First-deploy gate — each item must yield an artifact:**
1. Run the out-of-band backfill → a Blobs `snapshot.json` exists with ≥1 real
   outgoing transfer row and a populated `coveredFrom/Through` (~30d).
2. Invoke the scheduled function (`netlify functions:invoke collect`) twice →
   `collectedAt` **advances** (proves the schedule path, not just the build).
3. Deployed page shows ≥1 real transfer row **and** a non-null **live ANSEM price**.
4. Main-ANSEM identified by mint, not symbol → tied to the decoy aggregation test.
5. Unparsed count + covered window visible in the UI.
6. Boundary grep passes (no wallet-adapter/execution dependency).
Per-step exit evidence (green tests / written snapshot / screenshot / deploy URL) is
required before advancing — see §14.

## 12. Deferred (explicitly out of v0)

X reply matching; network graph; candidate-wallet clustering; Helius webhook
endpoint; at-transfer valuation; source-scope/value-basis toggles; multi-page
routing; asset/recipient filters; valuing arbitrary SPL tokens; source-wallet ANSEM
balance + supply panel rows (optional later); the heavy Postgres schema
(`x_wallet_mentions`, `recipient_matches`, etc.). Out until the primary ledger is
correct and deployed.

**v0.1 fast-follow (first thing after v0 deploys):** a **recipient lookup** — paste
a wallet → "did the ANSEM treasury airdrop you, how much, when" (an index/filter
over the Recipients snapshot). Highest-pull consumer feature; deferred only so the
core outgoing ledger ships and is verified first. (Competitor ocula.fun surfaces
incoming airdrops to ~302 curated wallets via its Fomo Wallet Tracker "Transfers"
feed — recipient-centric/alpha lens; our differentiation is the source-centric
treasury ledger, so the per-wallet "did *I* get it" lookup is ours to own.)

## 13. Anti-Drift Guardrail (done FIRST, Step 0)

Replace the 12-byte `CLAUDE.md` (`@AGENTS.md`) with an inked-style anti-drift spec
encoding: locked v0 scope (§3), hard boundary (§2), explicit DEFERRED list (§12),
definition-of-done (§1), the verification gate (§11), and the UI-review-as-you-go
rule. Keep the `@AGENTS.md` Next-16-docs reference inside it. Done at Step 0 so the
guardrail is active during the whole build (its entire purpose).

## 14. Build Order (corrected)

0. **Setup gate.** `pnpm install`; confirm `node_modules/next/dist/docs/` exists (or
   redefine the AGENTS doc gate); add `.env.example`; add deps `@netlify/blobs`,
   `@netlify/plugin-nextjs` (+ `@netlify/functions` types); gitignore `.data/` +
   `.netlify/`; wire the §2 boundary grep into `pnpm verify`; **replace CLAUDE.md
   with the anti-drift spec.** *Evidence: `pnpm verify` green on the untouched scaffold.*
1. **Capture fixtures** (needs `HELIUS_API_KEY`): the §11 matrix. *Evidence: committed JSON + per-fixture notes.*
2. **`rpc-adapter` + adapter tests** against the matrix. *Evidence: green tests proving the §8/§11 assertions.*
3. **`rpc-source` + `snapshot` (save+load+dev fallback) + `collector-core`** with pure
   aggregation/merge tests; CLI `--backfill` delegates; run once → `./.data/snapshot.json`.
   *Evidence: real outgoing rows + green core tests.*
4. **Rewire consumers** (dashboard-state + API routes + page) to read the snapshot;
   `counts.unparsed`→summary mapping. *Evidence: `pnpm dev` shows real rows; `totalCurrentUsd` null OK; screenshot.*
5. **`price`** (DexScreener, pinned canonical pair, `revalidate`) + token panel +
   totals. *Evidence: page renders live price + computed `totalCurrentUsd`; screenshot.*
6. **UI restyle** — display font, hero token art (+ `remotePatterns` if remote),
   purge emerald, disclaimers/headline/Methodology copy, **mobile-responsive pass
   (iOS Safari) via the mobile-responsive-audit skill**. *Evidence: **desktop AND
   ~390px mobile screenshots**, mono addresses, single oxblood accent, disclaimers
   present, tables usable on phone (scroll/stack, no overflow).*
7. **Deploy** — `netlify.toml` + `netlify/functions/collect.ts`; `netlify dev` Blobs
   smoke test; set Netlify env; deploy; run backfill to Blobs; invoke schedule;
   confirm the §11 first-deploy gate. *Evidence: the objective gate checklist.*

UI is visually reviewed at steps 4, 5, 6, 7 (and any later tweak).

## 15. Open Risks

- `node_modules/next/dist/docs/` existence is unconfirmed until Step 0; the AGENTS
  doc gate is redefined there if absent.
- Netlify env: `HELIUS_API_KEY` must be set in the Netlify dashboard; local Blobs/
  scheduled-function testing needs `netlify dev` / `netlify functions:invoke` (CLI installed).
- Instruction parsing edge cases (unusual token programs, exotic CPIs) → recorded as
  `unparsed` with reasons rather than guessed.
- Backfill RPC volume (~30d) → run out-of-band, JSON-RPC batched; incremental stays tiny.
- DexScreener pair drift → always reselect highest-liquidity pair per request.
- Re-run `pnpm verify` on this Windows box (the README snapshot was taken on macOS);
  Node v24 expands the `tsx --test` glob natively.
