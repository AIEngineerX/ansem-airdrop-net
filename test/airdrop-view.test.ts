import { test } from "node:test";
import assert from "node:assert/strict";
import { armyRows, buildGraphModel, lookupRecipient, timeAgo } from "../src/lib/airdrop-view";
import { EMPTY_SNAPSHOT, type AirdropSnapshot } from "../src/lib/airdrop-snapshot";

function snapWith(n: number): AirdropSnapshot {
  const recipients = Array.from({ length: n }, (_, i) => ({
    wallet: `R${i}`, totalAnsemUi: n - i, transferCount: 1,
    firstSeen: "2026-06-29T12:00:00.000Z", latestSeen: "2026-06-29T12:00:00.000Z",
    latestSignature: `s${i}`, signatures: [`s${i}`],
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

test("lookup is whitespace-trim exact and returns null on miss", () => {
  const snap = snapWith(3);
  assert.equal(lookupRecipient(snap, "R1")!.wallet, "R1");
  assert.equal(lookupRecipient(snap, "  R1  ")!.wallet, "R1");
  assert.equal(lookupRecipient(snap, "nope"), null);
  assert.equal(lookupRecipient(snap, "r1"), null); // case-sensitive base58 — lowercase must not match
});

test("timeAgo renders coarse buckets", () => {
  const now = Date.parse("2026-06-29T12:00:00.000Z");
  assert.equal(timeAgo("2026-06-29T11:59:30.000Z", now), "30s ago");
  assert.equal(timeAgo("2026-06-29T11:30:00.000Z", now), "30m ago");
  assert.equal(timeAgo("2026-06-29T09:00:00.000Z", now), "3h ago");
});

const rec = (wallet: string, totalAnsemUi: number, heldAnsemUi?: number) => ({
  wallet,
  totalAnsemUi,
  transferCount: 1,
  firstSeen: "2026-06-28T00:00:00.000Z",
  latestSeen: "2026-06-28T00:00:00.000Z",
  latestSignature: "sig" + wallet,
  signatures: ["sig" + wallet],
  ...(heldAnsemUi === undefined ? {} : { heldAnsemUi }),
});
// already sorted desc by totalAnsemUi
const RECIPS = [rec("AAA1", 100, 90), rec("BBB2", 50, 0), rec("AAA3", 10)];

test("armyRows: empty query returns top `limit`, ranks from 1, hasMore set", () => {
  const v = armyRows(RECIPS, "", 2);
  assert.equal(v.total, 3);
  assert.equal(v.shown, 2);
  assert.deepEqual(
    v.rows.map((r) => r.rank),
    [1, 2],
  );
  assert.equal(v.rows[0].wallet, "AAA1");
  assert.equal(v.rows[0].heldAnsemUi, 90);
  assert.equal(v.hasMore, true);
});

test("armyRows: query filters by wallet substring (case-insensitive) and preserves global rank", () => {
  const v = armyRows(RECIPS, "aaa", 50);
  assert.deepEqual(
    v.rows.map((r) => r.wallet),
    ["AAA1", "AAA3"],
  );
  assert.deepEqual(
    v.rows.map((r) => r.rank),
    [1, 3],
  ); // global ranks, not 1,2
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
