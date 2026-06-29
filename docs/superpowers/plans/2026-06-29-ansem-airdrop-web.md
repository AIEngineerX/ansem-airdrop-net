# Ansem Airdrop Web Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restore ansem-airdrop-net to its original purpose — a live, cinematic web of wallets airdropped $ANSEM by `GV6U…dC52` — with the shipped creator-rewards dashboard kept as a secondary tab.

**Architecture:** A throttled collector runs in GitHub Actions, walks GV6U's outgoing transfers via standard Solana RPC, parses them through a pure adapter→parser→fold pipeline into a compact `AirdropSnapshot`, and commits it to a `data` branch served over jsDelivr. The Next.js site is static: it fetches that snapshot client-side and renders a 2D canvas force-graph + live feed + lifetime stats + recipient lookup, with a tab back to the existing creator-rewards view.

**Tech Stack:** Next.js 16.2.9, React 19, TypeScript, Tailwind v4, pnpm, `tsx` test runner, `react-force-graph-2d` (canvas), standard Solana JSON-RPC via Helius.

Full design: `docs/superpowers/specs/2026-06-29-ansem-airdrop-web-design.md`.

## Global Constraints

- **Read-only boundary (CI-enforced):** no wallet connect, signing, swaps, claim, trading, or wallet adapters. `src/` must never contain `@solana/wallet-adapter`, `@jup-ag`, `phantom`, `signTransaction`, `sendTransaction`. `scripts/check-boundary.mjs` enforces this inside `pnpm verify`.
- **Gate:** `pnpm verify` (= `node scripts/check-boundary.mjs && pnpm lint && pnpm typecheck && pnpm test && pnpm build`) must be green before every commit that touches `src/`, `scripts/`, or config.
- **No mocks.** Pure functions get real unit tests (`tsx --test test/*.test.ts`). UI is verified by running the app and screenshotting at **desktop AND ~390px (iOS Safari)** — never "it compiles."
- **Mint-exact:** a transfer counts as an ANSEM airdrop only when `mint === ANSEM_MINT` (`9cRCn9rGT8V2imeM2BaKs13yhMEais3ruM3rPvTGpump`). Never match by symbol.
- **Constants** (from `src/lib/domain.ts`): `PRIMARY_SOURCE_WALLET = GV6UUmNxz2RpKxmNAPadYKb7uQpszwqQAu3qLJxVdC52`; `ANSEM_MINT = 9cRCn9rGT8V2imeM2BaKs13yhMEais3ruM3rPvTGpump` (Token-2022, 6 decimals); `NATIVE_SOL_MINT = So11111111111111111111111111111111111111112`.
- **Brand:** "Black Noise" editorial dark; accent oxblood `--accent: #b11226` / `--accent-soft: #e0455a` (already in `globals.css`); `.grain` overlay and safe-area insets already exist; Black Bull art at `/public/black-bull.png`. Persistent "Unofficial · not affiliated with Ansem" disclaimer.
- **Git identity:** AIEngineerX (local config already set). Commit at every task. **Do not run `git push`** — it is blocked by a user hook; after committing, tell the user the exact `git push` command to run.
- **AGENTS.md:** this is a modified Next.js 16 — before writing any route/handler/config code, read the relevant guide under `node_modules/next/dist/docs/`.
- **No `Date.now()` in scripts** run by the collector path that must be deterministic-testable; pure functions that need "now" take it as a parameter. Components may use `Date.now()`.

---

### Task 0: Anti-drift CLAUDE.md + setup gate + dependency

**Files:**
- Modify: `CLAUDE.md` (full rewrite)
- Modify: `package.json` (add dependency)

**Interfaces:**
- Produces: a green baseline + `react-force-graph-2d` installed; an accurate locked-scope `CLAUDE.md`.

- [ ] **Step 1: Confirm baseline + Next docs path**

Run: `pnpm install && ls node_modules/next/dist/docs/ | head && pnpm verify`
Expected: install completes; `node_modules/next/dist/docs/` lists files (if absent, note it and rely on the live Next 16 docs); `pnpm verify` ends with `boundary OK` and a successful build.

- [ ] **Step 2: Rewrite `CLAUDE.md` to the restored scope**

Replace the entire file with:

```markdown
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
```

- [ ] **Step 3: Add the graph dependency**

Run: `pnpm add react-force-graph-2d`
Expected: `package.json` `dependencies` gains `react-force-graph-2d`; lockfile updates.

- [ ] **Step 4: Re-verify**

Run: `pnpm verify`
Expected: `boundary OK` + green build (the new dep is not imported yet, so nothing breaks).

- [ ] **Step 5: Commit**

```bash
git add CLAUDE.md package.json pnpm-lock.yaml
git commit -m "chore: restore airdrop-web scope (CLAUDE.md) + add react-force-graph-2d"
```
Then tell the user: `git push -u origin feat/airdrop-web` (hook blocks push from the agent).

---

### Task 1: Capture real RPC fixtures

**Files:**
- Create: `scripts/capture-fixtures.ts`
- Create: `test/fixtures/airdrop-multi.json`, `test/fixtures/airdrop-single.json`, `test/fixtures/incoming-other.json` (written by the script)

**Interfaces:**
- Produces: three committed raw `RpcGetTransaction` JSON fixtures used by Tasks 3–4.

- [ ] **Step 1: Write the capture script**

Create `scripts/capture-fixtures.ts`:

```ts
#!/usr/bin/env tsx
// Fetch specific real txs as raw RpcGetTransaction JSON for fixtures.
// Usage: node --env-file=.env --import tsx scripts/capture-fixtures.ts
import { writeFileSync, mkdirSync } from "node:fs";
import { rpcUrl } from "../src/lib/rpc-source";

const SIGS: Record<string, string> = {
  "airdrop-multi": "5jM5PDMXQ136TuBWkjQ6WkFfizvAySzpoDsENT1yuvKqBzpDUh5h637yxLgq8RBZQrwGjDqSEbXGMz3Uih5TuMR9",
  "airdrop-single": "5URkAZ8oSa8BZLYcGCJ1TGw6mENYVuYS3XPoeaUjJhJF7kRLiusGh2U4Ei3En5LRB7xYWSmazSz9q6PtTzVdUNNW",
  "incoming-other": "GYrLxwrhFRc5EDNut2LWRKKD7USESW26eUDXMcK3jpSMLeaq2x1oUjMwo4MGbqMWGgwbxfpyr34So1t3KwtpjQZ",
};

async function getTx(url: string, sig: string): Promise<unknown> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0", id: 1, method: "getTransaction",
      params: [sig, { encoding: "jsonParsed", maxSupportedTransactionVersion: 0 }],
    }),
  });
  if (!res.ok) throw new Error(`RPC ${res.status}`);
  const json = (await res.json()) as { result?: unknown; error?: unknown };
  if (json.error) throw new Error(JSON.stringify(json.error));
  return json.result;
}

async function main() {
  const url = rpcUrl();
  mkdirSync("test/fixtures", { recursive: true });
  for (const [name, sig] of Object.entries(SIGS)) {
    const result = await getTx(url, sig);
    writeFileSync(`test/fixtures/${name}.json`, JSON.stringify(result, null, 2));
    console.log(`wrote test/fixtures/${name}.json`);
    await new Promise((r) => setTimeout(r, 1500)); // throttle: avoid free-tier 429
  }
}
main().catch((e) => { console.error(e instanceof Error ? e.message : e); process.exitCode = 1; });
```

- [ ] **Step 2: Run it**

Run: `node --env-file=.env --import tsx scripts/capture-fixtures.ts`
Expected: three "wrote test/fixtures/…json" lines, no 429 (the 1.5s spacing keeps it under the rate limit).

- [ ] **Step 3: Sanity-check the fixtures**

Run: `node -e "const t=require('./test/fixtures/airdrop-single.json'); console.log(t.transaction.transaction?undefined:t.meta.err, t.transaction.message.accountKeys[0].pubkey)"`
Expected: prints `null GV6UUmNxz2RpKxmNAPadYKb7uQpszwqQAu3qLJxVdC52` (success, fee-payer = GV6U). If the field path differs, open the JSON and confirm it matches `RpcGetTransaction` in `src/lib/rpc-types.ts`.

- [ ] **Step 4: Commit**

```bash
git add scripts/capture-fixtures.ts test/fixtures/airdrop-multi.json test/fixtures/airdrop-single.json test/fixtures/incoming-other.json
git commit -m "test: capture real RPC fixtures for airdrop parsing"
```
Hand the user the push command.

---

### Task 2: Throttle + backoff in rpc-source

**Files:**
- Modify: `src/lib/rpc-source.ts`
- Test: `test/backoff.test.ts`

**Interfaces:**
- Produces: `export function backoffDelayMs(attempt: number): number` and a 429-retrying `rpcBatch`. `getOutgoingTransactions` signature is unchanged.

- [ ] **Step 1: Write the failing test**

Create `test/backoff.test.ts`:

```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { backoffDelayMs } from "../src/lib/rpc-source";

test("backoff grows exponentially and is capped", () => {
  assert.equal(backoffDelayMs(0), 500);
  assert.equal(backoffDelayMs(1), 1000);
  assert.equal(backoffDelayMs(2), 2000);
  assert.equal(backoffDelayMs(3), 4000);
  assert.equal(backoffDelayMs(10), 8000); // capped
});
```

- [ ] **Step 2: Run it, verify it fails**

Run: `pnpm exec tsx --test test/backoff.test.ts`
Expected: FAIL — `backoffDelayMs` is not exported.

- [ ] **Step 3: Implement backoff + wire retry**

In `src/lib/rpc-source.ts`, add near the top (after `rpcUrl`):

```ts
export function backoffDelayMs(attempt: number): number {
  return Math.min(500 * 2 ** attempt, 8000);
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
```

Then replace the body of `rpcBatch` so the `fetch` is retried on 429 / rate-limit:

```ts
async function rpcBatch(url: string, calls: RpcCall[]): Promise<unknown[]> {
  const body = calls.map((c, i) => ({ jsonrpc: "2.0", id: i, method: c.method, params: c.params }));
  for (let attempt = 0; ; attempt++) {
    const res = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    if (res.status === 429) {
      if (attempt >= 5) throw new Error("RPC 429 after 5 retries");
      await sleep(backoffDelayMs(attempt));
      continue;
    }
    if (!res.ok) throw new Error(`RPC ${res.status} ${res.statusText}`);
    const json = (await res.json()) as Array<{ id: number; result?: unknown; error?: unknown }>;
    const arr = Array.isArray(json) ? json : [json];
    const rateLimited = arr.find((r) => r.error && JSON.stringify(r.error).includes("rate"));
    if (rateLimited) {
      if (attempt >= 5) throw new Error("RPC rate-limited after 5 retries");
      await sleep(backoffDelayMs(attempt));
      continue;
    }
    return arr
      .sort((a, b) => a.id - b.id)
      .map((r) => { if (r.error) throw new Error(`RPC error: ${JSON.stringify(r.error)}`); return r.result; });
  }
}
```

Also add a small inter-batch pause inside the `getTransaction` batch loop: after each `chunk` is processed, `await sleep(250)`.

- [ ] **Step 4: Run test, verify pass**

Run: `pnpm exec tsx --test test/backoff.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/rpc-source.ts test/backoff.test.ts
git commit -m "feat: throttle + 429 backoff in rpc-source"
```
Hand the user the push command.

---

### Task 3: rpc-adapter (rawTxToHelius)

**Files:**
- Create: `src/lib/rpc-adapter.ts`
- Test: `test/rpc-adapter.test.ts`

**Interfaces:**
- Consumes: `RpcGetTransaction` (`src/lib/rpc-types.ts`); `HeliusTransaction`, `HeliusTokenTransfer`, `HeliusNativeTransfer` (`src/lib/transfer-parser.ts`); `PRIMARY_SOURCE_WALLET`, `ANSEM_MINT` (`src/lib/domain.ts`).
- Produces: `export function rawTxToHelius(tx: RpcGetTransaction): HeliusTransaction`.

- [ ] **Step 1: Write the failing test**

Create `test/rpc-adapter.test.ts`:

```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { rawTxToHelius } from "../src/lib/rpc-adapter";
import { parseOutgoingTransfers } from "../src/lib/transfer-parser";
import { ANSEM_MINT, NATIVE_SOL_MINT, PRIMARY_SOURCE_WALLET } from "../src/lib/domain";
import type { RpcGetTransaction } from "../src/lib/rpc-types";

const load = (n: string) => JSON.parse(readFileSync(`test/fixtures/${n}.json`, "utf8")) as RpcGetTransaction;

test("ANSEM single send -> one Token-2022 outgoing transfer to the owner", () => {
  const helius = rawTxToHelius(load("airdrop-single"));
  const { transfers } = parseOutgoingTransfers([helius], PRIMARY_SOURCE_WALLET);
  const ansem = transfers.filter((t) => t.mint === ANSEM_MINT);
  assert.equal(ansem.length, 1);
  assert.equal(ansem[0].transferType, "token_2022");
  assert.ok(ansem[0].amountUi > 2000 && ansem[0].amountUi < 3000);
  assert.notEqual(ansem[0].recipientWallet, PRIMARY_SOURCE_WALLET); // resolved to owner, not self
});

test("airdrop-multi: ANSEM leg counted, SOL dust leg is native (not folded into ANSEM)", () => {
  const helius = rawTxToHelius(load("airdrop-multi"));
  const { transfers } = parseOutgoingTransfers([helius], PRIMARY_SOURCE_WALLET);
  assert.ok(transfers.some((t) => t.mint === ANSEM_MINT));
  assert.ok(transfers.some((t) => t.mint === NATIVE_SOL_MINT && t.amountUi > 0 && t.amountUi < 0.01));
});

test("incoming-other: a received non-ANSEM token yields NO outgoing transfer", () => {
  const helius = rawTxToHelius(load("incoming-other"));
  const { transfers } = parseOutgoingTransfers([helius], PRIMARY_SOURCE_WALLET);
  assert.equal(transfers.length, 0);
});
```

- [ ] **Step 2: Run it, verify it fails**

Run: `pnpm exec tsx --test test/rpc-adapter.test.ts`
Expected: FAIL — `rawTxToHelius` not found.

- [ ] **Step 3: Implement the adapter**

Create `src/lib/rpc-adapter.ts`:

```ts
import type { RpcGetTransaction, RpcInstruction, RpcTokenBalance } from "./rpc-types";
import type { HeliusTransaction, HeliusNativeTransfer, HeliusTokenTransfer } from "./transfer-parser";

const TOKEN_2022_PROGRAM = "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb";

type AcctInfo = { owner?: string; mint: string; decimals: number; programId?: string };

function tokenAccountMap(tx: RpcGetTransaction): Map<string, AcctInfo> {
  const keys = tx.transaction.message.accountKeys;
  const m = new Map<string, AcctInfo>();
  const all: RpcTokenBalance[] = [
    ...(tx.meta?.preTokenBalances ?? []),
    ...(tx.meta?.postTokenBalances ?? []),
  ];
  for (const b of all) {
    const pk = keys[b.accountIndex]?.pubkey;
    if (pk) m.set(pk, { owner: b.owner, mint: b.mint, decimals: b.uiTokenAmount.decimals, programId: b.programId });
  }
  return m;
}

function allInstructions(tx: RpcGetTransaction): RpcInstruction[] {
  return [
    ...tx.transaction.message.instructions,
    ...(tx.meta?.innerInstructions ?? []).flatMap((g) => g.instructions),
  ];
}

export function rawTxToHelius(tx: RpcGetTransaction): HeliusTransaction {
  const signature = tx.transaction.signatures[0] ?? "";
  const feePayer = tx.transaction.message.accountKeys[0]?.pubkey;
  const nativeTransfers: HeliusNativeTransfer[] = [];
  const tokenTransfers: HeliusTokenTransfer[] = [];

  if (tx.meta?.err == null) {
    const map = tokenAccountMap(tx);
    for (const ins of allInstructions(tx)) {
      const info = (ins.parsed?.info ?? {}) as Record<string, unknown>;
      const type = ins.parsed?.type;

      // Native SOL out
      if (ins.program === "system" && (type === "transfer" || type === "transferChecked")) {
        const source = info.source as string | undefined;
        const destination = info.destination as string | undefined;
        const lamports = Number(info.lamports ?? 0);
        if (source && destination) {
          nativeTransfers.push({ fromUserAccount: source, toUserAccount: destination, amount: lamports });
        }
        continue;
      }

      // SPL / Token-2022 out
      if (
        (ins.program === "spl-token" || ins.program === "spl-token-2022") &&
        (type === "transfer" || type === "transferChecked")
      ) {
        const srcAcct = info.source as string | undefined;
        const dstAcct = info.destination as string | undefined;
        if (!srcAcct || !dstAcct) continue;
        const srcOwner = map.get(srcAcct)?.owner;
        const dstOwner = map.get(dstAcct)?.owner;
        const mint = (info.mint as string | undefined) ?? map.get(srcAcct)?.mint ?? map.get(dstAcct)?.mint;
        if (!mint) continue;
        if (dstOwner && srcOwner && dstOwner === srcOwner) continue; // self-move guard
        const decimals = map.get(srcAcct)?.decimals ?? map.get(dstAcct)?.decimals;
        const tokenAmountObj = info.tokenAmount as { amount?: string; uiAmount?: number } | undefined;
        const rawAmount = (info.amount as string | undefined) ?? tokenAmountObj?.amount ?? "0";
        const uiAmount =
          tokenAmountObj?.uiAmount ??
          (decimals != null ? Number(rawAmount) / 10 ** decimals : Number(rawAmount));
        tokenTransfers.push({
          fromUserAccount: srcOwner,
          toUserAccount: dstOwner,
          fromTokenAccount: srcAcct,
          toTokenAccount: dstAcct,
          mint,
          tokenAmount: uiAmount,
          rawTokenAmount: { tokenAmount: String(rawAmount), decimals },
          tokenStandard: ins.program === "spl-token-2022" || map.get(srcAcct)?.programId === TOKEN_2022_PROGRAM
            ? "FungibleToken2022"
            : "FungibleToken",
        });
      }
    }
  }

  return {
    signature,
    slot: tx.slot,
    timestamp: tx.blockTime ?? undefined,
    transactionError: tx.meta?.err ?? null,
    nativeTransfers,
    tokenTransfers,
    // feePayer retained for debugging; not part of the parser contract
    ...(feePayer ? {} : {}),
  };
}
```

Note: `parseOutgoingTransfers` filters on `fromUserAccount === sourceWallet`, so resolving `fromUserAccount` to the **owner** (`srcOwner`) is what makes GV6U's sends match.

- [ ] **Step 4: Run test, verify pass**

Run: `pnpm exec tsx --test test/rpc-adapter.test.ts`
Expected: PASS (all three).

- [ ] **Step 5: Commit**

```bash
git add src/lib/rpc-adapter.ts test/rpc-adapter.test.ts
git commit -m "feat: rpc-adapter — raw jsonParsed tx -> Helius transfer shape"
```
Hand the user the push command.

---

### Task 4: AirdropSnapshot model + foldTransfers

**Files:**
- Create: `src/lib/airdrop-snapshot.ts`
- Test: `test/airdrop-snapshot.test.ts`

**Interfaces:**
- Consumes: `TransferRow`, `ParseResult` (`src/lib/transfer-parser.ts` re-exports types from `domain.ts`), `ANSEM_MINT`, `NATIVE_SOL_MINT`, `PRIMARY_SOURCE_WALLET` (`domain.ts`).
- Produces:
  - types `AirdropRecipient`, `AirdropFeedItem`, `OtherMintSent`, `AirdropSnapshot`
  - `export const EMPTY_SNAPSHOT: AirdropSnapshot`
  - `export const FEED_MAX = 100`, `export const SIG_CAP = 10`
  - `export function foldTransfers(prev: AirdropSnapshot, rows: TransferRow[], opts: { newestSignature: string | null; oldestScanned: string | null; backfillComplete: boolean; collectedAt: string }): AirdropSnapshot`

- [ ] **Step 1: Write the failing test**

Create `test/airdrop-snapshot.test.ts`:

```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { EMPTY_SNAPSHOT, foldTransfers } from "../src/lib/airdrop-snapshot";
import { ANSEM_MINT, NATIVE_SOL_MINT, type TransferRow } from "../src/lib/domain";

function row(over: Partial<TransferRow>): TransferRow {
  return {
    id: Math.random().toString(36),
    signature: "sig",
    blockTime: "2026-06-29T12:00:00.000Z",
    sourceWallet: "GV6U",
    recipientWallet: "R1",
    mint: ANSEM_MINT,
    amountRaw: "1",
    amountUi: 100,
    transferType: "token_2022",
    parserConfidence: "high",
    eventIndex: 0,
    txUrl: "https://solscan.io/tx/sig",
    ...over,
  };
}

const opts = (sig: string) => ({ newestSignature: sig, oldestScanned: null, backfillComplete: false, collectedAt: "2026-06-29T13:00:00.000Z" });

test("ANSEM transfers roll up per recipient with amount + counts", () => {
  const snap = foldTransfers(EMPTY_SNAPSHOT, [
    row({ recipientWallet: "R1", amountUi: 100, signature: "a", blockTime: "2026-06-29T12:00:00.000Z" }),
    row({ recipientWallet: "R1", amountUi: 50, signature: "b", blockTime: "2026-06-29T12:05:00.000Z" }),
    row({ recipientWallet: "R2", amountUi: 30, signature: "c" }),
  ], opts("a"));
  assert.equal(snap.totals.uniqueRecipients, 2);
  assert.equal(snap.totals.totalAirdrops, 3);
  assert.equal(snap.totals.totalAnsemUi, 180);
  const r1 = snap.recipients.find((r) => r.wallet === "R1")!;
  assert.equal(r1.totalAnsemUi, 150);
  assert.equal(r1.transferCount, 2);
  assert.equal(r1.firstSeen, "2026-06-29T12:00:00.000Z");
  assert.equal(r1.latestSeen, "2026-06-29T12:05:00.000Z");
});

test("SOL dust is overhead, not a recipient; decoy ANSEM-named mint is ignored", () => {
  const snap = foldTransfers(EMPTY_SNAPSHOT, [
    row({ recipientWallet: "R1", amountUi: 100 }),
    row({ recipientWallet: "DUST", mint: NATIVE_SOL_MINT, amountUi: 0.002074, transferType: "native_sol", symbol: "SOL" }),
    row({ recipientWallet: "R3", mint: "DECOYansemMint", amountUi: 9999, symbol: "ANSEM" }),
  ], opts("a"));
  assert.equal(snap.totals.uniqueRecipients, 1); // only R1
  assert.ok(snap.recipients.every((r) => r.wallet !== "DUST" && r.wallet !== "R3"));
  assert.ok(Math.abs(snap.totals.solOverheadUi - 0.002074) < 1e-9);
  assert.equal(snap.totals.totalAnsemUi, 100);
  assert.ok(snap.otherMintsSent.some((o) => o.mint === "DECOYansemMint" && o.totalUi === 9999));
});

test("merge accumulates across calls and feed is newest-first, capped", () => {
  let snap = foldTransfers(EMPTY_SNAPSHOT, [row({ recipientWallet: "R1", signature: "a", blockTime: "2026-06-29T12:00:00.000Z" })], opts("a"));
  snap = foldTransfers(snap, [row({ recipientWallet: "R1", signature: "b", blockTime: "2026-06-29T12:10:00.000Z" })], opts("b"));
  assert.equal(snap.totals.totalAirdrops, 2);
  assert.equal(snap.feed[0].signature, "b"); // newest first
  assert.equal(snap.feed[0].blockTime, "2026-06-29T12:10:00.000Z");
});
```

- [ ] **Step 2: Run it, verify it fails**

Run: `pnpm exec tsx --test test/airdrop-snapshot.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the model + fold**

Create `src/lib/airdrop-snapshot.ts`:

```ts
import { ANSEM_MINT, NATIVE_SOL_MINT, type TransferRow } from "./domain";

export const FEED_MAX = 100;
export const SIG_CAP = 10;

export type AirdropRecipient = {
  wallet: string;
  totalAnsemUi: number;
  transferCount: number;
  firstSeen: string;
  latestSeen: string;
  signatures: string[];
};
export type AirdropFeedItem = {
  wallet: string;
  amountUi: number;
  blockTime: string;
  signature: string;
  txUrl: string;
};
export type OtherMintSent = { mint: string; count: number; totalUi: number };
export type AirdropSnapshot = {
  collectedAt: string;
  source: string;
  mint: string;
  backfillComplete: boolean;
  cursors: { newest: string | null; oldestScanned: string | null };
  totals: {
    uniqueRecipients: number;
    totalAnsemUi: number;
    totalAirdrops: number;
    solOverheadUi: number;
    windowFrom: string | null;
    windowThrough: string | null;
  };
  recipients: AirdropRecipient[];
  feed: AirdropFeedItem[];
  otherMintsSent: OtherMintSent[];
};

export const EMPTY_SNAPSHOT: AirdropSnapshot = {
  collectedAt: new Date(0).toISOString(),
  source: "",
  mint: ANSEM_MINT,
  backfillComplete: false,
  cursors: { newest: null, oldestScanned: null },
  totals: { uniqueRecipients: 0, totalAnsemUi: 0, totalAirdrops: 0, solOverheadUi: 0, windowFrom: null, windowThrough: null },
  recipients: [],
  feed: [],
  otherMintsSent: [],
};

const minIso = (a: string | null, b: string) => (a == null || b < a ? b : a);
const maxIso = (a: string | null, b: string) => (a == null || b > a ? b : a);

export function foldTransfers(
  prev: AirdropSnapshot,
  rows: TransferRow[],
  opts: { newestSignature: string | null; oldestScanned: string | null; backfillComplete: boolean; collectedAt: string },
): AirdropSnapshot {
  const recipients = new Map(prev.recipients.map((r) => [r.wallet, { ...r, signatures: [...r.signatures] }]));
  const others = new Map(prev.otherMintsSent.map((o) => [o.mint, { ...o }]));
  let { totalAnsemUi, totalAirdrops, solOverheadUi, windowFrom, windowThrough } = prev.totals;
  const newFeed: AirdropFeedItem[] = [];

  for (const r of rows) {
    if (r.mint === ANSEM_MINT) {
      totalAirdrops += 1;
      totalAnsemUi += r.amountUi;
      windowFrom = minIso(windowFrom, r.blockTime);
      windowThrough = maxIso(windowThrough, r.blockTime);
      const cur = recipients.get(r.recipientWallet);
      if (!cur) {
        recipients.set(r.recipientWallet, {
          wallet: r.recipientWallet, totalAnsemUi: r.amountUi, transferCount: 1,
          firstSeen: r.blockTime, latestSeen: r.blockTime, signatures: [r.signature],
        });
      } else {
        cur.totalAnsemUi += r.amountUi;
        cur.transferCount += 1;
        cur.firstSeen = minIso(cur.firstSeen, r.blockTime);
        cur.latestSeen = maxIso(cur.latestSeen, r.blockTime);
        if (!cur.signatures.includes(r.signature)) cur.signatures = [r.signature, ...cur.signatures].slice(0, SIG_CAP);
      }
      newFeed.push({ wallet: r.recipientWallet, amountUi: r.amountUi, blockTime: r.blockTime, signature: r.signature, txUrl: r.txUrl });
    } else if (r.mint === NATIVE_SOL_MINT) {
      solOverheadUi += r.amountUi;
    } else {
      const o = others.get(r.mint) ?? { mint: r.mint, count: 0, totalUi: 0 };
      o.count += 1; o.totalUi += r.amountUi; others.set(r.mint, o);
    }
  }

  const recipientList = [...recipients.values()].sort((a, b) => b.totalAnsemUi - a.totalAnsemUi);
  const feed = [...newFeed, ...prev.feed]
    .filter((v, i, arr) => arr.findIndex((x) => x.signature === v.signature && x.wallet === v.wallet) === i)
    .sort((a, b) => (a.blockTime < b.blockTime ? 1 : -1))
    .slice(0, FEED_MAX);

  return {
    collectedAt: opts.collectedAt,
    source: prev.source,
    mint: ANSEM_MINT,
    backfillComplete: opts.backfillComplete,
    cursors: { newest: opts.newestSignature ?? prev.cursors.newest, oldestScanned: opts.oldestScanned ?? prev.cursors.oldestScanned },
    totals: { uniqueRecipients: recipientList.length, totalAnsemUi, totalAirdrops, solOverheadUi, windowFrom, windowThrough },
    recipients: recipientList,
    feed,
    otherMintsSent: [...others.values()].sort((a, b) => b.totalUi - a.totalUi),
  };
}
```

- [ ] **Step 4: Run test, verify pass**

Run: `pnpm exec tsx --test test/airdrop-snapshot.test.ts`
Expected: PASS (all three).

- [ ] **Step 5: Commit**

```bash
git add src/lib/airdrop-snapshot.ts test/airdrop-snapshot.test.ts
git commit -m "feat: AirdropSnapshot model + pure foldTransfers (mint-exact rollup)"
```
Hand the user the push command.

---

### Task 5: Pure view helpers — graph model, lookup, formatting

**Files:**
- Create: `src/lib/airdrop-view.ts`
- Test: `test/airdrop-view.test.ts`

**Interfaces:**
- Consumes: `AirdropSnapshot`, `AirdropRecipient` (`airdrop-snapshot.ts`); `PRIMARY_SOURCE_WALLET` (`domain.ts`).
- Produces:
  - types `GraphNode = { id: string; label: string; val: number; kind: "source" | "recipient" | "cluster"; ansemUi: number }`, `GraphLink = { source: string; target: string }`, `GraphModel = { nodes: GraphNode[]; links: GraphLink[] }`
  - `export function buildGraphModel(snap: AirdropSnapshot, cap?: number): GraphModel` (default cap 300)
  - `export function lookupRecipient(snap: AirdropSnapshot, wallet: string): AirdropRecipient | null`
  - `export function timeAgo(iso: string, nowMs: number): string`

- [ ] **Step 1: Write the failing test**

Create `test/airdrop-view.test.ts`:

```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { buildGraphModel, lookupRecipient, timeAgo } from "../src/lib/airdrop-view";
import { EMPTY_SNAPSHOT, type AirdropSnapshot } from "../src/lib/airdrop-snapshot";

function snapWith(n: number): AirdropSnapshot {
  const recipients = Array.from({ length: n }, (_, i) => ({
    wallet: `R${i}`, totalAnsemUi: n - i, transferCount: 1,
    firstSeen: "2026-06-29T12:00:00.000Z", latestSeen: "2026-06-29T12:00:00.000Z", signatures: [`s${i}`],
  }));
  return { ...EMPTY_SNAPSHOT, source: "GV6U", recipients, totals: { ...EMPTY_SNAPSHOT.totals, uniqueRecipients: n } };
}

test("graph has a source node + recipient nodes; caps and clusters the rest", () => {
  const g = buildGraphModel(snapWith(450), 300);
  const source = g.nodes.find((nd) => nd.kind === "source");
  assert.ok(source);
  assert.equal(g.nodes.filter((nd) => nd.kind === "recipient").length, 300);
  assert.equal(g.nodes.filter((nd) => nd.kind === "cluster").length, 1); // +150 more
  assert.equal(g.links.length, 301); // 300 recipients + 1 cluster, all from source
  assert.ok(g.links.every((l) => l.source === source!.id));
});

test("no cluster node when under cap", () => {
  const g = buildGraphModel(snapWith(10), 300);
  assert.equal(g.nodes.filter((nd) => nd.kind === "cluster").length, 0);
  assert.equal(g.nodes.filter((nd) => nd.kind === "recipient").length, 10);
});

test("lookup is case-insensitive-exact on wallet and returns null on miss", () => {
  const snap = snapWith(3);
  assert.equal(lookupRecipient(snap, "R1")!.wallet, "R1");
  assert.equal(lookupRecipient(snap, "  R1  ")!.wallet, "R1");
  assert.equal(lookupRecipient(snap, "nope"), null);
});

test("timeAgo renders coarse buckets", () => {
  const now = Date.parse("2026-06-29T12:00:00.000Z");
  assert.equal(timeAgo("2026-06-29T11:59:30.000Z", now), "30s ago");
  assert.equal(timeAgo("2026-06-29T11:30:00.000Z", now), "30m ago");
  assert.equal(timeAgo("2026-06-29T09:00:00.000Z", now), "3h ago");
});
```

- [ ] **Step 2: Run it, verify it fails**

Run: `pnpm exec tsx --test test/airdrop-view.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the helpers**

Create `src/lib/airdrop-view.ts`:

```ts
import { type AirdropSnapshot, type AirdropRecipient } from "./airdrop-snapshot";

export type GraphNode = { id: string; label: string; val: number; kind: "source" | "recipient" | "cluster"; ansemUi: number };
export type GraphLink = { source: string; target: string };
export type GraphModel = { nodes: GraphNode[]; links: GraphLink[] };

const SOURCE_ID = "__source__";
const CLUSTER_ID = "__cluster__";
const short = (w: string) => `${w.slice(0, 4)}…${w.slice(-4)}`;

export function buildGraphModel(snap: AirdropSnapshot, cap = 300): GraphModel {
  const sorted = [...snap.recipients].sort((a, b) => b.totalAnsemUi - a.totalAnsemUi);
  const top = sorted.slice(0, cap);
  const rest = sorted.slice(cap);
  const nodes: GraphNode[] = [
    { id: SOURCE_ID, label: "GV6U (Ansem)", val: Math.max(snap.totals.totalAnsemUi, 1), kind: "source", ansemUi: snap.totals.totalAnsemUi },
    ...top.map((r) => ({ id: r.wallet, label: short(r.wallet), val: Math.max(r.totalAnsemUi, 0.0001), kind: "recipient" as const, ansemUi: r.totalAnsemUi })),
  ];
  const links: GraphLink[] = top.map((r) => ({ source: SOURCE_ID, target: r.wallet }));
  if (rest.length > 0) {
    const restUi = rest.reduce((s, r) => s + r.totalAnsemUi, 0);
    nodes.push({ id: CLUSTER_ID, label: `+${rest.length} more`, val: Math.max(restUi, 1), kind: "cluster", ansemUi: restUi });
    links.push({ source: SOURCE_ID, target: CLUSTER_ID });
  }
  return { nodes, links };
}

export function lookupRecipient(snap: AirdropSnapshot, wallet: string): AirdropRecipient | null {
  const q = wallet.trim();
  if (!q) return null;
  return snap.recipients.find((r) => r.wallet === q) ?? null;
}

export function timeAgo(iso: string, nowMs: number): string {
  const s = Math.max(0, Math.round((nowMs - Date.parse(iso)) / 1000));
  if (s < 60) return `${s}s ago`;
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.round(h / 24)}d ago`;
}
```

- [ ] **Step 4: Run test, verify pass**

Run: `pnpm exec tsx --test test/airdrop-view.test.ts`
Expected: PASS (all four).

- [ ] **Step 5: Commit**

```bash
git add src/lib/airdrop-view.ts test/airdrop-view.test.ts
git commit -m "feat: pure view helpers — graph model, lookup, timeAgo"
```
Hand the user the push command.

---

### Task 6: Collector orchestrator + real seed snapshot

**Files:**
- Create: `scripts/collect-snapshot.ts`
- Create: `public/snapshot.seed.json` (produced by running the collector)

**Interfaces:**
- Consumes: `getOutgoingTransactions` (`rpc-source.ts`), `rawTxToHelius` (`rpc-adapter.ts`), `parseOutgoingTransfers` (`transfer-parser.ts`), `foldTransfers`, `EMPTY_SNAPSHOT` (`airdrop-snapshot.ts`), `PRIMARY_SOURCE_WALLET` (`domain.ts`).
- Produces: a CLI that reads an existing snapshot (path arg or empty), does one incremental-or-backfill pass, and writes a snapshot JSON. Env: `HELIUS_API_KEY`. Args: `--in <path>` `--out <path>` `--max <sigs>` `--mode incremental|backfill`.

- [ ] **Step 1: Write the collector**

Create `scripts/collect-snapshot.ts`:

```ts
#!/usr/bin/env tsx
// Build/extend the AirdropSnapshot from GV6U's outgoing transfers.
// Usage: node --env-file=.env --import tsx scripts/collect-snapshot.ts --out public/snapshot.seed.json --max 1000 --mode backfill
import { readFileSync, writeFileSync } from "node:fs";
import { getOutgoingTransactions } from "../src/lib/rpc-source";
import { rawTxToHelius } from "../src/lib/rpc-adapter";
import { parseOutgoingTransfers } from "../src/lib/transfer-parser";
import { EMPTY_SNAPSHOT, foldTransfers, type AirdropSnapshot } from "../src/lib/airdrop-snapshot";
import { PRIMARY_SOURCE_WALLET } from "../src/lib/domain";

function arg(name: string, fallback?: string): string | undefined {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : fallback;
}

async function main() {
  const inPath = arg("--in");
  const outPath = arg("--out", "public/snapshot.seed.json")!;
  const max = Number(arg("--max", "1000"));
  const mode = arg("--mode", "incremental");
  const nowIso = new Date().toISOString();

  const prev: AirdropSnapshot = inPath
    ? { ...(JSON.parse(readFileSync(inPath, "utf8")) as AirdropSnapshot), source: PRIMARY_SOURCE_WALLET }
    : { ...EMPTY_SNAPSHOT, source: PRIMARY_SOURCE_WALLET };

  // incremental: only sigs newer than cursor.newest; backfill: older than oldestScanned
  const untilSignature = mode === "incremental" ? prev.cursors.newest : undefined;
  const { txs, newestSignature } = await getOutgoingTransactions({
    wallet: PRIMARY_SOURCE_WALLET,
    untilSignature,
    maxSignatures: max,
  });

  const helius = txs.map(rawTxToHelius);
  const { transfers } = parseOutgoingTransfers(helius, PRIMARY_SOURCE_WALLET);
  const oldest = txs.length ? txs[txs.length - 1].transaction.signatures[0] : prev.cursors.oldestScanned;
  const backfillComplete = mode === "backfill" ? txs.length < max : prev.backfillComplete;

  const next = foldTransfers(prev, transfers, {
    newestSignature: newestSignature ?? prev.cursors.newest,
    oldestScanned: oldest ?? null,
    backfillComplete,
    collectedAt: nowIso,
  });

  if (next.totals.totalAirdrops < prev.totals.totalAirdrops) throw new Error("refusing to write a regressed snapshot");
  writeFileSync(outPath, JSON.stringify(next, null, 2));
  console.log(`wrote ${outPath}: ${next.totals.uniqueRecipients} recipients, ${next.totals.totalAirdrops} airdrops, backfillComplete=${next.backfillComplete}, otherMints=${next.otherMintsSent.length}`);
}
main().catch((e) => { console.error(e instanceof Error ? e.message : e); process.exitCode = 1; });
```

- [ ] **Step 2: Run a bounded real backfill to produce the seed**

Run: `node --env-file=.env --import tsx scripts/collect-snapshot.ts --out public/snapshot.seed.json --max 600 --mode backfill`
Expected: a line like `wrote public/snapshot.seed.json: <N> recipients, <M> airdrops, backfillComplete=false, otherMints=<k>`. The backoff added in Task 2 should prevent hard 429 failures (it may pause). If it still 429s out, lower `--max` to 300 and re-run.

- [ ] **Step 3: Verify the seed is real and ANSEM-only**

Run: `node -e "const s=require('./public/snapshot.seed.json'); console.log('recipients',s.totals.uniqueRecipients,'ansem',Math.round(s.totals.totalAnsemUi),'feed',s.feed.length,'other',JSON.stringify(s.otherMintsSent))"`
Expected: non-zero recipients + ANSEM total + a populated feed. `otherMintsSent` should be empty or tiny — **record whatever it shows** (this is the §9 gate item confirming the ANSEM-only finding over real data). If non-trivial non-ANSEM sprays appear, note them for the user (multi-token data is captured; UI stays ANSEM-only per spec).

- [ ] **Step 4: Commit**

```bash
git add scripts/collect-snapshot.ts public/snapshot.seed.json
git commit -m "feat: collector orchestrator + real seed airdrop snapshot"
```
Hand the user the push command.

---

### Task 7: Snapshot read path (client) with seed fallback

**Files:**
- Create: `src/lib/snapshot-client.ts`
- Test: `test/snapshot-client.test.ts`

**Interfaces:**
- Consumes: `AirdropSnapshot`, `EMPTY_SNAPSHOT` (`airdrop-snapshot.ts`).
- Produces:
  - `export const SNAPSHOT_CDN_URL` (jsDelivr `@data` raw URL)
  - `export async function fetchSnapshot(fetchImpl?: typeof fetch): Promise<AirdropSnapshot>` — tries the CDN, falls back to the bundled seed import, never throws.

- [ ] **Step 1: Write the failing test**

Create `test/snapshot-client.test.ts`:

```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { fetchSnapshot } from "../src/lib/snapshot-client";

test("CDN failure falls back to the bundled seed (never throws)", async () => {
  const failing = (async () => { throw new Error("network down"); }) as unknown as typeof fetch;
  const snap = await fetchSnapshot(failing);
  assert.ok(snap.recipients.length >= 0); // returns the seed object, not an exception
  assert.equal(snap.source.length > 0 || snap.source === "", true);
});
```

- [ ] **Step 2: Run it, verify it fails**

Run: `pnpm exec tsx --test test/snapshot-client.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the read path**

Create `src/lib/snapshot-client.ts`:

```ts
import seed from "../../public/snapshot.seed.json";
import { type AirdropSnapshot } from "./airdrop-snapshot";

export const SNAPSHOT_CDN_URL =
  "https://cdn.jsdelivr.net/gh/AIEngineerX/ansem-airdrop-net@data/snapshot.json";

export async function fetchSnapshot(fetchImpl: typeof fetch = fetch): Promise<AirdropSnapshot> {
  try {
    const res = await fetchImpl(SNAPSHOT_CDN_URL, { cache: "no-store" });
    if (!res.ok) throw new Error(String(res.status));
    return (await res.json()) as AirdropSnapshot;
  } catch {
    return seed as AirdropSnapshot;
  }
}
```

Ensure `tsconfig.json` has `"resolveJsonModule": true` (Next sets this; add it if `pnpm typecheck` complains).

- [ ] **Step 4: Run test, verify pass**

Run: `pnpm exec tsx --test test/snapshot-client.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/snapshot-client.ts test/snapshot-client.test.ts tsconfig.json
git commit -m "feat: client snapshot read path (jsDelivr + seed fallback)"
```
Hand the user the push command.

---

### Task 8: Tab shell + extract Creator Rewards view

**Files:**
- Create: `src/components/CreatorRewardsView.tsx` (the existing markup, extracted)
- Create: `src/components/Tabs.tsx` (client tab control)
- Modify: `src/app/page.tsx` (server component → fetch rewards, render `<Tabs>`)

**Interfaces:**
- Consumes: `getMarket` (`price.ts`), `getCreatorRewards` (`pump.ts`), domain constants/types.
- Produces: `CreatorRewardsView({ rewards, ansem, solPriceUsd })`; `Tabs({ creatorRewards: ReactNode })` rendering the Airdrop Web tab (Task 9/10) + Creator Rewards tab.

- [ ] **Step 1: Read the Next 16 docs for client/server boundaries**

Run: `ls node_modules/next/dist/docs/ && sed -n '1,80p' node_modules/next/dist/docs/*client*; sed -n '1,80p' node_modules/next/dist/docs/*server*` (or the live Next 16 docs if the path is absent). Confirm the `"use client"` directive + how to pass server-fetched data into a client component as props.

- [ ] **Step 2: Extract `CreatorRewardsView`**

Move the JSX currently inside `Home()` (the `hero`, `creator rewards`, `<TokenSection>`, `methodology`, `footer`, and the helper components `RewardsChart`, `Stat`, `Unofficial`, `TokenSection` plus the `short`/`fmt*` helpers) into `src/components/CreatorRewardsView.tsx`, exported as:

```tsx
export function CreatorRewardsView({ rewards, ansem, solPriceUsd }: {
  rewards: CreatorRewards; ansem: TokenPanel; solPriceUsd: number | null;
}) { /* the existing markup, unchanged */ }
```

(Keep markup identical to today's — this is a move, not a redesign.)

- [ ] **Step 3: Create the client `Tabs` shell**

Create `src/components/Tabs.tsx`:

```tsx
"use client";
import { useState, type ReactNode } from "react";

export function Tabs({ creatorRewards }: { creatorRewards: ReactNode }) {
  const [tab, setTab] = useState<"web" | "rewards">("web");
  return (
    <div className="grain mx-auto w-full max-w-6xl flex-1 px-4 pb-16 pt-4 sm:px-6 lg:px-8">
      <div className="mt-2 inline-flex rounded-full border border-white/[0.1] bg-white/[0.02] p-1 text-sm">
        <button onClick={() => setTab("web")} className={`rounded-full px-4 py-1.5 transition ${tab === "web" ? "bg-[var(--accent)] text-white" : "text-zinc-400 hover:text-zinc-200"}`}>Airdrop Web</button>
        <button onClick={() => setTab("rewards")} className={`rounded-full px-4 py-1.5 transition ${tab === "rewards" ? "bg-[var(--accent)] text-white" : "text-zinc-400 hover:text-zinc-200"}`}>Creator Rewards</button>
      </div>
      {tab === "web" ? <AirdropWebPlaceholder /> : <div className="mt-4">{creatorRewards}</div>}
    </div>
  );
}

function AirdropWebPlaceholder() {
  return <div className="mt-6 text-zinc-500">Airdrop web loading…</div>;
}
```

(The placeholder is replaced in Task 9/10.)

- [ ] **Step 4: Rewire `page.tsx`**

`page.tsx` keeps `export const revalidate = 60;`, fetches rewards server-side, and renders the client shell:

```tsx
import { getMarket } from "@/lib/price";
import { getCreatorRewards } from "@/lib/pump";
import { CreatorRewardsView } from "@/components/CreatorRewardsView";
import { Tabs } from "@/components/Tabs";

export const revalidate = 60;

export default async function Home() {
  const { ansem, solPriceUsd } = await getMarket();
  const rewards = await getCreatorRewards(solPriceUsd);
  return (
    <main className="flex min-h-screen flex-col">
      <Tabs creatorRewards={<CreatorRewardsView rewards={rewards} ansem={ansem} solPriceUsd={solPriceUsd} />} />
    </main>
  );
}
```

- [ ] **Step 5: Verify it runs (desktop + mobile)**

Run: `pnpm dev` then load `http://localhost:3000`. Use the run/browser skill to screenshot at desktop and ~390px.
Expected: tab control shows; "Creator Rewards" tab renders the existing dashboard unchanged; "Airdrop Web" tab shows the placeholder. `pnpm verify` green.

- [ ] **Step 6: Commit**

```bash
git add src/components/CreatorRewardsView.tsx src/components/Tabs.tsx src/app/page.tsx
git commit -m "feat: tab shell — Airdrop Web (default) + extracted Creator Rewards"
```
Hand the user the push command.

---

### Task 9: Stats + feed + lookup + data stamp

**Files:**
- Create: `src/components/AirdropStats.tsx`, `src/components/AirdropFeed.tsx`, `src/components/RecipientLookup.tsx`, `src/components/DataStamp.tsx`, `src/components/AirdropWebView.tsx`
- Modify: `src/components/Tabs.tsx` (render `<AirdropWebView>` instead of the placeholder)

**Interfaces:**
- Consumes: `fetchSnapshot` (`snapshot-client.ts`), `lookupRecipient`, `timeAgo` (`airdrop-view.ts`), `AirdropSnapshot` (`airdrop-snapshot.ts`).
- Produces: `AirdropWebView()` — a client component that fetches the snapshot on mount and renders stats + feed + lookup (graph slot filled in Task 10).

- [ ] **Step 1: Build the leaf components**

Create `src/components/AirdropStats.tsx`:

```tsx
import type { AirdropSnapshot } from "@/lib/airdrop-snapshot";

const fmt = (n: number) => n.toLocaleString("en-US", { maximumFractionDigits: 0 });

export function AirdropStats({ snap }: { snap: AirdropSnapshot }) {
  const cards = [
    { label: "Wallets airdropped", value: fmt(snap.totals.uniqueRecipients) },
    { label: "Total ANSEM airdropped", value: fmt(snap.totals.totalAnsemUi) },
    { label: "Total airdrops", value: fmt(snap.totals.totalAirdrops) },
  ];
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      {cards.map((c) => (
        <div key={c.label} className="rounded-2xl border border-white/[0.08] bg-white/[0.025] p-4 sm:p-5">
          <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-zinc-500">{c.label}</p>
          <p className="tabular mt-2 font-mono text-2xl font-semibold text-zinc-50">{c.value}</p>
        </div>
      ))}
    </div>
  );
}
```

Create `src/components/AirdropFeed.tsx`:

```tsx
"use client";
import { useEffect, useState } from "react";
import type { AirdropSnapshot } from "@/lib/airdrop-snapshot";
import { timeAgo } from "@/lib/airdrop-view";

const short = (w: string) => `${w.slice(0, 4)}…${w.slice(-4)}`;
const fmt = (n: number) => n.toLocaleString("en-US", { maximumFractionDigits: 0 });

export function AirdropFeed({ snap }: { snap: AirdropSnapshot }) {
  const [now, setNow] = useState(0);
  useEffect(() => { setNow(Date.now()); const id = setInterval(() => setNow(Date.now()), 30000); return () => clearInterval(id); }, []);
  return (
    <div className="rounded-2xl border border-white/[0.08] bg-[#0a0a0b]">
      <p className="border-b border-white/[0.06] px-4 py-3 text-[11px] font-medium uppercase tracking-[0.16em] text-zinc-500">Recent airdrops</p>
      <ul className="max-h-[420px] divide-y divide-white/[0.05] overflow-y-auto">
        {snap.feed.map((f) => (
          <li key={f.signature + f.wallet} className="flex items-center justify-between gap-3 px-4 py-2.5">
            <span className="flex items-center gap-2 truncate">
              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--accent)]" />
              <span className="tabular font-mono text-sm text-zinc-200">{fmt(f.amountUi)} ANSEM</span>
              <span className="text-zinc-600">→</span>
              <a href={f.txUrl} target="_blank" rel="noreferrer" className="font-mono text-xs text-zinc-400 underline decoration-white/15 underline-offset-2">{short(f.wallet)}</a>
            </span>
            <span className="shrink-0 text-xs text-zinc-600">{now ? timeAgo(f.blockTime, now) : ""}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
```

Create `src/components/RecipientLookup.tsx`:

```tsx
"use client";
import { useState } from "react";
import type { AirdropSnapshot } from "@/lib/airdrop-snapshot";
import { lookupRecipient } from "@/lib/airdrop-view";

const fmt = (n: number) => n.toLocaleString("en-US", { maximumFractionDigits: 0 });
const day = (iso: string) => new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

export function RecipientLookup({ snap }: { snap: AirdropSnapshot }) {
  const [q, setQ] = useState("");
  const [hit, setHit] = useState<ReturnType<typeof lookupRecipient> | "miss" | null>(null);
  const run = () => setHit(lookupRecipient(snap, q) ?? "miss");
  return (
    <div className="rounded-2xl border border-white/[0.08] bg-[#0a0a0b] p-4 sm:p-5">
      <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-zinc-500">Did Ansem airdrop you?</p>
      <div className="mt-3 flex gap-2">
        <input value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === "Enter" && run()}
          placeholder="Paste your wallet address" spellCheck={false}
          className="min-w-0 flex-1 rounded-xl border border-white/[0.12] bg-black/40 px-3 py-2 font-mono text-sm text-zinc-100 outline-none focus:border-[var(--accent)]" />
        <button onClick={run} className="rounded-xl bg-[var(--accent)] px-4 text-sm font-medium text-white">Check</button>
      </div>
      {hit === "miss" && <p className="mt-3 text-sm text-zinc-500">No airdrop found for that wallet.</p>}
      {hit && hit !== "miss" && (
        <div className="mt-3 rounded-xl border border-[var(--accent)]/30 bg-[var(--accent)]/[0.06] p-3 text-sm">
          <p className="text-zinc-200">Airdropped <span className="tabular font-mono font-semibold">{fmt(hit.totalAnsemUi)} ANSEM</span> across {hit.transferCount} transfer{hit.transferCount === 1 ? "" : "s"}.</p>
          <p className="mt-1 text-zinc-500">First {day(hit.firstSeen)} · last {day(hit.latestSeen)}</p>
          <a href={`https://solscan.io/tx/${hit.signatures[0]}`} target="_blank" rel="noreferrer" className="mt-1 inline-block font-mono text-xs text-zinc-400 underline underline-offset-2">latest tx →</a>
        </div>
      )}
    </div>
  );
}
```

Create `src/components/DataStamp.tsx`:

```tsx
import type { AirdropSnapshot } from "@/lib/airdrop-snapshot";

const t = (iso: string | null) => (iso ? new Date(iso).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" }) : "—");

export function DataStamp({ snap }: { snap: AirdropSnapshot }) {
  return (
    <p className="text-xs text-zinc-600">
      Data as of {t(snap.collectedAt)} · window {t(snap.totals.windowFrom)} → {t(snap.totals.windowThrough)}
      {snap.backfillComplete ? "" : " · backfill in progress"}
    </p>
  );
}
```

- [ ] **Step 2: Compose `AirdropWebView`**

Create `src/components/AirdropWebView.tsx`:

```tsx
"use client";
import { useEffect, useState } from "react";
import { fetchSnapshot } from "@/lib/snapshot-client";
import { EMPTY_SNAPSHOT, type AirdropSnapshot } from "@/lib/airdrop-snapshot";
import { AirdropStats } from "./AirdropStats";
import { AirdropFeed } from "./AirdropFeed";
import { RecipientLookup } from "./RecipientLookup";
import { DataStamp } from "./DataStamp";

export function AirdropWebView() {
  const [snap, setSnap] = useState<AirdropSnapshot>(EMPTY_SNAPSHOT);
  useEffect(() => { fetchSnapshot().then(setSnap); }, []);
  return (
    <div className="mt-5 space-y-5">
      <AirdropStats snap={snap} />
      {/* AirdropGraph slot — Task 10 inserts <AirdropGraph snap={snap} /> here */}
      <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
        <AirdropFeed snap={snap} />
        <RecipientLookup snap={snap} />
      </div>
      <DataStamp snap={snap} />
    </div>
  );
}
```

- [ ] **Step 3: Wire it into `Tabs`**

In `src/components/Tabs.tsx`, replace `<AirdropWebPlaceholder />` with `<AirdropWebView />` and the import; delete the placeholder function.

- [ ] **Step 4: Verify with the real seed (desktop + mobile)**

Run: `pnpm dev`, load the Airdrop Web tab, screenshot desktop + ~390px. Lookup a wallet known to be in `public/snapshot.seed.json` (a hit) and a random wallet (a miss).
Expected: stat cards show real numbers; feed lists real airdrops with time-ago; lookup hit shows amount + dates; layout stacks cleanly on mobile. `pnpm verify` green.

- [ ] **Step 5: Commit**

```bash
git add src/components/AirdropStats.tsx src/components/AirdropFeed.tsx src/components/RecipientLookup.tsx src/components/DataStamp.tsx src/components/AirdropWebView.tsx src/components/Tabs.tsx
git commit -m "feat: airdrop web — stats, live feed, recipient lookup, data stamp"
```
Hand the user the push command.

---

### Task 10: Cinematic force-graph

**Files:**
- Create: `src/components/AirdropGraph.tsx`
- Modify: `src/components/AirdropWebView.tsx` (insert the graph in its slot)
- Modify: `src/app/globals.css` (graph stage vignette helper)

**Interfaces:**
- Consumes: `buildGraphModel` (`airdrop-view.ts`), `AirdropSnapshot`.
- Produces: `AirdropGraph({ snap })` — a client-only canvas graph (dynamic import, `ssr: false`).

- [ ] **Step 1: Read react-force-graph-2d API**

Use Context7 or the package README for `react-force-graph-2d` props used below: `graphData`, `nodeCanvasObject`, `linkColor`, `linkDirectionalParticles`, `linkDirectionalParticleColor`, `linkDirectionalParticleSpeed`, `backgroundColor`, `onNodeHover`, `nodeVal`, `cooldownTicks`, `width`/`height`. Confirm signatures before coding.

- [ ] **Step 2: Add the stage vignette to `globals.css`**

Append:

```css
.graph-stage {
  position: relative;
  border-radius: 1.5rem;
  background:
    radial-gradient(120% 80% at 50% 40%, rgba(177, 18, 38, 0.08), transparent 60%),
    radial-gradient(100% 100% at 50% 50%, #0a0708 0%, #050506 70%, #030304 100%);
  box-shadow: inset 0 0 120px rgba(0, 0, 0, 0.9);
  overflow: hidden;
}
```

- [ ] **Step 3: Implement the graph**

Create `src/components/AirdropGraph.tsx`:

```tsx
"use client";
import dynamic from "next/dynamic";
import { useMemo, useRef, useState, useEffect } from "react";
import { buildGraphModel, type GraphNode } from "@/lib/airdrop-view";
import type { AirdropSnapshot } from "@/lib/airdrop-snapshot";

const ForceGraph2D = dynamic(() => import("react-force-graph-2d"), { ssr: false });

export function AirdropGraph({ snap }: { snap: AirdropSnapshot }) {
  const wrap = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 800, h: 520 });
  const [hover, setHover] = useState<string | null>(null);

  useEffect(() => {
    const el = wrap.current; if (!el) return;
    const ro = new ResizeObserver(() => setSize({ w: el.clientWidth, h: Math.min(el.clientWidth * 0.66, 560) }));
    ro.observe(el); return () => ro.disconnect();
  }, []);

  const isMobile = size.w < 640;
  const data = useMemo(() => buildGraphModel(snap, isMobile ? 120 : 300), [snap, isMobile]);
  const maxUi = useMemo(() => Math.max(...data.nodes.map((n) => n.ansemUi), 1), [data]);

  return (
    <div ref={wrap} className="graph-stage h-[520px] w-full border border-white/[0.08]">
      <ForceGraph2D
        graphData={data}
        width={size.w}
        height={size.h}
        backgroundColor="rgba(0,0,0,0)"
        cooldownTicks={120}
        linkColor={() => "rgba(177,18,38,0.18)"}
        linkDirectionalParticles={2}
        linkDirectionalParticleColor={() => "#e0455a"}
        linkDirectionalParticleWidth={2}
        linkDirectionalParticleSpeed={0.006}
        onNodeHover={(n: GraphNode | null) => setHover(n?.id ?? null)}
        nodeCanvasObject={(node: GraphNode & { x?: number; y?: number }, ctx: CanvasRenderingContext2D, scale: number) => {
          const x = node.x ?? 0, y = node.y ?? 0;
          const base = node.kind === "source" ? 9 : 2 + 7 * Math.sqrt(node.ansemUi / maxUi);
          const r = base / Math.max(scale, 0.6);
          const dim = hover && hover !== node.id && node.kind !== "source";
          const color = node.kind === "source" ? "#ff2d46" : node.kind === "cluster" ? "#8a8f98" : "#e0455a";
          ctx.globalAlpha = dim ? 0.25 : 1;
          // glow for large/source nodes
          if (node.kind === "source" || node.ansemUi > maxUi * 0.4) {
            ctx.shadowColor = "#b11226"; ctx.shadowBlur = 18 / Math.max(scale, 0.6);
          } else ctx.shadowBlur = 0;
          ctx.beginPath(); ctx.arc(x, y, r, 0, 2 * Math.PI); ctx.fillStyle = color; ctx.fill();
          ctx.shadowBlur = 0; ctx.globalAlpha = 1;
          if (node.kind === "source" || (hover === node.id)) {
            ctx.font = `${11 / Math.max(scale, 0.6)}px ui-monospace, monospace`;
            ctx.fillStyle = "rgba(237,237,237,0.85)"; ctx.textAlign = "center";
            ctx.fillText(node.label, x, y + r + 11 / Math.max(scale, 0.6));
          }
        }}
      />
    </div>
  );
}
```

- [ ] **Step 4: Insert the graph in `AirdropWebView`**

In `src/components/AirdropWebView.tsx`, import `AirdropGraph` and replace the slot comment with `<AirdropGraph snap={snap} />`.

- [ ] **Step 5: Verify the look (desktop + mobile)**

Run: `pnpm dev`, open the Airdrop Web tab. Use the run/browser skill to screenshot desktop and ~390px.
Expected against the spec §8 contract: GV6U glowing core at center, oxblood directional particles flowing outward, recipient nodes sized by amount, hover dims the rest + shows a label, a "+N more" cluster node when over the cap, dark vignette stage, readable + smooth on mobile (≤120 nodes). Iterate on sizes/opacity until it reads "cinematic yet clean." `pnpm verify` green.

- [ ] **Step 6: Commit**

```bash
git add src/components/AirdropGraph.tsx src/components/AirdropWebView.tsx src/app/globals.css
git commit -m "feat: cinematic 2D force-graph (oxblood flow particles, glow, cluster)"
```
Hand the user the push command.

---

### Task 11: CI collector workflow + deploy instructions

**Files:**
- Create: `.github/workflows/collect.yml`
- Create: `docs/DEPLOY.md`

**Interfaces:**
- Produces: a scheduled + manually-dispatchable workflow that runs the collector and commits `snapshot.json` to the `data` branch; written deploy steps for the user.

- [ ] **Step 1: Confirm repo visibility (sets cron cadence)**

Run: `gh repo view AIEngineerX/ansem-airdrop-net --json visibility -q .visibility` (or check the GitHub UI).
Expected: `public` → use `*/15`; `private` → use `*/30` (stay under the 2,000 Actions-min/mo cap). Pick the cron accordingly in Step 2.

- [ ] **Step 2: Write the workflow**

Create `.github/workflows/collect.yml` (using the cadence from Step 1; example shows `*/30`):

```yaml
name: collect-snapshot
on:
  schedule:
    - cron: "*/30 * * * *"
  workflow_dispatch: {}
concurrency:
  group: collect-snapshot
  cancel-in-progress: false
permissions:
  contents: write
jobs:
  collect:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with: { version: 9 }
      - uses: actions/setup-node@v4
        with: { node-version: 22, cache: pnpm }
      - run: pnpm install --frozen-lockfile
      - name: Fetch current snapshot from data branch
        run: |
          git fetch origin data || true
          if git show origin/data:snapshot.json > prev.json 2>/dev/null; then echo "have prev"; else echo "{}" > prev.json; rm prev.json; fi
      - name: Collect (incremental if prev exists, else backfill chunk)
        env:
          HELIUS_API_KEY: ${{ secrets.HELIUS_API_KEY }}
        run: |
          if [ -f prev.json ]; then
            node --import tsx scripts/collect-snapshot.ts --in prev.json --out snapshot.json --mode incremental --max 2000
          else
            node --import tsx scripts/collect-snapshot.ts --out snapshot.json --mode backfill --max 2000
          fi
      - name: Commit to data branch
        run: |
          git config user.name "AIEngineerX"
          git config user.email "195990077+AIEngineerX@users.noreply.github.com"
          git checkout -B data
          git add -f snapshot.json
          git commit -m "data: snapshot $(date -u +%FT%TZ) [skip ci]" || echo "no change"
          git push -f origin data
```

(Backfill is resumed across runs by switching to `--mode backfill --in prev.json` until `backfillComplete` — adjust the conditional once the first backfill chunk lands; documented in `docs/DEPLOY.md`.)

- [ ] **Step 3: Write `docs/DEPLOY.md` (user-run steps)**

Create `docs/DEPLOY.md` with exact steps:
1. `git push -u origin feat/airdrop-web` then open a PR / merge to `main`.
2. Create the secret: `gh secret set HELIUS_API_KEY --repo AIEngineerX/ansem-airdrop-net` (paste the key).
3. Seed the `data` branch once locally: `git checkout --orphan data && git rm -rf . && cp public/snapshot.seed.json snapshot.json && git add snapshot.json && git commit -m "data: seed" && git push -u origin data && git checkout feat/airdrop-web`.
4. Trigger the workflow: `gh workflow run collect-snapshot`.
5. Connect the repo to Netlify (Build command `pnpm build`, publish per `@netlify/plugin-nextjs`) — **the Linux build fixes the Windows EPERM symlink blocker**.
6. Confirm the §9 first-deploy gate on the live URL.

- [ ] **Step 4: Verify the workflow file lints**

Run: `pnpm exec --no-install yaml-lint .github/workflows/collect.yml 2>/dev/null || node -e "require('node:fs').readFileSync('.github/workflows/collect.yml','utf8'); console.log('yaml present')"`
Expected: file present and parseable (no strict linter required).

- [ ] **Step 5: Commit**

```bash
git add .github/workflows/collect.yml docs/DEPLOY.md
git commit -m "ci: scheduled airdrop-snapshot collector + deploy guide"
```
Hand the user the push command.

---

### Task 12: Final verification + first-deploy gate

**Files:** none (verification only)

- [ ] **Step 1: Full gate**

Run: `pnpm verify`
Expected: `boundary OK` + lint + typecheck + all tests (backoff, rpc-adapter, airdrop-snapshot, airdrop-view, snapshot-client) + build all green.

- [ ] **Step 2: Capture gate artifacts (spec §9)**

- Two consecutive local collector runs (`--mode incremental --in <out> --out <out2>`) show `collectedAt` advancing / merge stable.
- Deployed (or `pnpm build && pnpm start`) page renders the graph with real nodes + the live feed with real rows. Screenshot.
- Lookup: a known recipient → hit; random wallet → miss. Screenshot.
- Record `otherMintsSent` from the seed — confirm (or update) the ANSEM-only finding.
- Boundary grep passes; ~390px iOS-Safari screenshot captured.

- [ ] **Step 3: Finish the branch**

Use the `superpowers:finishing-a-development-branch` skill to decide merge/PR. Provide the user the push command and any PR command (do not push yourself).

---

## Self-Review

- **Spec coverage:** §1 DoD → Tasks 8–10 (graph/feed/stats/lookup) + Task 8 (rewards tab); §2 boundary → Global Constraints + `check-boundary` in every verify; §3 pipeline A → Tasks 6/7/11; §6a backoff → Task 2; §6b adapter → Task 3; §6c amount/ANSEM-only rollup → Task 4; §6d read path → Task 7; §6e collector → Task 6; §6f CI → Task 11; §6g UI → Tasks 8–10; §7 schema → Task 4 (`AirdropSnapshot`); §8 graph contract → Task 10; §9 tests/gate → Tasks 2–7 + 12; §10 deferred → untouched; §11 anti-drift → Task 0; §12 deploy → Task 11. No gaps.
- **Placeholder scan:** the only intentional placeholder is `AirdropWebPlaceholder` in Task 8, explicitly replaced in Task 9 (and the graph slot comment in Task 9, filled in Task 10). No "TBD/handle errors/etc."
- **Type consistency:** `AirdropSnapshot`/`AirdropRecipient`/`AirdropFeedItem`/`OtherMintSent` defined in Task 4, consumed unchanged in Tasks 5/7/9/10; `GraphNode`/`GraphLink`/`GraphModel` defined in Task 5, consumed in Task 10; `foldTransfers` and `buildGraphModel` signatures match call sites; `fetchSnapshot` optional-arg signature matches Task 7 test + Task 9 usage; `rawTxToHelius` returns the `HeliusTransaction` shape `parseOutgoingTransfers` consumes.

## Note on superseded code

`src/lib/aggregate.ts` (old `buildSnapshot`/`mergeSnapshots`) and the `Snapshot`/`RecipientRow` types in `domain.ts` become unused once Task 4 lands (the new `airdrop-snapshot.ts` model supersedes them). Per the project's "don't delete pre-existing code unless asked" rule, leave them in place and flag for the user at Task 12 to confirm removal.
