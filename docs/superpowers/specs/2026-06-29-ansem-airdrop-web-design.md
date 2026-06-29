# ansem-airdrop-net — v1 Design Spec: Live Airdrop Web (un-pivot)

- **Date:** 2026-06-29
- **Status:** Approved design, pre-implementation.
- **Repo:** AIEngineerX/ansem-airdrop-net
- **Supersedes:** the creator-rewards pivot. Builds on (and corrects) `docs/superpowers/specs/2026-06-28-ansem-airdrop-v0-design.md`.

> ## ✅ CORRECTION — the 2026-06-29 pivot premise was wrong (read first)
>
> The v0 spec's pivot banner claims `GV6UUm…dC52` is a **passive holder** that
> "never signs a tx and never sends (0 outgoing transfers)," and that ANSEM airdrops
> come from a separate relay `Dtw3GCTN…`. **Re-verified on-chain 2026-06-29 ~12:10 UTC
> via Helius MCP (`getWalletTransfers` + `parseTransactions`): that is false.**
>
> `GV6UUm…dC52` is the **fee-payer / signer / source** of a **live, ongoing ANSEM
> airdrop spray** — ~1,700–2,670 ANSEM (the per-recipient amount drifts down over
> time) to a fresh, distinct wallet roughly every ~10 s, each accompanied by a
> 0.002074 SOL dust leg (ATA-funding overhead, sent to a *different* address than the
> ANSEM in the same tx). New recipients appeared between two calls 2 minutes apart.
> Plain Token-2022 transfers; `Source: SOLANA_PROGRAM_LIBRARY`; no DEX leg.
>
> **Likely root cause of the false "0 outgoing" reading:** the free Helius key
> rate-limits hard — reproduced immediately (`scripts/investigate.ts` returns
> `RPC 429 Too Many Requests` on its first batch). The original investigation almost
> certainly got an empty/failed response that was misread as "no sends," and the whole
> pivot rested on that false negative.
>
> **Conclusion:** the original product premise — a live web of wallets that Ansem
> airdropped — is real, and trackable from this **one** wallet via RPC. No relay
> needed. This spec restores it as the product, and **keeps** the shipped
> creator-rewards dashboard as a secondary tab.

## 1. Purpose & Definition of Done

A read-only, on-chain dashboard whose hero is the **live web of wallets airdropped
$ANSEM by `GV6UUm…dC52`** (Ansem's pump.fun creator wallet, profile `ansemconzimp` /
X `@blknoiz06`). The creator-rewards / $ANSEM-market dashboard already shipped is
demoted to a secondary tab, untouched.

**v1 is done when** the deployed site shows, from a real snapshot built by a scheduled
CI collector:
1. A **cinematic-yet-clean force-graph** of GV6U → ANSEM recipients (the "web").
2. A **live feed** of recent airdrops (newest-first, amount, recipient, time-ago, tx link).
3. **Lifetime stat cards**: unique wallets airdropped, total ANSEM airdropped, total airdrops.
4. A **recipient lookup**: paste a wallet → got airdropped? how much (cumulative) / when (first+last) / tx links, or "no airdrop found."
5. A **Creator Rewards** tab preserving the existing dashboard.

…with every gate item backed by an artifact (§9), the read-only boundary intact (§2),
mobile (iOS Safari) verified, and the non-affiliation disclaimer present.

**Explicit v1 exit condition (anti-drift):** v1 ships when items 1–5 are live on the
deployed URL with `pnpm verify` green and the §9 gate artifacts captured. Anything in
§10 Deferred is out of v1 by definition. No new feature enters v1 without editing this
spec first.

## 2. Hard Boundary (non-negotiable — carries over verbatim from v0 §2)

No wallet connect. No signing. No swaps. No claim flow. No trading. No execution. No
wallet adapters. Read-only public data only. The recipient lookup is a **client-side
filter over the public snapshot** — it takes a pasted address and searches already-fetched
data; it never connects a wallet. CI-enforced: `pnpm verify` fails if `src/` references
`@solana/wallet-adapter`, `@jup-ag`, `phantom`, `signTransaction`, or `sendTransaction`
(`scripts/check-boundary.mjs`, already wired).

## 3. Locked Decisions

| Decision | Choice |
|---|---|
| Product hero | Live **airdrop web** (graph + feed + stats + recipient lookup) |
| Creator rewards | **Kept**, demoted to a secondary tab (existing `page` content + `/api/creator-rewards`, `/api/token/ansem` untouched) |
| Airdrop source | `GV6UUm…dC52` itself (verified). **No `Dtw3GCTN…` relay.** |
| History horizon | **Full history**, captured via resumable incremental backfill |
| Liveness | **Periodic snapshot** rebuilt by CI cron (~15–30 min); served static; refreshes on reload. No request-time RPC, no client polling loop. |
| Data pipeline | **Approach A:** GitHub Action cron → throttled collector → `snapshot.json` committed to a `data` branch → served via jsDelivr CDN → static Next site reads it |
| Graph engine | **`react-force-graph-2d`** (canvas). Directional flow particles + custom canvas glow + vignette/grain overlay. No three.js / no 3D. |
| Graph scale | Render **top ~300 recipients by ANSEM received**; remainder shown as a clustered "+N more" summary node. Full recipient set powers stats + lookup. |
| Token scope | v1 web/UI is **ANSEM-only** (mint-exact). Collector is **mint-aware** and records any non-ANSEM sprays it sees (§7) so multi-token is data-ready without rework. |
| Data source | Standard Solana JSON-RPC + instruction-parsing (v0 §8 rationale unchanged); **add throttle + 429 backoff** to the RPC batch layer |
| Branding | "Black Noise" editorial dark + oxblood `#B11226` + Black Bull, **balanced** with the non-affiliation disclaimer — carries over from v0 §10 |
| UI process | Render + screenshot + eyeball at every UI step, **desktop AND ~390px mobile (iOS Safari)** |

### Constants (validated on-chain; see `src/lib/domain.ts`)
- Source wallet: `GV6UUmNxz2RpKxmNAPadYKb7uQpszwqQAu3qLJxVdC52`
- ANSEM mint: `9cRCn9rGT8V2imeM2BaKs13yhMEais3ruM3rPvTGpump` (Token-2022 `TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb`, 6 decimals)
- Native SOL sentinel: `So11111111111111111111111111111111111111112`
- Helius RPC: `https://mainnet.helius-rpc.com/?api-key=<HELIUS_API_KEY>`

### Why mint-exact matching is essential (carries over from v0 §3 — still true)
GV6U holds ~12 tokens literally named ANSEM / Ansem / GIGAANSEM / "🐂" etc. Only one is
the real mint. The airdrop web, stats, and lookup count a transfer **only** when
`mint === 9cRCn9…pump`. Dedicated decoy test (§9).

## 4. Current State (what exists vs what's missing)

**Exists and reused:**
- `src/lib/rpc-source.ts` — networked: `getOutgoingTransactions({ wallet, sinceDays?, untilSignature?, maxSignatures? })`, signature pagination (`before`) + batched `getTransaction` (jsonParsed, batch 25). Supports the incremental cursor (`untilSignature`) and returns `newestSignature`. **No throttle/backoff yet → 429s (must fix, §6a).**
- `src/lib/transfer-parser.ts` — pure `parseOutgoingTransfers(HeliusTransaction[], sourceWallet)` → `{ transfers: TransferRow[], unparsed[] }`. Splits native + token transfers, composite-id dedup, `eventIndex` ordering, Token-2022 detection, failed-tx skip.
- `src/lib/aggregate.ts` — pure `buildSnapshot` / `mergeSnapshots` / `withCollectedAt`. Recipients rollup + `ansemSentUi` / `solSentUi` totals + dedup.
- `src/lib/domain.ts` — `TransferRow`, `RecipientRow`, `Snapshot`, plus creator-rewards types.
- `scripts/investigate.ts` — inline instruction-parsing prototype (tokenMap + instruction walk over raw `RpcGetTransaction`). **This is the prototype for the missing adapter.**
- Creator-rewards product: `src/lib/pump.ts`, `src/lib/price.ts`, `/api/creator-rewards`, `/api/token/ansem`, current `page.tsx`.

**Missing / must build:**
- **`src/lib/rpc-adapter.ts`** — the `rawTxToHelius(tx): HeliusTransaction` adapter the v0 plan defined but never built. Formalizes `investigate.ts`'s inline logic into a pure, tested unit feeding the existing `transfer-parser`. (This is the gap between `rpc-source` output and `transfer-parser` input.)
- **Amount-per-recipient + ANSEM-only rollup** — `RecipientRow` currently lacks a cumulative amount, and `aggregate.recipients()` rolls up **all** transfers (including SOL-dust legs, which go to different addresses and are not airdrops). Both must change (§6c).
- **`snapshot.json` delivery** — currently no airdrop snapshot is read by the site; needs the `data`-branch + jsDelivr read path (§6d).
- **The collector orchestrator + CI workflow + graph UI** (§6).

## 5. Architecture & Data Flow

```
CI CRON (GitHub Action, Linux, ~*/20 min)          .github/workflows/collect.yml
  -> scripts/collect-snapshot.ts (throttled, backoff)
       reads prior snapshot.json from `data` branch (cursor = lastSignature)
       rpc-source.getOutgoingTransactions({ untilSignature: cursor })       [incremental]
         or resumable backfill (maxSignatures budget, oldestScanned cursor) [first runs]
       -> rpc-adapter.rawTxToHelius (pure)        [NEW]
       -> transfer-parser.parseOutgoingTransfers (pure, existing)
       -> aggregate.buildSnapshot / mergeSnapshots (pure, existing + amount rollup)
       -> validate -> write snapshot.json -> commit to `data` branch

DELIVERY            `data` branch raw file -> jsDelivr CDN (cached)
                    https://cdn.jsdelivr.net/gh/AIEngineerX/ansem-airdrop-net@data/snapshot.json

READ PATH (Next.js, static + client fetch)
  -> committed last-known snapshot for first paint (no blank state)
  -> client fetch jsDelivr snapshot -> hydrate graph + feed + stats + lookup
  -> "data as of {collectedAt}" stamp always visible
  Creator Rewards tab: existing /api/creator-rewards + /api/token/ansem (unchanged)
```

Only networked unit in the **site** is the snapshot fetch (CDN). All chain RPC happens
in CI. `rpc-adapter`, `transfer-parser`, `aggregate` stay pure and unit-tested.

## 6. Units / File Plan

**a) `src/lib/rpc-source.ts` (change): throttle + backoff.** Add a bounded
inter-batch delay and exponential-backoff retry on HTTP 429 / RPC rate-limit errors
(e.g. base 500 ms, ×2, max ~5 retries, jitter). This is the single fix that makes
free-tier backfill viable. Keep the existing pagination/cursor API.

**b) `src/lib/rpc-adapter.ts` (new, pure): `rawTxToHelius(tx: RpcGetTransaction): HeliusTransaction`.**
Formalize `investigate.ts`'s logic per v0 §8 instruction-parsing rules:
- Build a token-account map from `pre/postTokenBalances` (union of `accountIndex`): `tokenAccount → { owner, mint, decimals, programId }`.
- Instructions = `message.instructions` ∪ `flatten(meta.innerInstructions[].instructions)`.
- Native SOL out → `nativeTransfers` (`system transfer`, `info.source === wallet`).
- SPL / Token-2022 out → `tokenTransfers` with `toUserAccount` resolved to the **owner** of `info.destination`; `tokenStandard = "FungibleToken2022"` iff Token-2022 programId.
- Self-transfer guard (destination owner === wallet → skip). Skip `meta.err != null`.
Emits the existing `HeliusTransaction` shape so `transfer-parser` is reused unchanged.

**c) `src/lib/domain.ts` + `src/lib/aggregate.ts` (change): amount-per-recipient, ANSEM-only web.**
- Extend `RecipientRow` with `totalAnsemUi: number` (and keep `transferCount`/`firstSeen`/`latestSeen`). Add `signatures?: string[]` (capped, e.g. last 10) for lookup tx links.
- `recipients()` rolls up from **ANSEM transfers only** (`mint === ANSEM_MINT`) — the airdrop web is ANSEM recipients, not SOL-dust addresses.
- Add to `Snapshot`: `feed: { wallet, amountUi, blockTime, signature, txUrl }[]` (newest ~100 ANSEM transfers), `backfillComplete: boolean`, `cursors: { newest: string|null, oldestScanned: string|null }`, and `otherMintsSent: { mint, count, totalUi }[]` (mint-aware audit of any non-ANSEM sprays). `solSentUi` retained as overhead stat.
- Lifetime totals: `uniqueRecipients` (ANSEM), `totalAnsemUi`, `totalAirdrops` (count of ANSEM transfers, mint-exact).

**d) `src/lib/snapshot-client.ts` (new): read path.** Fetch the jsDelivr snapshot
(typed), with the committed `public/snapshot.seed.json` (or `src/data/...`) as
first-paint fallback; expose `loadAirdropSnapshot()` for client components. Never throw
to a blank screen — fall back to seed + show staleness.

**e) `scripts/collect-snapshot.ts` (new): orchestrator.** Reads prior snapshot from the
`data` branch (in CI: `git` checkout of the branch, or fetch raw), computes cursor,
runs incremental or a bounded backfill chunk, parses → aggregates → merges → validates
(non-empty, monotonic `collectedAt`, schema) → writes `snapshot.json` and commits to the
`data` branch. Backfill is resumable: persist `oldestScanned`; set `backfillComplete`
when pagination reaches genesis of GV6U's outgoing ANSEM history.

**f) `.github/workflows/collect.yml` (new): CI cron.** Cadence is constrained by GitHub
Actions free minutes (2,000/mo on private repos): `*/20` ≈ 4,300 min/mo **exceeds** the
cap. **Decision:** if the repo is **public**, Actions minutes are unlimited → use
`*/15`; if **private**, use `*/30` (~1,440 min/mo, under cap) **with pnpm store caching**
to keep each run short. Pick the cadence at implementation time from the repo's actual
visibility (§13). Plus manual `workflow_dispatch`. Steps: checkout `data` branch,
cache + `pnpm install`, run collector with `HELIUS_API_KEY` from Actions secret,
commit/push `snapshot.json` to `data` (bot identity; `[skip ci]`). Concurrency-guarded
so runs don't overlap.

**g) UI — `src/app/` (change):** introduce a tab/segmented control: **Airdrop Web**
(default) | **Creator Rewards** (existing). Airdrop Web view composes:
- `src/components/AirdropGraph.tsx` (client) — `react-force-graph-2d` (§8).
- `src/components/AirdropFeed.tsx` — newest-first feed from `snapshot.feed`.
- `src/components/AirdropStats.tsx` — lifetime stat cards.
- `src/components/RecipientLookup.tsx` — controlled input → filter over `recipients[]`.
- `src/components/DataStamp.tsx` — "data as of {collectedAt}" + covered window + backfill progress.
Hero (Black Bull) + disclaimer retained. Creator Rewards view = current `page.tsx` body extracted into a component.

**Deps added:** `react-force-graph-2d` (+ its peer `d3-force` if required). No three.js.

## 7. Snapshot Schema (`snapshot.json` on `data` branch)

```jsonc
{
  "collectedAt": "ISO-8601",
  "source": "GV6UUm…C52",
  "mint": "9cRCn9…pump",
  "backfillComplete": false,
  "cursors": { "newest": "base58|null", "oldestScanned": "base58|null" },
  "totals": {
    "uniqueRecipients": 0,      // ANSEM recipients
    "totalAnsemUi": 0,          // sum ANSEM airdropped (mint-exact)
    "totalAirdrops": 0,         // count of ANSEM transfers
    "solOverheadUi": 0,         // sum of 0.002074-style dust legs (informational)
    "windowFrom": "ISO|null",
    "windowThrough": "ISO|null"
  },
  "recipients": [               // FULL set → stats + lookup
    { "wallet": "…", "totalAnsemUi": 0, "transferCount": 0,
      "firstSeen": "ISO", "latestSeen": "ISO", "signatures": ["…"] }
  ],
  "feed": [                     // newest ~100 ANSEM transfers → live feed
    { "wallet": "…", "amountUi": 0, "blockTime": "ISO", "signature": "…", "txUrl": "…" }
  ],
  "otherMintsSent": [           // mint-aware audit; expected empty/near-empty in v1
    { "mint": "…", "count": 0, "totalUi": 0 }
  ]
}
```

USD is **not** stored. If the web shows USD value, it multiplies `totalAnsemUi` by the
live ANSEM price from the existing `price.ts`/`/api/token/ansem` at render time.

## 8. Graph — "cinematic yet clean" (visual contract)

`react-force-graph-2d` on a dark stage. Concrete, testable target:
- **Stage:** near-black canvas (not flat `#000`) + soft radial vignette + faint film grain ("Black Noise"). Generous negative space.
- **Core:** GV6U central node, larger, oxblood `#B11226` glow + slow pulse; optional Black Bull emblem at center. The gravitational anchor.
- **Edges:** hairline, low-opacity oxblood fading outward, with **`linkDirectionalParticles`** flowing GV6U → recipient (ANSEM visibly leaving the bull). This is the primary "cinematic" cue.
- **Recipients:** small luminous dots via `nodeCanvasObject`; radius ∝ `totalAnsemUi`; color ramp dim-ember → white-hot oxblood for largest/most-recent; glow only on the largest.
- **Restraint = "clean":** render top ~300 by amount + a clustered "+N more" node; labels only on hover / largest; one accent color; no rainbow.
- **Focus interaction:** hover a node → highlight its edge, dim the rest (depth-of-field); tooltip = truncated wallet + ANSEM received + last-seen. Click → scroll/bind to lookup.
- **Motion:** gentle settle then slow drift; no frantic re-layout. New-since-last-load nodes get a brief fade+scale-in.
- **Mobile:** pinch/drag zoom; on narrow widths the graph is a tappable/zoomable panel with the feed prioritized above it; cap rendered nodes lower (e.g. ~120) on small screens for perf. Verified at ~390px iOS Safari.

## 9. Verification Gate / Tests (real fixtures, no mocks — `pnpm verify`)

`pnpm verify` (boundary grep + lint + typecheck + test + build) stays the gate. Per
`AGENTS.md`, confirm/read bundled Next 16 docs before route/handler code.

**Fixtures (captured from real chain, committed):** a real multi-recipient ANSEM
Token-2022 airdrop tx (e.g. `5jM5PD…` — ANSEM + paired SOL dust to a different
address); the earlier-confirmed `5URkAZ…` single send; a decoy ANSEM-named token tx; an
incoming non-ANSEM token tx (must NOT appear as outgoing); a self/own-account move.

**Pure tests (free, no mocks):**
- `rpc-adapter`: ANSEM Token-2022 send → `token_2022` token transfer with `toUserAccount` = destination **owner**; SOL dust leg parsed as native, **not** folded into ANSEM; self-move excluded; CPI/inner transfers captured; `meta.err` skipped.
- `aggregate` (extended): recipient rollup is **ANSEM-only** (SOL-dust addresses do not become recipient nodes); `totalAnsemUi` per recipient correct; `totalAirdrops` counts ANSEM transfers only; decoy token (`symbol:"ANSEM"`, different mint) contributes **nothing**; `mergeSnapshots` re-dedups across overlap; `feed` is newest-first, length-capped.
- `backoff` policy: deterministic unit test of the retry schedule (pure; no network).
- `snapshot-client`: jsDelivr-fetch failure → returns the seed fallback (inject a fetch stub at the boundary only).
- Lookup filter: known recipient → hit with amount/dates; unknown → "no airdrop found."

**First-deploy gate — each yields an artifact:**
1. CI collector run → `snapshot.json` on `data` branch with ≥1 real ANSEM recipient and populated cursors.
2. Two collector runs → `collectedAt` advances and new recipients merge (proves incremental path).
3. Deployed page renders the graph with real nodes **and** the live feed with real rows.
4. Recipient lookup returns a correct hit for a known recipient and a clean miss for a random wallet.
5. `otherMintsSent` reviewed — confirms (or updates) the ANSEM-only finding over real backfill.
6. Boundary grep passes; mobile (~390px iOS Safari) screenshot captured.

## 10. Deferred (explicitly out of v1)

True real-time (Helius webhook / `transaction-subscribe` / SSE); multi-token web UI
(token selector) — data is captured (`otherMintsSent`) but no UI until a non-ANSEM
spray is actually observed; recipient→recipient secondary graph / clustering; X-handle
matching of recipients; at-transfer USD valuation; CSV/API export; Netlify Blobs
pipeline (Approach B); sub-15-min cadence. Out until the v1 web ships and is verified.

## 11. Anti-Drift Guardrail (done FIRST)

Rewrite `CLAUDE.md` from the creator-rewards locked scope to **this** restored
airdrop-web scope: the §2 boundary, §3 locked decisions, §10 deferred list, the §1
definition-of-done + explicit v1 exit condition, the §9 gate, and the UI-review-as-you-go
rule. Keep the `@AGENTS.md` Next-16-docs reference. Correct the false "passive holder"
statement. Done before any feature code so the guardrail is active during the build.

## 12. Deploy (user-driven; I provide exact steps, click nothing)

1. Create the orphan `data` branch; seed `snapshot.json`.
2. Add `HELIUS_API_KEY` as a GitHub Actions secret; enable the workflow.
3. Connect `AIEngineerX/ansem-airdrop-net` to Netlify (**Linux CI build — this fixes
   the Windows `@netlify/plugin-nextjs` EPERM symlink blocker**). Site auto-deploys on
   code pushes to `main`; data updates land on `data`/jsDelivr without a rebuild.
4. Confirm the §9 first-deploy gate on the live URL.

## 13. Open Risks

- **Backfill volume on free tier:** GV6U's full outgoing ANSEM history may be large; resumable backfill + backoff spreads it over several CI runs. `backfillComplete=false` is surfaced in the UI until done.
- **GitHub Actions cron drift:** scheduled Actions can be delayed/skipped under load; a 15–30 min cadence tolerates this. `workflow_dispatch` allows manual refresh.
- **Actions free-minute cap:** 2,000 min/mo on private repos. Resolve at implementation: public repo → `*/15` (unlimited minutes); private → `*/30` + pnpm-store cache to stay under cap. Confirm repo visibility before setting the cron.
- **Graph perf at scale:** capped render (top ~300 / ~120 mobile) + clustered remainder; if still heavy, lower caps or pre-decimate in the snapshot.
- **`data`-branch commit noise / jsDelivr cache:** bot commits with `[skip ci]`; jsDelivr edge cache (~12h purge) means a manual purge ping or versioned URL may be needed for fast updates — acceptable for periodic-snapshot cadence.
- **SOL-dust pairing:** the dust leg targets a different address than the ANSEM in the same tx; the ANSEM transfer is the airdrop edge, dust is overhead (`solOverheadUi`). Covered by the adapter/aggregate tests.
- **Attribution:** wallet→Ansem link is profile-associated, not a wallet-ownership proof; the v0 disclaimer/Methodology copy (non-affiliation, "attribution unconfirmed") is retained.
- **Re-run `pnpm verify` on Windows:** Node v24 expands the `tsx --test` glob natively; build path validated in CI regardless.
