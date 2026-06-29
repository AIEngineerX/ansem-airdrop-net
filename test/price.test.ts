import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { ANSEM_MINT } from "../src/lib/domain";
import { parseAnsemMarket, pickTopPair, solPriceFromPair, type DexPair } from "../src/lib/price";

const pairs = JSON.parse(readFileSync("test/fixtures/dexscreener-ansem.json", "utf8")) as DexPair[];

test("parseAnsemMarket: real DexScreener fixture -> token panel (mint-exact)", () => {
  const panel = parseAnsemMarket(pairs, "2026-06-29T00:00:00.000Z");
  assert.equal(panel.mint, ANSEM_MINT);
  assert.equal(panel.name, "The Black Bull");
  assert.ok(panel.priceUsd != null && panel.priceUsd > 0);
  assert.ok(panel.marketCapUsd != null && panel.marketCapUsd > 1_000_000);
  assert.ok(panel.liquidityUsd != null && panel.liquidityUsd > 0);
  assert.ok(panel.imageUrl?.startsWith("http"));
});

test("pickTopPair selects the highest-liquidity pair", () => {
  const decoy: DexPair = { liquidity: { usd: 1 }, priceUsd: "999" };
  const top = pickTopPair([...pairs, decoy]);
  assert.notEqual(top, decoy);
});

test("solPriceFromPair derives a sane SOL/USD from the ANSEM/SOL pair", () => {
  const sol = solPriceFromPair(pickTopPair(pairs));
  assert.ok(sol != null && sol > 10 && sol < 1000);
});
