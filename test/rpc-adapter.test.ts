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
