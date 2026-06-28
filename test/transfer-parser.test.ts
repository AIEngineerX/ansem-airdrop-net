import assert from "node:assert/strict";
import test from "node:test";
import { ANSEM_MINT, NATIVE_SOL_MINT, PRIMARY_SOURCE_WALLET } from "../src/lib/domain";
import { parseOutgoingTransfers, type HeliusTransaction } from "../src/lib/transfer-parser";

const recipientA = "11111111111111111111111111111112";
const recipientB = "11111111111111111111111111111113";

const fixture: HeliusTransaction[] = [
  {
    signature: "sig-ok",
    slot: 10,
    timestamp: 1_700_000_000,
    nativeTransfers: [
      { fromUserAccount: PRIMARY_SOURCE_WALLET, toUserAccount: recipientA, amount: 1_500_000_000 },
    ],
    tokenTransfers: [
      {
        fromUserAccount: PRIMARY_SOURCE_WALLET,
        toUserAccount: recipientA,
        mint: ANSEM_MINT,
        tokenAmount: 42,
        rawTokenAmount: { tokenAmount: "42000000", decimals: 6 },
        tokenStandard: "FungibleToken2022",
      },
      {
        fromUserAccount: PRIMARY_SOURCE_WALLET,
        toUserAccount: recipientB,
        mint: ANSEM_MINT,
        tokenAmount: 42,
        rawTokenAmount: { tokenAmount: "42000000", decimals: 6 },
        tokenStandard: "FungibleToken2022",
      },
    ],
  },
  {
    signature: "sig-failed",
    timestamp: 1_700_000_001,
    transactionError: { InstructionError: [0, "Custom"] },
    nativeTransfers: [
      { fromUserAccount: PRIMARY_SOURCE_WALLET, toUserAccount: recipientA, amount: 2_000_000_000 },
    ],
  },
];

test("parses outgoing SOL and ANSEM transfers from the source wallet", () => {
  const result = parseOutgoingTransfers(fixture, PRIMARY_SOURCE_WALLET);
  assert.equal(result.transfers.length, 3);
  assert.equal(result.transfers[0].mint, NATIVE_SOL_MINT);
  assert.equal(result.transfers[0].amountUi, 1.5);
  assert.equal(result.transfers[1].mint, ANSEM_MINT);
  assert.equal(result.transfers[1].transferType, "token_2022");
});

test("excludes failed transactions", () => {
  const result = parseOutgoingTransfers(fixture, PRIMARY_SOURCE_WALLET);
  assert.equal(result.transfers.some((row) => row.signature === "sig-failed"), false);
});

test("keeps batched same-amount token sends distinct with event index", () => {
  const result = parseOutgoingTransfers(fixture, PRIMARY_SOURCE_WALLET);
  const ansemRows = result.transfers.filter((row) => row.mint === ANSEM_MINT);
  assert.equal(ansemRows.length, 2);
  assert.notEqual(ansemRows[0].id, ansemRows[1].id);
});
