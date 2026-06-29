import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { parseCreatorRewards, type RawFeeBucket, type RawFeeTotal } from "../src/lib/pump";

const total = JSON.parse(readFileSync("test/fixtures/pump-fees-total.json", "utf8")) as RawFeeTotal;
const series = JSON.parse(readFileSync("test/fixtures/pump-fees-series.json", "utf8")) as RawFeeBucket[];

test("parseCreatorRewards: total SOL + USD from real swap-api fixtures", () => {
  const r = parseCreatorRewards(total, series, 71);
  assert.ok(Math.abs(r.totalSol - 95.819193347) < 1e-6);
  assert.ok(r.totalUsd != null && Math.abs(r.totalUsd - 95.819193347 * 71) < 1e-3);
  assert.equal(r.username, "ansemconzimp");
  assert.equal(r.series.length, series.length);
  assert.ok(r.series.length > 50);
});

test("parseCreatorRewards: cumulative tracks total, trades + active window resolve", () => {
  const r = parseCreatorRewards(total, series, null);
  assert.equal(r.totalUsd, null);
  const lastCum = r.series[r.series.length - 1].cumulativeSol;
  assert.ok(Math.abs(lastCum - r.totalSol) < 0.5);
  assert.ok(r.totalTrades > 0);
  assert.ok(r.firstActive !== null && r.lastActive !== null);
});
