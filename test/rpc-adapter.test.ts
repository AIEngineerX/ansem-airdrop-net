import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { rawTxToHelius } from "../src/lib/rpc-adapter";
import { parseOutgoingTransfers } from "../src/lib/transfer-parser";
import { ANSEM_MINT, NATIVE_SOL_MINT, PRIMARY_SOURCE_WALLET } from "../src/lib/domain";
import type { RpcGetTransaction } from "../src/lib/rpc-types";

// Minimal synthetic spl-token tx where destination account is NOT in pre/postTokenBalances
// so dstOwner resolves to undefined — the adapter must skip it cleanly (FIX 2).
const txWithUnresolvableDstOwner: RpcGetTransaction = {
  slot: 1,
  blockTime: 1751000000,
  meta: {
    err: null,
    fee: 5000,
    preBalances: [10000000, 1000000, 0],
    postBalances: [9995000, 0, 0],
    preTokenBalances: [
      {
        accountIndex: 1,
        mint: ANSEM_MINT,
        owner: PRIMARY_SOURCE_WALLET,
        uiTokenAmount: { amount: "1000000", decimals: 6, uiAmount: 1, uiAmountString: "1" },
      },
    ],
    postTokenBalances: [
      {
        accountIndex: 1,
        mint: ANSEM_MINT,
        owner: PRIMARY_SOURCE_WALLET,
        uiTokenAmount: { amount: "0", decimals: 6, uiAmount: 0, uiAmountString: "0" },
      },
      // accountIndex 2 (destination) deliberately absent → dstOwner = undefined
    ],
  },
  transaction: {
    signatures: ["testSigUnresolvableDst"],
    message: {
      accountKeys: [
        { pubkey: PRIMARY_SOURCE_WALLET, signer: true, writable: true },
        { pubkey: "SrcTokenAcct111111111111111111111111111111111", signer: false, writable: true },
        { pubkey: "DstTokenAcct111111111111111111111111111111111", signer: false, writable: true },
        { pubkey: ANSEM_MINT, signer: false, writable: false },
        { pubkey: "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA", signer: false, writable: false },
      ],
      instructions: [
        {
          program: "spl-token",
          parsed: {
            type: "transferChecked",
            info: {
              source: "SrcTokenAcct111111111111111111111111111111111",
              destination: "DstTokenAcct111111111111111111111111111111111",
              authority: PRIMARY_SOURCE_WALLET,
              mint: ANSEM_MINT,
              tokenAmount: { amount: "1000000", decimals: 6, uiAmount: 1 },
            },
          },
        },
      ],
    },
  },
};

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

test("spl-token transfer with unresolvable destination owner is skipped cleanly — no malformed incomplete entry", () => {
  const helius = rawTxToHelius(txWithUnresolvableDstOwner);
  const { transfers, unparsed } = parseOutgoingTransfers([helius], PRIMARY_SOURCE_WALLET);
  assert.equal(transfers.length, 0);
  // must NOT produce an "incomplete token transfer" — adapter must discard it, not pass it through
  assert.ok(!unparsed.some((u) => u.reason.includes("incomplete")), `got unexpected unparsed: ${JSON.stringify(unparsed)}`);
});
