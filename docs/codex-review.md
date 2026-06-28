Reviewed read-only. No files changed, no secrets used.

**Verdict**
The utility is clean as a narrow transparency ledger. It preserves the no wallet-connect/no signing/no trading boundary well ([line 5](/Users/ghost/.hermes/profiles/chaos/trading/reports/zeus_handoff_ansem_airdrop_dashboard_20260628.md:5), [line 639](/Users/ghost/.hermes/profiles/chaos/trading/reports/zeus_handoff_ansem_airdrop_dashboard_20260628.md:639)). It is not scaffold-clean yet because the full report still mixes v0 scope with future X matching, graphing, clustering, and at-transfer valuation.

**Would Ansem Like It**
Likely yes if it ships as “this tracked wallet sent X” rather than “Ansem sent X.” The report understands that distinction ([line 739](/Users/ghost/.hermes/profiles/chaos/trading/reports/zeus_handoff_ansem_airdrop_dashboard_20260628.md:739)). He may dislike it if it overstates attribution, exposes X handles beside received value, or labels recipients as suspicious.

**Design/Taste Notes**
Table-first, audit-tool UI is the right direction. Start with wallet, confidence, last indexed time, unparsed count, and current price timestamp. Avoid a big crypto-stat hero or generic metric-card grid.

Rename “Live Transfers” to “Recent transfers” unless there is true push/live behavior. Hide at-transfer and source-cluster toggles in v0 if they are not backed by data.

The taste gate is strong: restrained dark product UI, quiet typography, no casino styling, no hype copy ([line 569](/Users/ghost/.hermes/profiles/chaos/trading/reports/zeus_handoff_ansem_airdrop_dashboard_20260628.md:569)).

**Product Risks**
Attribution copy is the biggest risk. “Associated with ansemconzimp / verified X” is a little too strong without direct wallet proof. Safer: “Public tracker and Pump.fun profile context link this wallet to ansemconzimp / @blknoiz06; no direct wallet post was found.”

X matching is socially risky. “X wallet mention matched” is acceptable; implying identity or ownership is not ([line 338](/Users/ghost/.hermes/profiles/chaos/trading/reports/zeus_handoff_ansem_airdrop_dashboard_20260628.md:338)).

“Suspicious repeated / farming pattern” should be removed. Use neutral labels like “repeat recipient” or “multiple receipts” ([line 515](/Users/ghost/.hermes/profiles/chaos/trading/reports/zeus_handoff_ansem_airdrop_dashboard_20260628.md:515)).

**Implementation Risks**
The dedupe spec conflicts with the scaffold prompt. Early schema uses `signature + source + recipient + mint + amount_raw`; later prompt correctly adds instruction/event index ([line 416](/Users/ghost/.hermes/profiles/chaos/trading/reports/zeus_handoff_ansem_airdrop_dashboard_20260628.md:416), [line 691](/Users/ghost/.hermes/profiles/chaos/trading/reports/zeus_handoff_ansem_airdrop_dashboard_20260628.md:691)). Fix the schema before scaffolding.

API/schema sections include future features that v0 defers: graph, X matches, webhook, match tables. Zeus could overbuild unless those are clearly marked future-only.

SQLite vs Postgres is unresolved. `BIGSERIAL` and `TIMESTAMPTZ` are Postgres choices; choose Postgres or rewrite for SQLite-safe types.

**Must-Fix Before V0**
Remove or clearly mark future-only: X collector, graph, candidate cluster, at-transfer toggle, `/api/graph`, `/api/x-matches`, webhook, `x_wallet_mentions`, `recipient_matches`.

Fix attribution copy to avoid implying confirmed wallet ownership.

Add `instruction_index` / `event_index` to `transfers` and the unique key.

Define parser fixture cases beyond one test: failed tx, batched transfer, same amount duplicate, Token-2022, native SOL fee exclusion, self-transfer/ATA noise.

Make v0 primary-wallet-only and current-value-only.

**Nice-To-Have Later**
X reply matching with strict disclaimers.

Candidate wallet clustering after evidence rules are proven.

Network graph after table accuracy is trusted.

At-transfer pricing with stored snapshots and confidence bands.

CSV/export or public JSON for community verification.