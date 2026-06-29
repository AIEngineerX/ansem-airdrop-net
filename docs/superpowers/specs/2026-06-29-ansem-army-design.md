# Ansem Army — design spec

**Date:** 2026-06-29
**Status:** Approved (brainstorming) — pending plan

## 1. What this is

A new **"Ansem Army"** tab: a branded, ranked leaderboard of **every** wallet that
GV6U airdropped $ANSEM to. The Airdrop Web graph only renders the top ~300 (120 on
mobile); this list shows the full roster (703+ and growing), searchable. It also shows,
**for the top 50 recipients**, how much $ANSEM each still holds on-chain (did they keep
or sell). It is largely a new *view* of snapshot data, plus one new collector step
(live balances for the top 50).

## 2. Definition of done

Done when, on the deployed site:
- A 3rd tab **Airdrop Web · Ansem Army · Creator Rewards** renders the leaderboard.
- Rows are ranked by $ANSEM received (desc); top 3 are visually elevated with the
  red-dragon 🀄; the header carries 🐂🀄.
- Each row shows rank, mono wallet, $ANSEM received (+ live ≈USD), # drops, **Holding**
  (current $ANSEM + % kept, top 50 only; "—" beyond), and the whole row links to the
  wallet on Solscan (new tab).
- A search box filters across **all** recipients by wallet substring; the list starts
  at the top 50 with a **Load more (+50)** control; an active search shows all matches.
- The collector populates `heldAnsemUi` for the top 50 recipients each run.
- Works on desktop and ~390px mobile.
- `pnpm verify` green; the pure helpers (`armyRows`, `sumOwnerAnsem`) are unit-tested.

## 3. Locked decisions (do not drift)

- **Placement:** its own 3rd tab (not a section, not merged into the feed).
- **Row interaction:** whole row click → `https://solscan.io/account/<wallet>` in a new
  tab. No graph-jump, no inline expansion.
- **Scale:** search box + "Load more (+50)", initial 50. No pagination, no virtualization.
- **Ranking is global:** a wallet's rank is its position in the full $ANSEM-desc list and
  is preserved while searching (searching never re-ranks the matches).
- **Holdings depth = top 50.** Live $ANSEM balances are fetched only for the 50 biggest
  recipients (bounds RPC cost on the free key). Rows beyond #50 show "—" for Holding.
- **Read-only:** no wallet connect / signing / execution (inherits the site boundary).
- **Mint-exact:** balances are read for the ANSEM mint only (`9cRCn9…pump`), never by symbol.

## 4. Data

Source: the client `snap.recipients` already held by `Tabs` (populated by `fetchSnapshot`).
`foldTransfers` already returns `recipients` sorted by `totalAnsemUi` descending, so
rank = index + 1. USD = `totalAnsemUi * ansemPriceUsd` (omit when `ansemPriceUsd` is null).

`AirdropRecipient` fields used: `wallet`, `totalAnsemUi`, `transferCount`, `latestSeen`.
**New optional field:** `heldAnsemUi?: number` — current on-chain $ANSEM balance, set by
the collector for the top 50 recipients only. `undefined` = not tracked (show "—");
`0` = tracked and fully sold (show "0", 📉).

## 4b. Holdings collection (collector + new module)

New module **`src/lib/holdings.ts`**:
- `sumOwnerAnsem(accounts): number` — **pure**: given the `getTokenAccountsByOwner`
  jsonParsed result for one owner, sum `account.data.parsed.info.tokenAmount.uiAmount`
  across that owner's ANSEM token accounts (0 accounts → 0). Unit-tested with a fixture.
- `getAnsemBalances(wallets: string[]): Promise<Map<string, number>>` — RPC: batches
  `getTokenAccountsByOwner(owner, { mint: ANSEM_MINT }, { encoding: "jsonParsed" })`
  through the existing `rpcBatch` (reuse `rpc-source.ts` throttle/backoff; ~25 owners
  per HTTP batch, so 50 wallets ≈ 2 requests). Returns `wallet → uiAmount` via
  `sumOwnerAnsem`.

Collector (`scripts/collect-snapshot.ts`), after `foldTransfers`:
```
const top = next.recipients.slice(0, 50).map(r => r.wallet);
const held = await getAnsemBalances(top);
next.recipients = next.recipients.map(r =>
  held.has(r.wallet) ? { ...r, heldAnsemUi: held.get(r.wallet)! } : r);
```
Runs every collection (holdings refresh follows the run cadence). If `getAnsemBalances`
throws, log and write the snapshot **without** holdings rather than failing the run
(holdings are enrichment, not core truth).

Seed: the committed `public/snapshot.seed.json` may omit `heldAnsemUi` (Army shows "—");
the live `data` branch carries it. Optionally regenerate the seed once with holdings.

## 5. Pure helper (testable, in `src/lib/airdrop-view.ts`)

```ts
export type ArmyRow = {
  rank: number;            // 1-based position in the full ranked list
  wallet: string;
  totalAnsemUi: number;
  transferCount: number;
  latestSeen: string;
  heldAnsemUi?: number;    // undefined beyond the top 50
};
export type ArmyView = { rows: ArmyRow[]; shown: number; total: number; hasMore: boolean };

// recipients MUST already be sorted by totalAnsemUi desc (snapshot guarantees this).
// query: trimmed, case-insensitive substring match on wallet ("" = no filter).
// limit: max rows to return (the "load more" window).
export function armyRows(recipients: AirdropRecipient[], query: string, limit: number): ArmyView;
```

Behaviour:
- Assign `rank = i + 1` from the **unfiltered** order first; carry `heldAnsemUi` through.
- Filter by `query` (case-insensitive substring on `wallet`); ranks are preserved.
- `total` = filtered count; `rows` = first `limit` of the filtered set; `shown` =
  `rows.length`; `hasMore` = `total > limit`.

## 6. Component plan

- **`src/components/AnsemArmyView.tsx`** (new, client): renders header + search input +
  leaderboard + Load-more. Local state: `query` (string), `limit` (number, default 50,
  +50 per Load-more; reset to 50 when query changes). Calls `armyRows(snap.recipients,
  query, limit)`. Columns: rank · `short(wallet)` · `totalAnsemUi` (+≈USD) · # drops ·
  **Holding** (`heldAnsemUi` formatted + `kept = heldAnsemUi/totalAnsemUi` as %, or "—"
  when `heldAnsemUi` is undefined) · `↗`. Loading mirrors the feed; empty-search state:
  "No wallet matches '…' in the Army yet."
- **`src/components/Tabs.tsx`** (modify): add a 3rd tab button `Ansem Army` (id `tab-army`,
  `aria-controls="panel-army"`) between Web and Rewards; add the panel rendering
  `<AnsemArmyView snap={snap} loading={loading} ansemPriceUsd={ansemPriceUsd} />`. All three
  panels stay mounted (CSS toggle), consistent with current behaviour.

No server-page changes; `page.tsx` already passes `ansemPriceUsd` into `Tabs`.

## 7. Visual / brand

- Theme matches the rest: black `#0a0a0b`, oxblood `--accent`/`--accent-soft`, inherited
  `.grain`.
- **Header:** "The Ansem Army 🐂🀄" + "Every wallet The Black Bull dropped $ANSEM to —
  {N} strong and counting." + the two stats (wallets, total $ANSEM ≈USD).
- **Top 3 rows:** ember glow + red-dragon 🀄 on the rank badge (echoing the graph's hot
  nodes). Ranks 4+ get a plain muted rank.
- **Holding cell:** show held $ANSEM + "kept X%"; a 💎 when kept ≥ ~80%, 📉 when ≤ ~20%,
  neutral otherwise; "—" when untracked (beyond top 50). `kept` may exceed 100% (bought
  more) — show the real number.
- Row hover: subtle border/translate lift; `↗` signals the Solscan link.
- **Mobile (<640px):** rank + wallet on line 1; amount + holding on line 2; drops/date
  condensed; the row stays a single tappable link.

## 8. Tests (TDD)

- **`sumOwnerAnsem`** (new, `test/holdings.test.ts`) with a captured/crafted
  `getTokenAccountsByOwner` fixture: multiple ANSEM accounts sum correctly; zero accounts
  → 0; a single account → its uiAmount. (Pure parse; no network.)
- **`armyRows`** (`test/airdrop-view.test.ts`, extend): empty query → top `limit`, `rank`
  starts at 1, `hasMore` reflects `total > limit`; query filters by wallet substring
  (case-insensitive) and **preserves global rank**; no-match → empty/`total:0`;
  `limit >= total` → all rows, `hasMore:false`; `heldAnsemUi` carries through.
- `getAnsemBalances` is verified by the live collector run (integration), not a unit test.

## 9. Out of scope (YAGNI)

Column-sorting toggles, CSV export, per-wallet detail drawer, graph-jump on click,
pagination, virtualization, holdings for >50 wallets, holdings history/sparklines,
server-side anything. Add only by editing this spec first.

## 10. Anti-drift

A read-only leaderboard over the existing snapshot plus one bounded enrichment step
(top-50 live balances, mint-exact, fail-soft). No new write path, no wallet interaction.
Keep `armyRows`/`sumOwnerAnsem` pure and the component thin.
