# ansem-airdrop-net v0 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire the inert ansem-airdrop-net scaffold to real on-chain data (outgoing transfers from the ANSEM treasury wallet) and deploy it on Netlify.

**Architecture:** A standard-Solana-RPC collector (`getSignaturesForAddress` + `getTransaction` jsonParsed) parses **transfer instructions** into the existing Helius-shape `HeliusTransaction`, feeds the already-tested `parseOutgoingTransfers`, aggregates into a snapshot, and stores it in Netlify Blobs. A one-time CLI backfill seeds ~30 days; a Netlify scheduled function does incremental updates. The Next.js app reads the snapshot + live DexScreener price and renders a dark, Black-Bull-branded, mobile-first ledger.

**Tech Stack:** Next.js 16.2.9 (App Router) · React 19 · TypeScript 5 · Tailwind v4 · pnpm · tsx test runner · `@solana/web3.js`-free raw JSON-RPC · DexScreener · Netlify Blobs + Scheduled Functions.

## Global Constraints

- **Node tests:** `pnpm test` runs `tsx --test test/*.test.ts`; `pnpm verify` = boundary-check + lint + typecheck + test + build. Verify must be green before every commit.
- **Boundary (CI-enforced):** no `@solana/wallet-adapter*`, `@jup-ag*`, `phantom`, `signTransaction`, `sendTransaction` anywhere in `src/`. No wallet connect / signing / swap / trade / claim / execution.
- **Constants (exact):** source wallet `GV6UUmNxz2RpKxmNAPadYKb7uQpszwqQAu3qLJxVdC52`; ANSEM mint `9cRCn9rGT8V2imeM2BaKs13yhMEais3ruM3rPvTGpump` (Token-2022 program `TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb`, 6 decimals); native SOL sentinel `So11111111111111111111111111111111111111112`.
- **Value scope:** USD-value main ANSEM (mint-exact) + native SOL only; other SPL listed, not valued.
- **Mint-exact:** main ANSEM counted only when `mint === ANSEM_MINT`, never by symbol.
- **History:** ~30-day backfill (one-time, out-of-band); scheduled function incremental-only (`until: lastSignature`).
- **RPC:** `https://mainnet.helius-rpc.com/?api-key=${HELIUS_API_KEY}`; `getTransaction` with `{ encoding: "jsonParsed", maxSupportedTransactionVersion: 0 }`; read `accountKeys[i].pubkey`; never `encoding:"json"`; never append `meta.loadedAddresses`.
- **Attribution copy / disclaimers / Methodology:** verbatim from spec §10; persistent "Unofficial · not affiliated with or endorsed by Ansem" in header + footer; wallet-descriptive headline; no "live" framing (use "Last updated" + covered window); no Buy/Trade CTA (explorer links only).
- **UI:** "Black Noise" dark, oxblood `#B11226` single accent (purge emerald), mono for addresses/amounts, Black Bull art as captioned *tracked token* (not site mark). **Mobile is first-class (iOS Safari):** responsive tables (scroll/stack, no overflow), tap targets ≥44px, viewport + safe-area, address middle-ellipsis. Render + screenshot at **desktop AND ~390px mobile** at every UI step.
- **Git identity:** AIEngineerX (`195990077+AIEngineerX@users.noreply.github.com`), already set local. Commit style `feat:`/`fix:`/`test:`/`chore:`/`docs:` with em dash. Honor `AGENTS.md`: read the bundled Next 16 docs before writing route/handler code.

---

## File Structure

| File | Responsibility |
|---|---|
| `CLAUDE.md` | Anti-drift scope lock (replaces 12-byte `@AGENTS.md` shim) |
| `scripts/check-boundary.mjs` | CI grep enforcing the no-execution boundary |
| `.env.example` / `.gitignore` | env contract / ignore `.data/`, `.netlify/` |
| `scripts/capture-fixtures.ts` | one-off: pull real txs from chain into `test/fixtures/` |
| `test/fixtures/*.json` | committed real `getTransaction` jsonParsed fixtures |
| `src/lib/rpc-types.ts` | typed subset of `getTransaction` jsonParsed response |
| `src/lib/rpc-adapter.ts` | **pure** `rawTxToHelius(tx, wallet)` → `HeliusTransaction` (instruction-parsed) |
| `src/lib/rpc-source.ts` | networked: signature pagination + batched `getTransaction` |
| `src/lib/snapshot.ts` | Blobs read/write + `.data/` dev fallback; `Snapshot` type |
| `src/lib/aggregate.ts` | **pure** build/merge snapshot from `TransferRow[]` (mint-exact totals, recipients, dedup) |
| `src/lib/collector-core.ts` | orchestrate source → adapter → parser → aggregate → snapshot |
| `src/lib/price.ts` | DexScreener ANSEM + SOL market data |
| `src/lib/dashboard-state.ts` | thin reader over `loadSnapshot()` (replaces in-memory empties) |
| `src/app/api/*/route.ts` | serve real snapshot + price |
| `src/app/page.tsx`, `layout.tsx`, `globals.css` | restyled, mobile-first UI |
| `netlify/functions/collect.ts`, `netlify.toml`, `next.config.ts` | deploy + scheduled incremental |

---

## Task 0: Setup gate

**Files:**
- Create: `scripts/check-boundary.mjs`, `.env.example`
- Modify: `package.json`, `.gitignore`, `CLAUDE.md`

**Interfaces:**
- Produces: a green `pnpm verify` baseline; `HELIUS_API_KEY` env contract; an enforced boundary.

- [ ] **Step 1: Install + confirm the AGENTS doc gate**

Run: `pnpm install`
Then: `ls node_modules/next/dist/docs` (Git Bash) / `Get-ChildItem node_modules/next/dist/docs` (PS).
Expected: a docs directory exists. **If it does not exist**, change the `AGENTS.md` gate to mean "consult the Next.js 16 online docs (nextjs.org/docs) before writing route/handler code" and note it in `CLAUDE.md` (Step 5).

- [ ] **Step 2: Add dependencies**

Run: `pnpm add @netlify/blobs` and `pnpm add -D @netlify/functions`
(`@netlify/plugin-nextjs` is configured in `netlify.toml` in Task 9 and installed by Netlify build; no local dep needed.)
Expected: both resolve and `package.json` updates.

- [ ] **Step 3: Add `.env.example` and gitignore entries**

`.env.example`:
```
# Solana RPC via Helius (standard JSON-RPC; any plan works). Required for the collector.
HELIUS_API_KEY=
# Optional explicit override; defaults to https://mainnet.helius-rpc.com/?api-key=$HELIUS_API_KEY
HELIUS_RPC_URL=
```
Append to `.gitignore`:
```
.data/
.netlify/
```

- [ ] **Step 4: Boundary check script + wire into verify**

`scripts/check-boundary.mjs`:
```js
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const FORBIDDEN = [
  "@solana/wallet-adapter", "@jup-ag", "phantom",
  "signTransaction", "sendTransaction",
];
const root = "src";
const offenders = [];

function walk(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p);
    else if (/\.(ts|tsx|js|jsx)$/.test(name)) {
      const text = readFileSync(p, "utf8");
      for (const term of FORBIDDEN) {
        if (text.includes(term)) offenders.push(`${p}: ${term}`);
      }
    }
  }
}
walk(root);

if (offenders.length) {
  console.error("Boundary violation (no wallet/execution surfaces allowed in src/):");
  for (const o of offenders) console.error("  " + o);
  process.exit(1);
}
console.log("boundary OK");
```
Update `package.json` `verify` script to:
```
"verify": "node scripts/check-boundary.mjs && pnpm lint && pnpm typecheck && pnpm test && pnpm build"
```

- [ ] **Step 5: Replace `CLAUDE.md` with the anti-drift spec**

Overwrite `CLAUDE.md`:
```markdown
@AGENTS.md

# ansem-airdrop-net — locked scope (do not drift)

Read-only Solana ledger of OUTGOING transfers from one wallet:
GV6UUmNxz2RpKxmNAPadYKb7uQpszwqQAu3qLJxVdC52. Full design:
docs/superpowers/specs/2026-06-28-ansem-airdrop-v0-design.md.

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
```

- [ ] **Step 6: Verify baseline + commit**

Run: `pnpm verify`
Expected: boundary OK, lint OK, typecheck OK, 3 parser tests pass, build OK.
```bash
git add -A
git commit -m "chore: setup gate — deps, boundary check, env, anti-drift CLAUDE.md"
```

---

## Task 1: Capture real fixture matrix

**Files:**
- Create: `scripts/capture-fixtures.ts`, `test/fixtures/README.md`, `test/fixtures/*.json`

**Interfaces:**
- Produces: committed real `getTransaction` jsonParsed JSON files used by Task 2 tests. Each file is the raw `result` object of one `getTransaction` call.

- [ ] **Step 1: Write the capture script**

`scripts/capture-fixtures.ts`:
```ts
#!/usr/bin/env tsx
import { writeFile, mkdir } from "node:fs/promises";
import { PRIMARY_SOURCE_WALLET } from "../src/lib/domain";

const RPC = process.env.HELIUS_RPC_URL
  ?? `https://mainnet.helius-rpc.com/?api-key=${process.env.HELIUS_API_KEY}`;

async function rpc(method: string, params: unknown[]) {
  const res = await fetch(RPC, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
  });
  const json = await res.json();
  if (json.error) throw new Error(`${method}: ${JSON.stringify(json.error)}`);
  return json.result;
}

async function main() {
  if (!process.env.HELIUS_API_KEY && !process.env.HELIUS_RPC_URL) {
    throw new Error("Set HELIUS_API_KEY (or HELIUS_RPC_URL)");
  }
  await mkdir("test/fixtures", { recursive: true });
  const sigs: Array<{ signature: string }> = await rpc("getSignaturesForAddress", [
    PRIMARY_SOURCE_WALLET, { limit: 100 },
  ]);
  let saved = 0;
  for (const { signature } of sigs) {
    const tx = await rpc("getTransaction", [
      signature, { encoding: "jsonParsed", maxSupportedTransactionVersion: 0 },
    ]);
    if (!tx) continue;
    await writeFile(`test/fixtures/raw-${signature.slice(0, 12)}.json`, JSON.stringify(tx, null, 2));
    saved++;
    if (saved >= 100) break;
  }
  console.log(`Saved ${saved} raw transactions to test/fixtures/`);
}
main().catch((e) => { console.error(e); process.exitCode = 1; });
```

- [ ] **Step 2: Run capture (needs `HELIUS_API_KEY`)**

Run: `HELIUS_API_KEY=... pnpm tsx scripts/capture-fixtures.ts`
Expected: `Saved N raw transactions`.
> Execution note: I will need the Helius key (or use the Helius MCP `heliusChain` raw-RPC to capture) at this step — confirm with the user how to supply it.

- [ ] **Step 3: Select and rename representative fixtures**

Inspect the captured `raw-*.json` and copy/rename ones that exercise each case to stable names (commit only these named files; delete the rest):
- `outgoing-ansem-multi.json` — an ANSEM (Token-2022) transfer to ≥2 recipients (multisend; look for `spl-token-2022` `transferChecked` in top-level OR `innerInstructions` with `info.authority === wallet`).
- `outgoing-sol.json` — a native `system` `transfer` with `info.source === wallet`.
- `alt-v0.json` — a versioned tx where `message.accountKeys` includes entries with `source: "lookupTable"` and `preBalances.length === accountKeys.length`.
- `ata-rent.json` — a tx that creates a recipient ATA (has a `createAccount`/`createIdempotent`/`initializeAccount` instruction alongside a transfer).
- `self-transfer.json` — a transfer whose destination owner is the wallet itself (if none found, synthesize by editing a copy and note it in README).
- `failed.json` — a tx with `meta.err != null` (if none in sample, synthesize a minimal one).
Write `test/fixtures/README.md` listing each file and which case it covers.

- [ ] **Step 4: Commit fixtures**
```bash
git add test/fixtures scripts/capture-fixtures.ts
git commit -m "test: capture real getTransaction fixtures (adapter matrix)"
```

---

## Task 2: RPC adapter (instruction-parsing) — TDD

**Files:**
- Create: `src/lib/rpc-types.ts`, `src/lib/rpc-adapter.ts`, `test/rpc-adapter.test.ts`

**Interfaces:**
- Consumes: `HeliusTransaction`, `HeliusNativeTransfer`, `HeliusTokenTransfer` from `./transfer-parser`; fixtures from Task 1.
- Produces: `rawTxToHelius(tx: RpcGetTransaction, wallet: string): HeliusTransaction` (pure). Used by `collector-core` (Task 5).

- [ ] **Step 1: Define `src/lib/rpc-types.ts`**
```ts
export type RpcAccountKey = { pubkey: string; signer: boolean; writable: boolean; source?: "transaction" | "lookupTable" };
export type RpcTokenBalance = {
  accountIndex: number;
  mint: string;
  owner?: string;
  programId?: string;
  uiTokenAmount: { amount: string; decimals: number; uiAmount: number | null; uiAmountString: string };
};
export type RpcInstruction = {
  program?: string;          // e.g. "system", "spl-token", "spl-token-2022"
  programId?: string;
  parsed?: { type?: string; info?: Record<string, any> };
};
export type RpcGetTransaction = {
  slot?: number;
  blockTime?: number | null;
  meta: {
    err: unknown | null;
    fee: number;
    preBalances: number[];
    postBalances: number[];
    preTokenBalances?: RpcTokenBalance[];
    postTokenBalances?: RpcTokenBalance[];
    innerInstructions?: { index: number; instructions: RpcInstruction[] }[];
  } | null;
  transaction: {
    signatures: string[];
    message: { accountKeys: RpcAccountKey[]; instructions: RpcInstruction[] };
  };
};
```

- [ ] **Step 2: Write failing adapter tests**

`test/rpc-adapter.test.ts`:
```ts
import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { ANSEM_MINT, NATIVE_SOL_MINT, PRIMARY_SOURCE_WALLET } from "../src/lib/domain";
import { rawTxToHelius } from "../src/lib/rpc-adapter";
import { parseOutgoingTransfers } from "../src/lib/transfer-parser";
import type { RpcGetTransaction } from "../src/lib/rpc-types";

const load = (f: string) => JSON.parse(readFileSync(`test/fixtures/${f}`, "utf8")) as RpcGetTransaction;
const through = (f: string) =>
  parseOutgoingTransfers([rawTxToHelius(load(f), PRIMARY_SOURCE_WALLET)], PRIMARY_SOURCE_WALLET);

test("ANSEM multi-recipient: token_2022, mint-exact, N distinct rows", () => {
  const { transfers } = through("outgoing-ansem-multi.json");
  const ansem = transfers.filter((t) => t.mint === ANSEM_MINT);
  assert.ok(ansem.length >= 2, "expected >=2 ANSEM rows");
  assert.equal(ansem[0].transferType, "token_2022");
  assert.ok(ansem[0].amountUi > 0, "amountUi must be non-zero");
  assert.notEqual(ansem[0].id, ansem[1].id);
  for (const r of ansem) assert.equal(r.sourceWallet, PRIMARY_SOURCE_WALLET);
});

test("native SOL: counted as SOL mint, no fee/rent contamination", () => {
  const { transfers } = through("outgoing-sol.json");
  const sol = transfers.filter((t) => t.mint === NATIVE_SOL_MINT);
  assert.ok(sol.length >= 1);
  assert.ok(sol.every((r) => r.amountUi > 0));
});

test("ALT/v0 tx: recipients resolve to owners, not lookup-table noise", () => {
  const { transfers } = through("alt-v0.json");
  for (const r of transfers) {
    assert.ok(r.recipientWallet && r.recipientWallet.length >= 32);
    assert.notEqual(r.recipientWallet, PRIMARY_SOURCE_WALLET);
  }
});

test("ATA-creation rent is NOT emitted as an outgoing SOL transfer", () => {
  const { transfers } = through("ata-rent.json");
  // rent lands on a token account; assert no SOL row whose recipient is a known token account
  const solRows = transfers.filter((t) => t.mint === NATIVE_SOL_MINT);
  for (const r of solRows) assert.ok(r.amountUi >= 0.001, "suspiciously tiny SOL row (likely rent)");
});

test("self-transfer (dest owner === wallet) is excluded", () => {
  const { transfers } = through("self-transfer.json");
  assert.equal(transfers.some((t) => t.recipientWallet === PRIMARY_SOURCE_WALLET), false);
});

test("failed tx yields no transfers", () => {
  const { transfers } = through("failed.json");
  assert.equal(transfers.length, 0);
});
```

- [ ] **Step 3: Run tests to confirm they fail**

Run: `pnpm tsx --test test/rpc-adapter.test.ts`
Expected: FAIL ("rawTxToHelius is not a function" / module not found).

- [ ] **Step 4: Implement `src/lib/rpc-adapter.ts`**
```ts
import { NATIVE_SOL_MINT } from "./domain";
import type { HeliusNativeTransfer, HeliusTokenTransfer, HeliusTransaction } from "./transfer-parser";
import type { RpcGetTransaction, RpcInstruction, RpcTokenBalance } from "./rpc-types";

const TOKEN_2022_PROGRAM = "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb";

type TokenAcct = { owner?: string; mint: string; decimals: number; programId?: string };

function tokenAccountMap(tx: RpcGetTransaction): Map<string, TokenAcct> {
  const keys = tx.transaction.message.accountKeys;
  const map = new Map<string, TokenAcct>();
  const add = (b: RpcTokenBalance) => {
    const pubkey = keys[b.accountIndex]?.pubkey;
    if (!pubkey) return;
    map.set(pubkey, {
      owner: b.owner,
      mint: b.mint,
      decimals: b.uiTokenAmount.decimals,
      programId: b.programId,
    });
  };
  for (const b of tx.meta?.preTokenBalances ?? []) add(b);
  for (const b of tx.meta?.postTokenBalances ?? []) add(b);
  return map;
}

function allInstructions(tx: RpcGetTransaction): RpcInstruction[] {
  const top = tx.transaction.message.instructions ?? [];
  const inner = (tx.meta?.innerInstructions ?? []).flatMap((g) => g.instructions);
  return [...top, ...inner];
}

export function rawTxToHelius(tx: RpcGetTransaction, wallet: string): HeliusTransaction {
  const signature = tx.transaction.signatures[0];
  const base: HeliusTransaction = {
    signature,
    slot: tx.slot,
    timestamp: tx.blockTime ?? undefined,
    nativeTransfers: [],
    tokenTransfers: [],
  };
  if (!tx.meta || tx.meta.err != null) {
    return { ...base, transactionError: tx.meta?.err ?? "no meta" };
  }

  const accts = tokenAccountMap(tx);
  const nativeTransfers: HeliusNativeTransfer[] = [];
  const tokenTransfers: HeliusTokenTransfer[] = [];

  for (const ix of allInstructions(tx)) {
    const info = ix.parsed?.info;
    const type = ix.parsed?.type;
    if (!info || !type) continue;

    if (ix.program === "system" && (type === "transfer" || type === "transferWithSeed")) {
      if (info.source !== wallet) continue;
      const lamports = Number(info.lamports);
      if (!info.destination || !Number.isFinite(lamports) || lamports <= 0) continue;
      nativeTransfers.push({ fromUserAccount: wallet, toUserAccount: info.destination, amount: lamports });
      continue;
    }

    if ((ix.program === "spl-token" || ix.program === "spl-token-2022") &&
        (type === "transfer" || type === "transferChecked")) {
      const srcAcct = accts.get(info.source);
      const isOurs = info.authority === wallet || srcAcct?.owner === wallet;
      if (!isOurs) continue;

      const mint = info.mint ?? srcAcct?.mint;
      if (!mint) continue;
      const destOwner = accts.get(info.destination)?.owner ?? info.destination;
      if (destOwner === wallet) continue; // self-transfer / ATA noise

      const rawAmount = type === "transferChecked" ? info.tokenAmount?.amount : info.amount;
      const decimals = type === "transferChecked"
        ? info.tokenAmount?.decimals
        : (srcAcct?.decimals ?? accts.get(info.destination)?.decimals);
      if (rawAmount == null || decimals == null) continue;
      const uiAmount = type === "transferChecked"
        ? Number(info.tokenAmount?.uiAmount ?? Number(rawAmount) / 10 ** decimals)
        : Number(rawAmount) / 10 ** decimals;

      const is2022 = ix.program === "spl-token-2022" || ix.programId === TOKEN_2022_PROGRAM;
      tokenTransfers.push({
        fromUserAccount: wallet,
        toUserAccount: destOwner,
        mint,
        tokenAmount: uiAmount,
        rawTokenAmount: { tokenAmount: String(rawAmount), decimals },
        tokenStandard: is2022 ? "FungibleToken2022" : "Fungible",
      });
    }
  }

  return { ...base, nativeTransfers, tokenTransfers };
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `pnpm tsx --test test/rpc-adapter.test.ts`
Expected: PASS (all 6). If a fixture lacks the exact case, fix the fixture (Task 1 Step 3), not the assertion.

- [ ] **Step 6: Full verify + commit**

Run: `pnpm verify`
```bash
git add src/lib/rpc-types.ts src/lib/rpc-adapter.ts test/rpc-adapter.test.ts
git commit -m "feat: instruction-parsing RPC adapter — raw getTransaction to Helius shape"
```

---

## Task 3: Aggregation + snapshot type — TDD

**Files:**
- Create: `src/lib/aggregate.ts`, `test/aggregate.test.ts`
- Modify: `src/lib/domain.ts` (export `Snapshot` + recipient type)

**Interfaces:**
- Consumes: `TransferRow` from `./domain`.
- Produces: `buildSnapshot(rows, opts): Snapshot`, `mergeSnapshots(prev, next): Snapshot`, types `Snapshot`, `RecipientRow`. Used by `collector-core` (Task 5) and `dashboard-state` (Task 6).

- [ ] **Step 1: Add types to `src/lib/domain.ts`**
```ts
export type RecipientRow = { wallet: string; transferCount: number; firstSeen: string; latestSeen: string };

export type Snapshot = {
  collectedAt: string;
  coveredFrom: string | null;
  coveredThrough: string | null;
  lastSignature: string | null;
  sourceWallet: string;
  transfers: TransferRow[];
  recipients: RecipientRow[];
  counts: { transfers: number; uniqueRecipients: number; unparsed: number };
  ansemSentUi: number;
  solSentUi: number;
};
```

- [ ] **Step 2: Write failing aggregate tests** (mint-exact decoy + cross-snapshot dedup)

`test/aggregate.test.ts`:
```ts
import assert from "node:assert/strict";
import test from "node:test";
import { ANSEM_MINT, NATIVE_SOL_MINT, type TransferRow } from "../src/lib/domain";
import { buildSnapshot, mergeSnapshots } from "../src/lib/aggregate";

const row = (over: Partial<TransferRow>): TransferRow => ({
  id: over.id ?? `${over.signature}:${over.mint}:${over.eventIndex ?? 0}`,
  signature: "sig", blockTime: "2026-06-28T00:00:00.000Z",
  sourceWallet: "SRC", recipientWallet: "R1", mint: ANSEM_MINT,
  amountRaw: "1000000", amountUi: 1, transferType: "token_2022",
  parserConfidence: "high", eventIndex: 0, txUrl: "x", ...over,
});

test("mint-exact: a decoy 'ANSEM' symbol with a different mint is NOT counted", () => {
  const rows = [
    row({ id: "a", mint: ANSEM_MINT, amountUi: 10, symbol: "ANSEM" }),
    row({ id: "b", mint: "DECOYmint", amountUi: 999, symbol: "ANSEM" }), // decoy
    row({ id: "c", mint: NATIVE_SOL_MINT, amountUi: 2, transferType: "native_sol" }),
  ];
  const snap = buildSnapshot(rows, { sourceWallet: "SRC", unparsed: 0, lastSignature: "s" });
  assert.equal(snap.ansemSentUi, 10);
  assert.equal(snap.solSentUi, 2);
  assert.equal(snap.counts.transfers, 3);
});

test("recipients aggregate with first/latest seen and unique count", () => {
  const rows = [
    row({ id: "a", recipientWallet: "R1", blockTime: "2026-06-01T00:00:00.000Z" }),
    row({ id: "b", recipientWallet: "R1", blockTime: "2026-06-10T00:00:00.000Z" }),
    row({ id: "c", recipientWallet: "R2", blockTime: "2026-06-05T00:00:00.000Z" }),
  ];
  const snap = buildSnapshot(rows, { sourceWallet: "SRC", unparsed: 0, lastSignature: null });
  assert.equal(snap.counts.uniqueRecipients, 2);
  const r1 = snap.recipients.find((r) => r.wallet === "R1")!;
  assert.equal(r1.transferCount, 2);
  assert.equal(r1.firstSeen, "2026-06-01T00:00:00.000Z");
  assert.equal(r1.latestSeen, "2026-06-10T00:00:00.000Z");
});

test("merge dedups overlapping transfer ids across snapshots", () => {
  const prev = buildSnapshot([row({ id: "dup", amountUi: 5 })], { sourceWallet: "SRC", unparsed: 1, lastSignature: "old" });
  const next = buildSnapshot(
    [row({ id: "dup", amountUi: 5 }), row({ id: "new", amountUi: 7 })],
    { sourceWallet: "SRC", unparsed: 2, lastSignature: "new" },
  );
  const merged = mergeSnapshots(prev, next);
  assert.equal(merged.counts.transfers, 2);          // dup collapsed
  assert.equal(merged.ansemSentUi, 12);
  assert.equal(merged.lastSignature, "new");          // newest wins
});
```

- [ ] **Step 3: Run to confirm failure**

Run: `pnpm tsx --test test/aggregate.test.ts` → FAIL (module not found).

- [ ] **Step 4: Implement `src/lib/aggregate.ts`**
```ts
import { ANSEM_MINT, NATIVE_SOL_MINT, type RecipientRow, type Snapshot, type TransferRow } from "./domain";

type BuildOpts = { sourceWallet: string; unparsed: number; lastSignature: string | null };

function dedupe(rows: TransferRow[]): TransferRow[] {
  const seen = new Set<string>();
  const out: TransferRow[] = [];
  for (const r of rows) { if (!seen.has(r.id)) { seen.add(r.id); out.push(r); } }
  return out;
}

function recipients(rows: TransferRow[]): RecipientRow[] {
  const by = new Map<string, RecipientRow>();
  for (const r of rows) {
    const cur = by.get(r.recipientWallet);
    if (!cur) { by.set(r.recipientWallet, { wallet: r.recipientWallet, transferCount: 1, firstSeen: r.blockTime, latestSeen: r.blockTime }); continue; }
    cur.transferCount += 1;
    if (r.blockTime < cur.firstSeen) cur.firstSeen = r.blockTime;
    if (r.blockTime > cur.latestSeen) cur.latestSeen = r.blockTime;
  }
  return [...by.values()].sort((a, b) => (a.latestSeen < b.latestSeen ? 1 : -1));
}

export function buildSnapshot(input: TransferRow[], opts: BuildOpts): Snapshot {
  const rows = dedupe(input).sort((a, b) => (a.blockTime < b.blockTime ? 1 : -1));
  const times = rows.map((r) => r.blockTime).sort();
  return {
    collectedAt: new Date(0).toISOString(), // stamped by caller via withCollectedAt; placeholder-safe
    coveredFrom: times[0] ?? null,
    coveredThrough: times[times.length - 1] ?? null,
    lastSignature: opts.lastSignature,
    sourceWallet: opts.sourceWallet,
    transfers: rows,
    recipients: recipients(rows),
    counts: { transfers: rows.length, uniqueRecipients: new Set(rows.map((r) => r.recipientWallet)).size, unparsed: opts.unparsed },
    ansemSentUi: rows.filter((r) => r.mint === ANSEM_MINT).reduce((s, r) => s + r.amountUi, 0),
    solSentUi: rows.filter((r) => r.mint === NATIVE_SOL_MINT).reduce((s, r) => s + r.amountUi, 0),
  };
}

export function mergeSnapshots(prev: Snapshot, next: Snapshot): Snapshot {
  return buildSnapshot([...prev.transfers, ...next.transfers], {
    sourceWallet: next.sourceWallet,
    unparsed: prev.counts.unparsed + next.counts.unparsed,
    lastSignature: next.lastSignature ?? prev.lastSignature,
  });
}

export function withCollectedAt(snap: Snapshot, iso: string): Snapshot {
  return { ...snap, collectedAt: iso, coveredThrough: snap.coveredThrough ?? iso };
}
```
> Note: `collectedAt` is stamped by the caller (`collector-core`) via `withCollectedAt(new Date().toISOString())` — pure functions don't read the clock, keeping them testable.

- [ ] **Step 5: Run → PASS, then verify + commit**

Run: `pnpm tsx --test test/aggregate.test.ts` → PASS. Then `pnpm verify`.
```bash
git add src/lib/domain.ts src/lib/aggregate.ts test/aggregate.test.ts
git commit -m "feat: pure snapshot aggregation + merge (mint-exact totals, recipient rollup, dedup)"
```

---

## Task 4: RPC source (networked, thin)

**Files:**
- Create: `src/lib/rpc-source.ts`

**Interfaces:**
- Produces: `rpcUrl(): string`; `getOutgoingTransactions(opts: { wallet: string; sinceDays?: number; untilSignature?: string | null; maxSignatures?: number }): Promise<{ txs: RpcGetTransaction[]; newestSignature: string | null }>`. Used by `collector-core` (Task 5).

- [ ] **Step 1: Implement `src/lib/rpc-source.ts`**
```ts
import type { RpcGetTransaction } from "./rpc-types";

export function rpcUrl(): string {
  const url = process.env.HELIUS_RPC_URL
    ?? (process.env.HELIUS_API_KEY ? `https://mainnet.helius-rpc.com/?api-key=${process.env.HELIUS_API_KEY}` : null);
  if (!url) throw new Error("Set HELIUS_API_KEY or HELIUS_RPC_URL");
  return url;
}

async function rpcBatch(url: string, calls: { method: string; params: unknown[] }[]): Promise<any[]> {
  const body = calls.map((c, i) => ({ jsonrpc: "2.0", id: i, method: c.method, params: c.params }));
  const res = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  if (!res.ok) throw new Error(`RPC ${res.status} ${res.statusText}`);
  const json = await res.json();
  return (Array.isArray(json) ? json : [json]).sort((a, b) => a.id - b.id).map((r) => {
    if (r.error) throw new Error(`RPC error: ${JSON.stringify(r.error)}`);
    return r.result;
  });
}

export async function getOutgoingTransactions(opts: {
  wallet: string; sinceDays?: number; untilSignature?: string | null; maxSignatures?: number;
}): Promise<{ txs: RpcGetTransaction[]; newestSignature: string | null }> {
  const url = rpcUrl();
  const cutoff = opts.sinceDays ? Date.now() / 1000 - opts.sinceDays * 86400 : 0;
  const cap = opts.maxSignatures ?? 10_000;

  // 1) paginate signatures (newest -> older)
  const signatures: string[] = [];
  let before: string | undefined;
  let newest: string | null = null;
  outer: while (signatures.length < cap) {
    const [page] = await rpcBatch(url, [{
      method: "getSignaturesForAddress",
      params: [opts.wallet, { limit: 1000, ...(before ? { before } : {}), ...(opts.untilSignature ? { until: opts.untilSignature } : {})}],
    }]) as Array<Array<{ signature: string; blockTime: number | null }>>;
    if (!page.length) break;
    newest ??= page[0].signature;
    for (const s of page) {
      if (cutoff && s.blockTime && s.blockTime < cutoff) break outer;
      signatures.push(s.signature);
    }
    before = page[page.length - 1].signature;
    if (page.length < 1000) break;
  }

  // 2) fetch transactions in batches of 100
  const txs: RpcGetTransaction[] = [];
  for (let i = 0; i < signatures.length; i += 100) {
    const chunk = signatures.slice(i, i + 100);
    const results = await rpcBatch(url, chunk.map((sig) => ({
      method: "getTransaction",
      params: [sig, { encoding: "jsonParsed", maxSupportedTransactionVersion: 0 }],
    })));
    for (const r of results) if (r) txs.push(r as RpcGetTransaction);
  }
  return { txs, newestSignature: newest };
}
```
> No unit test (networked; "no mocks"). It is exercised live in Task 5 Step 3 and the deploy gate.

- [ ] **Step 2: Typecheck + commit**

Run: `pnpm typecheck`
```bash
git add src/lib/rpc-source.ts
git commit -m "feat: standard-RPC source — signature pagination + batched getTransaction"
```

---

## Task 5: Snapshot store + collector-core + CLI

**Files:**
- Create: `src/lib/snapshot.ts`, `src/lib/collector-core.ts`, `test/snapshot.test.ts`
- Modify: `scripts/collect_airdrop_transfers.ts`

**Interfaces:**
- Consumes: `rawTxToHelius`, `parseOutgoingTransfers`, `buildSnapshot`/`mergeSnapshots`/`withCollectedAt`, `getOutgoingTransactions`.
- Produces: `loadSnapshot(): Promise<Snapshot | null>`, `saveSnapshot(s): Promise<void>`, `emptySnapshot(): Snapshot`; `collect(opts): Promise<Snapshot>`. Used by API/page (Task 6) and the Netlify function (Task 9).

- [ ] **Step 1: Implement `src/lib/snapshot.ts` (Blobs + dev file fallback)**
```ts
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { PRIMARY_SOURCE, type Snapshot } from "./domain";

const STORE = "ansem-snapshot";
const KEY = "snapshot";
const LOCAL = ".data/snapshot.json";

export function emptySnapshot(): Snapshot {
  return {
    collectedAt: new Date(0).toISOString(), coveredFrom: null, coveredThrough: null,
    lastSignature: null, sourceWallet: PRIMARY_SOURCE.walletAddress,
    transfers: [], recipients: [], counts: { transfers: 0, uniqueRecipients: 0, unparsed: 0 },
    ansemSentUi: 0, solSentUi: 0,
  };
}

function blobsAvailable(): boolean {
  return Boolean(process.env.NETLIFY || process.env.NETLIFY_BLOBS_CONTEXT || process.env.BLOBS_CONTEXT);
}

export async function loadSnapshot(): Promise<Snapshot | null> {
  if (blobsAvailable()) {
    const { getStore } = await import("@netlify/blobs");
    return (await getStore(STORE).get(KEY, { type: "json" })) as Snapshot | null;
  }
  try { return JSON.parse(await readFile(LOCAL, "utf8")) as Snapshot; }
  catch { return null; }
}

export async function saveSnapshot(snap: Snapshot): Promise<void> {
  if (blobsAvailable()) {
    const { getStore } = await import("@netlify/blobs");
    await getStore(STORE).setJSON(KEY, snap);
    return;
  }
  await mkdir(".data", { recursive: true });
  await writeFile(LOCAL, JSON.stringify(snap, null, 2));
}
```

- [ ] **Step 2: Implement `src/lib/collector-core.ts`**
```ts
import { PRIMARY_SOURCE_WALLET, type Snapshot } from "./domain";
import { getOutgoingTransactions } from "./rpc-source";
import { rawTxToHelius } from "./rpc-adapter";
import { parseOutgoingTransfers } from "./transfer-parser";
import { buildSnapshot, mergeSnapshots, withCollectedAt } from "./aggregate";
import { loadSnapshot, saveSnapshot, emptySnapshot } from "./snapshot";
import type { RpcGetTransaction } from "./rpc-types";

export function snapshotFromTxs(txs: RpcGetTransaction[], wallet: string, newestSignature: string | null, nowIso: string): Snapshot {
  const helius = txs.map((t) => rawTxToHelius(t, wallet));
  const { transfers, unparsed } = parseOutgoingTransfers(helius, wallet);
  const built = buildSnapshot(transfers, { sourceWallet: wallet, unparsed: unparsed.length, lastSignature: newestSignature });
  return withCollectedAt(built, nowIso);
}

export async function collect(opts: { mode: "backfill" | "incremental"; wallet?: string }): Promise<Snapshot> {
  const wallet = opts.wallet ?? PRIMARY_SOURCE_WALLET;
  const prev = (await loadSnapshot()) ?? emptySnapshot();
  const { txs, newestSignature } = await getOutgoingTransactions({
    wallet,
    sinceDays: opts.mode === "backfill" ? 30 : undefined,
    untilSignature: opts.mode === "incremental" ? prev.lastSignature : null,
    maxSignatures: opts.mode === "backfill" ? 40_000 : 2_000,
  });
  const fresh = snapshotFromTxs(txs, wallet, newestSignature ?? prev.lastSignature, new Date().toISOString());
  const merged = opts.mode === "incremental" ? withCollectedAt(mergeSnapshots(prev, fresh), fresh.collectedAt) : fresh;
  await saveSnapshot(merged);
  return merged;
}
```

- [ ] **Step 3: Snapshot store test (file fallback + collector pure path)**

`test/snapshot.test.ts`:
```ts
import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { snapshotFromTxs } from "../src/lib/collector-core";
import { PRIMARY_SOURCE_WALLET } from "../src/lib/domain";
import type { RpcGetTransaction } from "../src/lib/rpc-types";

test("snapshotFromTxs produces a stamped snapshot from a real fixture", () => {
  const tx = JSON.parse(readFileSync("test/fixtures/outgoing-ansem-multi.json", "utf8")) as RpcGetTransaction;
  const snap = snapshotFromTxs([tx], PRIMARY_SOURCE_WALLET, "sigNewest", "2026-06-28T12:00:00.000Z");
  assert.equal(snap.collectedAt, "2026-06-28T12:00:00.000Z");
  assert.equal(snap.lastSignature, "sigNewest");
  assert.ok(snap.counts.transfers >= 2);
  assert.ok(snap.ansemSentUi > 0);
});
```
Run: `pnpm tsx --test test/snapshot.test.ts` → PASS.

- [ ] **Step 4: Rewire CLI `scripts/collect_airdrop_transfers.ts`**

Replace its live-mode body so `--backfill` / default delegates to `collect`, keeping `--fixture` mode:
```ts
#!/usr/bin/env tsx
import { readFile } from "node:fs/promises";
import { parseOutgoingTransfers, type HeliusTransaction } from "../src/lib/transfer-parser";
import { PRIMARY_SOURCE_WALLET } from "../src/lib/domain";
import { collect } from "../src/lib/collector-core";

async function main() {
  const argv = process.argv.slice(2);
  const fixtureIdx = argv.indexOf("--fixture");
  if (fixtureIdx >= 0) {
    const raw = await readFile(argv[fixtureIdx + 1], "utf8");
    const result = parseOutgoingTransfers(JSON.parse(raw) as HeliusTransaction[], PRIMARY_SOURCE_WALLET);
    process.stdout.write(JSON.stringify(result, null, 2) + "\n");
    return;
  }
  const mode = argv.includes("--backfill") ? "backfill" : "incremental";
  const snap = await collect({ mode });
  console.log(`mode=${mode} transfers=${snap.counts.transfers} recipients=${snap.counts.uniqueRecipients} ansemSentUi=${snap.ansemSentUi} unparsed=${snap.counts.unparsed} window=${snap.coveredFrom}..${snap.coveredThrough}`);
}
main().catch((e) => { console.error(e instanceof Error ? e.message : e); process.exitCode = 1; });
```

- [ ] **Step 5: Live backfill run (needs `HELIUS_API_KEY`) → real local snapshot**

Run: `HELIUS_API_KEY=... pnpm tsx scripts/collect_airdrop_transfers.ts --backfill`
Expected: prints non-zero `transfers` / `recipients` and a 30-day `window`; writes `.data/snapshot.json`. Eyeball a few rows for sane recipients/amounts.

- [ ] **Step 6: Verify + commit**

Run: `pnpm verify`
```bash
git add src/lib/snapshot.ts src/lib/collector-core.ts test/snapshot.test.ts scripts/collect_airdrop_transfers.ts
git commit -m "feat: snapshot store (Blobs + dev fallback) + collector-core + CLI backfill"
```

---

## Task 6: Rewire app consumers to real data

**Files:**
- Modify: `src/lib/dashboard-state.ts`, `src/app/api/summary/route.ts`, `src/app/api/transfers/route.ts`, `src/app/api/recipients/route.ts`, `src/app/page.tsx`

**Interfaces:**
- Consumes: `loadSnapshot`, `emptySnapshot`, `Summary`/`Snapshot` types.
- Produces: real JSON from API routes; `page.tsx` rendering real rows.

- [ ] **Step 1: Replace `src/lib/dashboard-state.ts` with a snapshot reader**
```ts
import { PRIMARY_SOURCE, type Summary } from "./domain";
import { loadSnapshot, emptySnapshot } from "./snapshot";

export async function getSnapshot() {
  return (await loadSnapshot()) ?? emptySnapshot();
}

export function summaryFrom(snap: Awaited<ReturnType<typeof getSnapshot>>): Summary {
  return {
    trackedWallet: PRIMARY_SOURCE,
    transferCount: snap.counts.transfers,
    uniqueRecipients: snap.counts.uniqueRecipients,
    totalCurrentUsd: null, // filled with live price in /api/summary + page (Task 7)
    totalAnsemSentUi: snap.ansemSentUi,
    unparsedTransactionCount: snap.counts.unparsed,
    lastCollectedAt: snap.collectedAt && snap.collectedAt !== new Date(0).toISOString() ? snap.collectedAt : null,
  };
}
```

- [ ] **Step 2: Update the three data API routes** (await the snapshot)
```ts
// src/app/api/transfers/route.ts
import { getSnapshot } from "@/lib/dashboard-state";
export async function GET() { const s = await getSnapshot(); return Response.json({ transfers: s.transfers, coveredFrom: s.coveredFrom, coveredThrough: s.coveredThrough }); }
```
```ts
// src/app/api/recipients/route.ts
import { getSnapshot } from "@/lib/dashboard-state";
export async function GET() { const s = await getSnapshot(); return Response.json({ recipients: s.recipients }); }
```
```ts
// src/app/api/summary/route.ts
import { getSnapshot, summaryFrom } from "@/lib/dashboard-state";
export async function GET() { return Response.json(summaryFrom(await getSnapshot())); }
```

- [ ] **Step 3: Update `src/app/page.tsx` to render real rows**

Make `Home` async; read the snapshot and map rows into the existing transfers/recipients tables (keep current styling for now — restyle is Task 8). Use `summaryFrom` for the stat cards, render `snap.transfers` and `snap.recipients`, show `coveredFrom..coveredThrough` and `lastCollectedAt`. Replace the empty-state arrays:
```tsx
import { getSnapshot, summaryFrom } from "@/lib/dashboard-state";
// ...
export default async function Home() {
  const snap = await getSnapshot();
  const summary = summaryFrom(snap);
  const transfers = snap.transfers;
  const recipients = snap.recipients;
  // ...render rows; format amounts with toLocaleString and addresses with short()
}
```
Render each transfer row: time (`new Date(blockTime).toLocaleString()`), asset (`symbol ?? short(mint)`), amount (`amountUi.toLocaleString()`), recipient (`short(recipientWallet)` linking to `https://solscan.io/account/...`), confidence, tx (`txUrl`). Render each recipient row: `short(wallet)`, `transferCount`, first/latest seen.

- [ ] **Step 4: Visual check (desktop + mobile)**

Run: `pnpm dev`, open `http://localhost:3000`. With `.data/snapshot.json` present, confirm real rows render. **Screenshot desktop AND a ~390px mobile viewport.** `totalCurrentUsd` may be null/"—" (price is Task 7).

- [ ] **Step 5: Verify + commit**

Run: `pnpm verify`
```bash
git add src/lib/dashboard-state.ts src/app/api src/app/page.tsx
git commit -m "feat: wire app to real snapshot (summary/transfers/recipients + page)"
```

---

## Task 7: Live price + current-value totals

**Files:**
- Create: `src/lib/price.ts`
- Modify: `src/app/api/token/ansem/route.ts`, `src/app/api/summary/route.ts`, `src/app/page.tsx`

**Interfaces:**
- Produces: `getAnsemMarket(): Promise<TokenPanel>`, `getSolPriceUsd(): Promise<number | null>`. Consumed by token route, summary route, page.

- [ ] **Step 1: Implement `src/lib/price.ts`**
```ts
import { ANSEM_MINT, NATIVE_SOL_MINT, type TokenPanel } from "./domain";

type Pair = { priceUsd?: string; priceNative?: string; liquidity?: { usd?: number }; marketCap?: number; fdv?: number; volume?: { h24?: number }; priceChange?: { h24?: number } };

async function topPair(mint: string): Promise<Pair | null> {
  const res = await fetch(`https://api.dexscreener.com/tokens/v1/solana/${mint}`, { next: { revalidate: 60 } });
  if (!res.ok) return null;
  const pairs = (await res.json()) as Pair[];
  if (!Array.isArray(pairs) || !pairs.length) return null;
  return pairs.reduce((best, p) => ((p.liquidity?.usd ?? 0) > (best.liquidity?.usd ?? 0) ? p : best));
}

export async function getAnsemMarket(): Promise<TokenPanel> {
  const p = await topPair(ANSEM_MINT);
  return {
    mint: ANSEM_MINT, symbol: "ANSEM", name: "The Black Bull",
    priceUsd: p?.priceUsd ? Number(p.priceUsd) : null,
    liquidityUsd: p?.liquidity?.usd ?? null,
    marketCapUsd: p?.marketCap ?? p?.fdv ?? null,
    volume24hUsd: p?.volume?.h24 ?? null,
    updatedAt: new Date().toISOString(),
  };
}

export async function getSolPriceUsd(): Promise<number | null> {
  const p = await topPair(NATIVE_SOL_MINT); // wrapped SOL mint
  if (p?.priceUsd) return Number(p.priceUsd);
  return null;
}
```
> Note: `TokenPanel` currently types `priceUsd` etc. — confirm fields match `domain.ts`; widen `name` if TS complains about the literal.

- [ ] **Step 2: Token route + summary current-value + page price**
```ts
// src/app/api/token/ansem/route.ts
import { getAnsemMarket } from "@/lib/price";
export async function GET() { return Response.json(await getAnsemMarket()); }
```
In `summaryFrom` usage (summary route + page), compute `totalCurrentUsd = ansemSentUi * (ansemPrice ?? 0) + solSentUi * (solPrice ?? 0)` when prices resolve; show "—" otherwise. The token panel reads `getAnsemMarket()`.

- [ ] **Step 3: Visual check (desktop + mobile)**

`pnpm dev` → token panel shows real price/liquidity/mcap/volume; overview shows a non-null `totalCurrentUsd`. Screenshot desktop + ~390px.

- [ ] **Step 4: Verify + commit**

Run: `pnpm verify`
```bash
git add src/lib/price.ts src/app/api/token/ansem/route.ts src/app/api/summary/route.ts src/app/page.tsx
git commit -m "feat: live DexScreener price + current-value totals (ANSEM + SOL)"
```

---

## Task 8: UI restyle — Black Noise, mobile-first

**Files:**
- Modify: `src/app/page.tsx`, `src/app/layout.tsx`, `src/app/globals.css`, `next.config.ts`
- Create: `public/black-bull.png` (committed token art) and a grain asset if used

**Interfaces:** none new — visual only. **Use the `mobile-responsive-audit` skill for the mobile pass.**

- [ ] **Step 1: Tokens + fonts**

In `layout.tsx`, add a display font via `next/font` (e.g. a heavy grotesk) exposing `--font-display`; keep Geist + Geist Mono. Add `viewport` + `themeColor: "#050506"` metadata. In `globals.css`, set oxblood accent token `--accent:#B11226`, replace the emerald `::selection` color, add safe-area padding utilities.

- [ ] **Step 2: Hero + disclaimers + headline**

Commit `public/black-bull.png`. Render it as a captioned *tracked token* (caption "Tracked token: ANSEM / The Black Bull · 9cRCn9…pump"), not the site mark. Headline: "Outgoing transfers from a Pump.fun wallet linked to Ansem" + subline "Read-only on-chain ledger. Unofficial. Attribution unconfirmed — see Methodology." Add the persistent **Unofficial** disclaimer (spec §10 exact copy) in header + footer.

- [ ] **Step 3: Purge emerald → oxblood; "Last updated" + window; Methodology**

Replace all `emerald-*` usages (live dot, symbol pill) with oxblood. Replace the "Read-only Solana ledger / live" framing with a static dot + "Last updated {collectedAt}" + "{coveredFrom} → {coveredThrough}". Title the transfers table "Recent transfers". Expand the Method panel into the full Methodology block (all caveats from spec §10, incl. "not financial advice / not a trading signal" + non-affiliation + recipients-are-neutral).

- [ ] **Step 4: Mobile-first responsive pass**

Apply `mobile-responsive-audit`: tables get horizontal scroll containers AND/OR stack into cards under `sm`; tap targets ≥44px; addresses use mono + middle-ellipsis helper; no horizontal overflow at 360–414px; safe-area insets honored. Add `next.config.ts` `images.remotePatterns` only if the hero is remote (prefer the committed `/public` asset, so likely no change).

- [ ] **Step 5: Visual check (desktop + mobile, mandatory)**

`pnpm dev`; screenshot desktop AND ~390px iPhone-Safari viewport. Confirm: single oxblood accent, mono addresses, hero reads as token not logo, disclaimers visible, tables usable on phone (no overflow), no emerald remains.

- [ ] **Step 6: Verify + commit**

Run: `pnpm verify`
```bash
git add src/app public next.config.ts
git commit -m "feat: Black Noise UI — oxblood skin, disclaimers, methodology, mobile-first"
```

---

## Task 9: Netlify deploy + scheduled incremental

**Files:**
- Create: `netlify.toml`, `netlify/functions/collect.ts`

**Interfaces:** Consumes `collect` from `collector-core`.

- [ ] **Step 1: `netlify.toml`**
```toml
[build]
  command = "pnpm build"
  publish = ".next"

[[plugins]]
  package = "@netlify/plugin-nextjs"

[functions."collect"]
  schedule = "*/5 * * * *"
```

- [ ] **Step 2: `netlify/functions/collect.ts` (incremental only)**
```ts
import type { Config } from "@netlify/functions";
import { collect } from "../../src/lib/collector-core";

export default async function handler() {
  const snap = await collect({ mode: "incremental" });
  return new Response(JSON.stringify({ ok: true, transfers: snap.counts.transfers, collectedAt: snap.collectedAt }), {
    headers: { "content-type": "application/json" },
  });
}

export const config: Config = { schedule: "*/5 * * * *" };
```

- [ ] **Step 3: Local Blobs smoke test**

Run: `netlify dev` then `netlify functions:invoke collect` (set `HELIUS_API_KEY` in the netlify env / a local `.env`). Expected: `{ ok: true, ... }` and a Blobs snapshot written; the dev site reads it.

- [ ] **Step 4: Configure env + deploy**

Set `HELIUS_API_KEY` in the Netlify dashboard (Site settings → env). Deploy (`netlify deploy --build --prod` or push to the connected repo). Then run the one-time backfill against Blobs (a `--backfill` invocation with Blobs env, or a temporary `mode:"backfill"` function run) so production has ~30 days seeded.

- [ ] **Step 5: First-deploy gate (artifacts)**

- [ ] Trigger `collect` twice; confirm Blobs `snapshot.json` exists and `collectedAt` **advances**.
- [ ] Deployed page shows ≥1 real transfer row AND a non-null live ANSEM price.
- [ ] Unparsed count + covered window visible.
- [ ] Boundary grep passes (`node scripts/check-boundary.mjs`).
- [ ] Mobile screenshot (iOS Safari / ~390px) looks correct.

- [ ] **Step 6: Commit**
```bash
git add netlify.toml netlify/functions/collect.ts
git commit -m "feat: Netlify deploy + 5-min incremental scheduled collector"
```

---

## Self-Review

- **Spec coverage:** §1 done-criteria → Tasks 5/9 gate. §2 boundary → Task 0 Step 4 + grep. §3 decisions → Tasks 4/5 (RPC, backfill/incremental, 30d), 7 (price), 8 (branding). §6 file plan → all tasks. §7 snapshot → Task 3/5. §8 instruction-parsing → Task 2. §9 price → Task 7. §10 UI/mobile/copy → Task 8. §11 tests/gate → Tasks 1/2/3/5/9. §12 deferred → not built (correct). §13 anti-drift → Task 0 Step 5. §14 order → Tasks 0–9. §15 risks → addressed (doc gate Task 0, env notes Tasks 1/5/9).
- **Placeholders:** none — all code steps show code; `collectedAt` clock-stamping documented (pure functions stay testable).
- **Type consistency:** `Snapshot`/`RecipientRow` defined in Task 3 and used in 5/6; `rawTxToHelius(tx, wallet)` defined Task 2, used Task 5; `getOutgoingTransactions` signature defined Task 4, used Task 5; `getAnsemMarket`/`getSolPriceUsd` Task 7. `TokenPanel` field match flagged in Task 7 Step 1.
- **Known execution dependency:** Tasks 1/5/9 need `HELIUS_API_KEY` (or the Helius MCP for fixture capture) — confirm supply at those steps.
