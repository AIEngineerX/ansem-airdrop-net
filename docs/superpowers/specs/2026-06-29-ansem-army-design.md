# Ansem Army — design spec

**Date:** 2026-06-29
**Status:** Approved (brainstorming) — pending plan

## 1. What this is

A new **"Ansem Army"** tab: a branded, ranked leaderboard of **every** wallet that
GV6U airdropped $ANSEM to. The Airdrop Web graph only renders the top ~300 (120 on
mobile); this list shows the full roster (703+ and growing), searchable. It is a new
*view* of data already in the snapshot — no new data pipeline.

## 2. Definition of done

Done when, on the deployed site:
- A 3rd tab **Airdrop Web · Ansem Army · Creator Rewards** renders the leaderboard.
- Rows are ranked by $ANSEM received (desc); top 3 are visually elevated with the
  red-dragon 🀄; the header carries 🐂🀄.
- Each row shows rank, mono wallet, $ANSEM (+ live ≈USD), # drops, last-seen, and the
  whole row links to the wallet on Solscan (new tab).
- A search box filters across **all** recipients by wallet substring; the list starts
  at the top 50 with a **Load more (+50)** control; an active search shows all matches.
- Works on desktop and ~390px mobile.
- `pnpm verify` green; the pure `armyRows` helper is unit-tested.

## 3. Locked decisions (do not drift)

- **Placement:** its own 3rd tab (not a section, not merged into the feed).
- **Row interaction:** whole row click → `https://solscan.io/account/<wallet>` in a new
  tab. No graph-jump, no inline expansion.
- **Scale:** search box + "Load more (+50)", initial 50. No pagination, no virtualization.
- **Ranking is global:** a wallet's rank is its position in the full $ANSEM-desc list and
  is preserved while searching (searching never re-ranks the matches).
- **Read-only:** no wallet connect / signing / execution (inherits the site boundary).

## 4. Data

Source: the client `snap.recipients` already held by `Tabs` (populated by `fetchSnapshot`).
`foldTransfers` already returns `recipients` sorted by `totalAnsemUi` descending, so
rank = index + 1. USD = `totalAnsemUi * ansemPriceUsd` (omit when `ansemPriceUsd` is null).

`AirdropRecipient` fields used: `wallet`, `totalAnsemUi`, `transferCount`, `latestSeen`
(and `firstSeen` available if needed). No new fields required in the snapshot.

## 5. Pure helper (testable, in `src/lib/airdrop-view.ts`)

```ts
export type ArmyRow = {
  rank: number;          // 1-based position in the full ranked list
  wallet: string;
  totalAnsemUi: number;
  transferCount: number;
  latestSeen: string;
};
export type ArmyView = { rows: ArmyRow[]; shown: number; total: number; hasMore: boolean };

// recipients MUST already be sorted by totalAnsemUi desc (snapshot guarantees this).
// query: trimmed, case-insensitive substring match on wallet ("" = no filter).
// limit: max rows to return (the "load more" window).
export function armyRows(recipients: AirdropRecipient[], query: string, limit: number): ArmyView;
```

Behaviour:
- Assign `rank = i + 1` from the **unfiltered** order first.
- Filter by `query` (case-insensitive substring on `wallet`); ranks are preserved.
- `total` = filtered count; `rows` = first `limit` of the filtered set; `shown` =
  `rows.length`; `hasMore` = `total > limit`.

## 6. Component plan

- **`src/components/AnsemArmyView.tsx`** (new, client): renders header + search input +
  leaderboard + Load-more. Local state: `query` (string), `limit` (number, default 50,
  +50 per Load-more; reset to 50 when query changes). Calls `armyRows(snap.recipients,
  query, limit)`. Reuses `short()` for wallet truncation. Loading state mirrors the feed
  (uses the `loading` prop); empty-search state: "No wallet matches '…' in the Army yet."
- **`src/components/Tabs.tsx`** (modify): add a 3rd tab button `Ansem Army` (id `tab-army`,
  `aria-controls="panel-army"`) between Web and Rewards; add the panel rendering
  `<AnsemArmyView snap={snap} loading={loading} ansemPriceUsd={ansemPriceUsd} />`. All three
  panels stay mounted (CSS toggle), consistent with current behaviour.

No server changes; `page.tsx` already passes `ansemPriceUsd` into `Tabs`.

## 7. Visual / brand

- Theme matches the rest: black `#0a0a0b`, oxblood `--accent`/`--accent-soft`, `.grain`
  inherited from `<body>`.
- **Header:** "The Ansem Army 🐂🀄" + "Every wallet The Black Bull dropped $ANSEM to —
  {N} strong and counting." + the two stats (wallets, total $ANSEM ≈USD).
- **Top 3 rows:** ember glow + red-dragon 🀄 on the rank badge (echoing the graph's hot
  nodes). Ranks 4+ get a plain muted rank.
- Row hover: subtle border/translate lift; `↗` affordance to signal the Solscan link.
- **Mobile (<640px):** rank + wallet on line 1; amount + drops on line 2; last-seen
  condensed or hidden; the row stays a single tappable link.

## 8. Tests (TDD)

Unit-test `armyRows` in `test/airdrop-view.test.ts` (extend existing):
- empty query → top `limit` rows, `rank` starts at 1, `hasMore` reflects `total > limit`.
- query filters by wallet substring (case-insensitive) and **preserves global rank**.
- no-match query → `rows: []`, `total: 0`, `hasMore: false`.
- `limit >= total` → all rows, `hasMore: false`.

No DOM/integration test required (the component is presentational over the tested helper).

## 9. Out of scope (YAGNI)

Column sorting toggles, CSV export, per-wallet detail drawer, graph-jump on click,
pagination, virtualization, server-side anything. Add only by editing this spec first.

## 10. Anti-drift

This tab is a read-only leaderboard over the existing snapshot. It introduces no new data
source, no write path, no wallet interaction. Keep `armyRows` pure and the component thin.
