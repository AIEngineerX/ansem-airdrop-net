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
