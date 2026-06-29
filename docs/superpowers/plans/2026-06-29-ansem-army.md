# Ansem Army Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an "Ansem Army" tab — a branded, ranked, searchable leaderboard of every wallet GV6U airdropped $ANSEM to, with live holdings for the top 50.

**Architecture:** A pure, tested view-helper (`armyRows`) over the existing `snap.recipients` (already sorted by amount desc) drives a new thin client component (`AnsemArmyView`) mounted as a 3rd tab. A new pure parser + RPC helper (`holdings.ts`) lets the collector enrich the top-50 recipients with their current on-chain ANSEM balance (`heldAnsemUi`), fail-soft.

**Tech Stack:** Next.js 16 / React 19 / TypeScript / Tailwind v4, `tsx --test`, Solana JSON-RPC via Helius (`getTokenAccountsByOwner`, jsonParsed).

## Global Constraints

- ANSEM mint EXACT: `9cRCn9rGT8V2imeM2BaKs13yhMEais3ruM3rPvTGpump` (never by symbol). Balances read with the `{ mint: ANSEM_MINT }` filter.
- Read-only boundary: no `@solana/wallet-adapter`, `@jup-ag`, `phantom`, `signTransaction`, `sendTransaction` in `src/`.
- The Helius key is server/CI only — never referenced in client components.
- Holdings depth = **top 50** recipients. Beyond that, `heldAnsemUi` is `undefined`.
- Global ranking: rank = position in the full `totalAnsemUi`-desc list, preserved while searching.
- Row link target: `https://solscan.io/account/<wallet>` (new tab).
- `pnpm verify` green before every commit. AIEngineerX git identity. Never `git push` (hand the command to the user).

## File Structure

- `src/lib/rpc-source.ts` (MODIFY) — export the existing `rpcBatch` for reuse.
- `src/lib/airdrop-snapshot.ts` (MODIFY) — add optional `heldAnsemUi?: number` to `AirdropRecipient`.
- `src/lib/holdings.ts` (CREATE) — `sumOwnerAnsem` (pure) + `getAnsemBalances` (RPC).
- `src/lib/airdrop-view.ts` (MODIFY) — `ArmyRow`/`ArmyView` types + `armyRows` helper.
- `scripts/collect-snapshot.ts` (MODIFY) — enrich top-50 holdings, fail-soft, in both write paths.
- `src/components/AnsemArmyView.tsx` (CREATE) — the leaderboard tab.
- `src/components/Tabs.tsx` (MODIFY) — add the 3rd tab + panel.
- `test/holdings.test.ts` (CREATE), `test/airdrop-view.test.ts` (MODIFY).

---

### Task 1: Holdings module — `heldAnsemUi` field, `sumOwnerAnsem`, `getAnsemBalances`

**Files:**
- Modify: `src/lib/airdrop-snapshot.ts` (add `heldAnsemUi?: number` to `AirdropRecipient`)
- Modify: `src/lib/rpc-source.ts` (export `rpcBatch`)
- Create: `src/lib/holdings.ts`
- Test: `test/holdings.test.ts`

**Interfaces:**
- Consumes: `ANSEM_MINT` from `./domain`; `rpcUrl`, `rpcBatch` from `./rpc-source`.
- Produces: `sumOwnerAnsem(result: unknown): number`; `getAnsemBalances(wallets: string[]): Promise<Map<string, number>>`; `AirdropRecipient.heldAnsemUi?: number`.

- [ ] **Step 1: Add the optional field to the recipient type.** In `src/lib/airdrop-snapshot.ts`, in `export type AirdropRecipient`, add after `signatures: string[];`:

```ts
  /** Current on-chain ANSEM balance — set by the collector for the top 50 only. */
  heldAnsemUi?: number;
```

- [ ] **Step 2: Export `rpcBatch`.** In `src/lib/rpc-source.ts`, change `async function rpcBatch(` to `export async function rpcBatch(`.

- [ ] **Step 3: Write the failing test** for `sumOwnerAnsem` in `test/holdings.test.ts`:

```ts
import assert from "node:assert/strict";
import test from "node:test";
import { sumOwnerAnsem } from "../src/lib/holdings";

const acct = (uiAmount: number | null) => ({
  account: { data: { parsed: { info: { tokenAmount: { uiAmount } } } } },
});

test("sumOwnerAnsem sums uiAmount across an owner's ANSEM token accounts", () => {
  assert.equal(sumOwnerAnsem({ value: [acct(1000.5), acct(250)] }), 1250.5);
});

test("sumOwnerAnsem returns 0 for an owner with no ANSEM accounts", () => {
  assert.equal(sumOwnerAnsem({ value: [] }), 0);
});

test("sumOwnerAnsem treats null/missing/garbage as 0", () => {
  assert.equal(sumOwnerAnsem(null), 0);
  assert.equal(sumOwnerAnsem({}), 0);
  assert.equal(sumOwnerAnsem({ value: [acct(null)] }), 0);
});
```

- [ ] **Step 4: Run it — expect FAIL** (module not found):

Run: `npx tsx --test test/holdings.test.ts`
Expected: FAIL ("Cannot find module '../src/lib/holdings'").

- [ ] **Step 5: Create `src/lib/holdings.ts`:**

```ts
import { ANSEM_MINT } from "./domain";
import { rpcUrl, rpcBatch } from "./rpc-source";

type ParsedTokenAccount = {
  account?: { data?: { parsed?: { info?: { tokenAmount?: { uiAmount?: number | null } } } } };
};

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Sum uiAmount across one owner's getTokenAccountsByOwner(jsonParsed) result. */
export function sumOwnerAnsem(result: unknown): number {
  const value = (result as { value?: ParsedTokenAccount[] } | null)?.value;
  if (!Array.isArray(value)) return 0;
  return value.reduce(
    (sum, acc) => sum + (acc?.account?.data?.parsed?.info?.tokenAmount?.uiAmount ?? 0),
    0,
  );
}

/** Current ANSEM balance (uiAmount) for each wallet, batched + throttled. */
export async function getAnsemBalances(wallets: string[]): Promise<Map<string, number>> {
  const url = rpcUrl();
  const out = new Map<string, number>();
  const BATCH = 25;
  for (let i = 0; i < wallets.length; i += BATCH) {
    const chunk = wallets.slice(i, i + BATCH);
    const results = await rpcBatch(
      url,
      chunk.map((w) => ({
        method: "getTokenAccountsByOwner",
        params: [w, { mint: ANSEM_MINT }, { encoding: "jsonParsed" }],
      })),
    );
    chunk.forEach((w, j) => out.set(w, sumOwnerAnsem(results[j])));
    if (i + BATCH < wallets.length) await sleep(250);
  }
  return out;
}
```

- [ ] **Step 6: Run the test — expect PASS:**

Run: `npx tsx --test test/holdings.test.ts`
Expected: PASS (3/3).

- [ ] **Step 7: Commit:**

```bash
git add src/lib/holdings.ts src/lib/rpc-source.ts src/lib/airdrop-snapshot.ts test/holdings.test.ts
git commit -m "feat: holdings module — sumOwnerAnsem + getAnsemBalances (top-50 ANSEM balances)"
```

---

### Task 2: `armyRows` view helper

**Files:**
- Modify: `src/lib/airdrop-view.ts`
- Test: `test/airdrop-view.test.ts`

**Interfaces:**
- Consumes: `AirdropRecipient` (incl. `heldAnsemUi?`) from `./airdrop-snapshot`.
- Produces: `ArmyRow`, `ArmyView`, `armyRows(recipients, query, limit)`.

- [ ] **Step 1: Write the failing tests.** Append to `test/airdrop-view.test.ts`:

```ts
import { armyRows } from "../src/lib/airdrop-view";

const rec = (wallet: string, totalAnsemUi: number, heldAnsemUi?: number) => ({
  wallet, totalAnsemUi, transferCount: 1, firstSeen: "2026-06-28T00:00:00.000Z",
  latestSeen: "2026-06-28T00:00:00.000Z", latestSignature: "sig" + wallet, signatures: ["sig" + wallet],
  ...(heldAnsemUi === undefined ? {} : { heldAnsemUi }),
});
// already sorted desc by totalAnsemUi
const RECIPS = [rec("AAA1", 100, 90), rec("BBB2", 50, 0), rec("AAA3", 10)];

test("armyRows: empty query returns top `limit`, ranks from 1, hasMore set", () => {
  const v = armyRows(RECIPS, "", 2);
  assert.equal(v.total, 3);
  assert.equal(v.shown, 2);
  assert.deepEqual(v.rows.map((r) => r.rank), [1, 2]);
  assert.equal(v.rows[0].wallet, "AAA1");
  assert.equal(v.rows[0].heldAnsemUi, 90);
  assert.equal(v.hasMore, true);
});

test("armyRows: query filters by wallet substring (case-insensitive) and preserves global rank", () => {
  const v = armyRows(RECIPS, "aaa", 50);
  assert.deepEqual(v.rows.map((r) => r.wallet), ["AAA1", "AAA3"]);
  assert.deepEqual(v.rows.map((r) => r.rank), [1, 3]); // global ranks, not 1,2
  assert.equal(v.total, 2);
  assert.equal(v.hasMore, false);
});

test("armyRows: no match -> empty", () => {
  const v = armyRows(RECIPS, "zzz", 50);
  assert.deepEqual(v.rows, []);
  assert.equal(v.total, 0);
  assert.equal(v.hasMore, false);
});

test("armyRows: limit >= total -> all rows, no more", () => {
  const v = armyRows(RECIPS, "", 50);
  assert.equal(v.shown, 3);
  assert.equal(v.hasMore, false);
});
```

- [ ] **Step 2: Run — expect FAIL** (`armyRows` not exported):

Run: `npx tsx --test test/airdrop-view.test.ts`
Expected: FAIL ("armyRows is not a function" / not exported).

- [ ] **Step 3: Implement.** Append to `src/lib/airdrop-view.ts` (it already imports `AirdropRecipient`/`AirdropSnapshot` — if not, add `import type { AirdropRecipient } from "./airdrop-snapshot";`):

```ts
export type ArmyRow = {
  rank: number;
  wallet: string;
  totalAnsemUi: number;
  transferCount: number;
  latestSeen: string;
  heldAnsemUi?: number;
};
export type ArmyView = { rows: ArmyRow[]; shown: number; total: number; hasMore: boolean };

/** Ranked, searchable leaderboard rows. `recipients` MUST be sorted by totalAnsemUi desc. */
export function armyRows(recipients: AirdropRecipient[], query: string, limit: number): ArmyView {
  const q = query.trim().toLowerCase();
  const ranked: ArmyRow[] = recipients.map((r, i) => ({
    rank: i + 1,
    wallet: r.wallet,
    totalAnsemUi: r.totalAnsemUi,
    transferCount: r.transferCount,
    latestSeen: r.latestSeen,
    heldAnsemUi: r.heldAnsemUi,
  }));
  const filtered = q ? ranked.filter((r) => r.wallet.toLowerCase().includes(q)) : ranked;
  const rows = filtered.slice(0, limit);
  return { rows, shown: rows.length, total: filtered.length, hasMore: filtered.length > limit };
}
```

- [ ] **Step 4: Run — expect PASS:**

Run: `npx tsx --test test/airdrop-view.test.ts`
Expected: PASS (existing + 4 new).

- [ ] **Step 5: Commit:**

```bash
git add src/lib/airdrop-view.ts test/airdrop-view.test.ts
git commit -m "feat: armyRows — ranked, searchable leaderboard view helper"
```

---

### Task 3: Collector enriches top-50 holdings (fail-soft)

**Files:**
- Modify: `scripts/collect-snapshot.ts`

**Interfaces:**
- Consumes: `getAnsemBalances` from `../src/lib/holdings`.
- Produces: snapshots whose top-50 recipients carry `heldAnsemUi`.

- [ ] **Step 1: Add the import** at the top of `scripts/collect-snapshot.ts` (with the other `../src/lib/*` imports):

```ts
import { getAnsemBalances } from "../src/lib/holdings";
```

- [ ] **Step 2: Add the fail-soft enrichment helper** near the top of the file (after the imports, before `main`):

```ts
// Enrich the top-50 recipients with their current on-chain ANSEM balance.
// Fail-soft: holdings are enrichment, not core truth — never fail the run over them.
async function withHoldings(snap: AirdropSnapshot): Promise<AirdropSnapshot> {
  try {
    const top = snap.recipients.slice(0, 50).map((r) => r.wallet);
    if (top.length === 0) return snap;
    const held = await getAnsemBalances(top);
    return {
      ...snap,
      recipients: snap.recipients.map((r) =>
        held.has(r.wallet) ? { ...r, heldAnsemUi: held.get(r.wallet) } : r,
      ),
    };
  } catch (e) {
    console.warn("holdings: fetch failed, writing snapshot without holdings:", (e as Error).message);
    return snap;
  }
}
```

- [ ] **Step 3: Use it in the sync write path.** In `scripts/collect-snapshot.ts`, in the `mode === "sync"` branch, replace the existing write line:

```ts
    writeFileSync(outPath, JSON.stringify(next, null, 2));
```

with:

```ts
    const enriched = await withHoldings(next);
    writeFileSync(outPath, JSON.stringify(enriched, null, 2));
```

- [ ] **Step 4: Use it in the legacy (incremental/backfill) write path.** Find the second `writeFileSync(outPath, JSON.stringify(next, null, 2));` (the legacy single-pass modes) and replace it the same way:

```ts
  const enriched = await withHoldings(next);
  writeFileSync(outPath, JSON.stringify(enriched, null, 2));
```

- [ ] **Step 5: Verify the whole project still builds/lints/types/tests:**

Run: `pnpm verify`
Expected: green (32+ tests pass, build OK).

- [ ] **Step 6: Live integration check** — run a real sync against the committed seed and confirm top-50 rows gain `heldAnsemUi`:

```bash
node --env-file=.env --import tsx scripts/collect-snapshot.ts \
  --in public/snapshot.seed.json --out /tmp/army-test.json --mode sync --max 50
node -e "const s=require('/tmp/army-test.json'); const top=s.recipients.slice(0,3); console.log(top.map(r=>({w:r.wallet.slice(0,6), got:r.totalAnsemUi, held:r.heldAnsemUi}))); console.log('with heldAnsemUi:', s.recipients.filter(r=>r.heldAnsemUi!==undefined).length, '(expect ~50)');"
```
Expected: top recipients show a numeric `held` (current balance), and ~50 recipients carry `heldAnsemUi`.

- [ ] **Step 7: Commit:**

```bash
git add scripts/collect-snapshot.ts
git commit -m "feat: collector enriches top-50 recipients with live ANSEM holdings (fail-soft)"
```

---

### Task 4: `AnsemArmyView` component

**Files:**
- Create: `src/components/AnsemArmyView.tsx`

**Interfaces:**
- Consumes: `armyRows`, `short` from `@/lib/airdrop-view`; `AirdropSnapshot` from `@/lib/airdrop-snapshot`.
- Produces: `<AnsemArmyView snap loading ansemPriceUsd />`.

- [ ] **Step 1: Create `src/components/AnsemArmyView.tsx`:**

```tsx
"use client";
import { useState } from "react";
import type { AirdropSnapshot } from "@/lib/airdrop-snapshot";
import { armyRows, short } from "@/lib/airdrop-view";

const fmt = (n: number) => n.toLocaleString("en-US", { maximumFractionDigits: 0 });
const compactUsd = (n: number) =>
  "$" + new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(n);
const solscan = (w: string) => `https://solscan.io/account/${w}`;

function holdingLabel(held: number | undefined, airdropped: number): { text: string; flair: string } {
  if (held === undefined) return { text: "—", flair: "" };
  const kept = airdropped > 0 ? held / airdropped : 0;
  const flair = kept >= 0.8 ? "💎" : kept <= 0.2 ? "📉" : "";
  return { text: `${fmt(held)} · kept ${Math.round(kept * 100)}%`, flair };
}

export function AnsemArmyView({
  snap,
  loading,
  ansemPriceUsd,
}: {
  snap: AirdropSnapshot;
  loading: boolean;
  ansemPriceUsd: number | null;
}) {
  const [query, setQuery] = useState("");
  const [limit, setLimit] = useState(50);
  const view = armyRows(snap.recipients, query, limit);

  return (
    <div className="mt-5 space-y-4">
      <div>
        <h2 className="font-display text-2xl tracking-wide text-white sm:text-3xl" style={{ fontFamily: "var(--font-display)" }}>
          The Ansem Army <span className="align-middle">🐂🀄</span>
        </h2>
        <p className="mt-1 text-sm text-zinc-500">
          Every wallet The Black Bull dropped $ANSEM to — {fmt(snap.totals.uniqueRecipients)} strong and counting.
        </p>
      </div>

      <input
        type="text"
        inputMode="text"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setLimit(50);
        }}
        placeholder="Search any wallet…"
        aria-label="Search the Ansem Army by wallet address"
        className="w-full rounded-xl border border-white/[0.1] bg-white/[0.02] px-4 py-2.5 font-mono text-sm text-zinc-200 placeholder:text-zinc-600 focus:border-[var(--accent)]/50 focus:outline-none"
      />

      <div className="overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0a0a0b]">
        <ul aria-busy={loading} className="divide-y divide-white/[0.05]">
          {loading ? (
            <li className="px-4 py-3 text-sm text-zinc-500">Loading the Army…</li>
          ) : view.total === 0 ? (
            <li className="px-4 py-3 text-sm text-zinc-500">
              {query ? `No wallet matches “${query}” in the Army yet.` : "No recipients to show yet."}
            </li>
          ) : (
            view.rows.map((r) => {
              const top3 = r.rank <= 3;
              const usd = ansemPriceUsd != null ? r.totalAnsemUi * ansemPriceUsd : null;
              const hold = holdingLabel(r.heldAnsemUi, r.totalAnsemUi);
              return (
                <li key={r.wallet}>
                  <a
                    href={solscan(r.wallet)}
                    target="_blank"
                    rel="noreferrer"
                    className={`flex items-center gap-3 px-4 py-2.5 transition hover:bg-white/[0.02] ${top3 ? "bg-[var(--accent)]/[0.04]" : ""}`}
                  >
                    <span
                      className={`flex w-12 shrink-0 items-center gap-1 font-mono text-sm ${top3 ? "text-[var(--accent-soft)]" : "text-zinc-500"}`}
                    >
                      {top3 ? "🀄" : ""}#{r.rank}
                    </span>
                    <span className="flex-1 truncate font-mono text-sm text-zinc-200">{short(r.wallet)}</span>
                    <span className="hidden w-40 shrink-0 text-right font-mono text-sm text-zinc-300 sm:block">
                      {fmt(r.totalAnsemUi)} {usd != null && <span className="text-zinc-500">≈ {compactUsd(usd)}</span>}
                    </span>
                    <span className="hidden w-16 shrink-0 text-right text-xs text-zinc-500 sm:block">
                      {r.transferCount} drop{r.transferCount === 1 ? "" : "s"}
                    </span>
                    <span className="w-36 shrink-0 text-right text-xs text-zinc-400">
                      {hold.text} {hold.flair}
                    </span>
                    <span className="shrink-0 text-zinc-600">↗</span>
                  </a>
                </li>
              );
            })
          )}
        </ul>
        {!loading && view.hasMore && (
          <button
            type="button"
            onClick={() => setLimit((l) => l + 50)}
            className="w-full border-t border-white/[0.06] px-4 py-3 text-sm text-[var(--accent-soft)] transition hover:bg-white/[0.03]"
          >
            Load more (+{Math.min(50, view.total - view.shown)})
          </button>
        )}
      </div>

      <p className="text-xs text-zinc-600">
        Holdings shown for the top 50 by airdrop size, as of the last refresh. “—” = not tracked.
      </p>
    </div>
  );
}
```

- [ ] **Step 2: Type/lint check builds** (component is wired in Task 5; verify it at least compiles by building there). For now:

Run: `pnpm typecheck`
Expected: no errors from `AnsemArmyView.tsx` (unused-import warnings are fine until Task 5 mounts it — but `pnpm lint` may flag the file as unused; that resolves in Task 5, so commit Task 4+5 together if lint blocks).

- [ ] **Step 3: Commit:**

```bash
git add src/components/AnsemArmyView.tsx
git commit -m "feat: AnsemArmyView — ranked leaderboard with search, load-more, holdings"
```

---

### Task 5: Wire the 3rd tab into `Tabs.tsx`

**Files:**
- Modify: `src/components/Tabs.tsx`

**Interfaces:**
- Consumes: `AnsemArmyView` from `./AnsemArmyView`.
- Produces: a working 3-tab UI (Airdrop Web · Ansem Army · Creator Rewards).

- [ ] **Step 1: Import the view.** In `src/components/Tabs.tsx`, after `import { AirdropWebView } from "./AirdropWebView";` add:

```ts
import { AnsemArmyView } from "./AnsemArmyView";
```

- [ ] **Step 2: Widen the tab state.** Change:

```ts
  const [tab, setTab] = useState<"web" | "rewards">("web");
```

to:

```ts
  const [tab, setTab] = useState<"web" | "army" | "rewards">("web");
```

- [ ] **Step 3: Add the Ansem Army tab button.** In the `role="tablist"` block, between the `tab-web` button and the `tab-rewards` button, insert:

```tsx
        <button
          id="tab-army"
          role="tab"
          aria-selected={tab === "army"}
          aria-controls="panel-army"
          onClick={() => setTab("army")}
          className={`rounded-full px-4 py-1.5 transition ${tab === "army" ? "bg-[var(--accent)] text-white" : "text-zinc-400 hover:text-zinc-200"}`}
        >
          Ansem Army
        </button>
```

- [ ] **Step 4: Add the panel.** Between the `panel-web` div and the `panel-rewards` div, insert:

```tsx
      <div
        id="panel-army"
        role="tabpanel"
        aria-labelledby="tab-army"
        tabIndex={0}
        className={tab === "army" ? "" : "hidden"}
      >
        <AnsemArmyView snap={snap} loading={loading} ansemPriceUsd={ansemPriceUsd} />
      </div>
```

- [ ] **Step 5: Verify the whole project:**

Run: `pnpm verify`
Expected: green (boundary, lint, typecheck, tests, build all pass).

- [ ] **Step 6: Visual check (desktop + ~390px).** Run the app (`pnpm dev`), open the Ansem Army tab: ranked list renders, top 3 show 🀄 + tint, search filters and preserves rank, "Load more" adds 50, rows link to Solscan, holdings show for top rows / "—" below, header shows 🐂🀄. Check 390px layout.

- [ ] **Step 7: Commit:**

```bash
git add src/components/Tabs.tsx
git commit -m "feat: mount the Ansem Army tab (Airdrop Web · Ansem Army · Creator Rewards)"
```

---

## Self-Review

**Spec coverage:** §1 view + holdings → Tasks 2,4 + 1,3. §3 locked decisions → placement (T5), row→Solscan (T4), search+load-more (T4), global rank (T2), holdings top-50 (T1,T3), mint-exact (T1). §4 heldAnsemUi → T1. §4b holdings collection → T1 (sumOwnerAnsem/getAnsemBalances) + T3 (collector, fail-soft). §5 armyRows → T2. §6 component → T4 + T5. §7 visual (🐂🀄, top-3 🀄, Holding cell, mobile) → T4. §8 tests → T1 (sumOwnerAnsem), T2 (armyRows). All covered.

**Placeholder scan:** No TBD/TODO; every code step has complete code; commands have expected output.

**Type consistency:** `heldAnsemUi?: number` defined in T1 (snapshot type), carried in `ArmyRow` (T2), read in `AnsemArmyView` (T4). `armyRows(recipients, query, limit)` signature identical in T2 and its call site in T4. `getAnsemBalances(wallets) → Map<string,number>` defined T1, used T3. `short` already exported from airdrop-view (used by AirdropFeed). Consistent.
