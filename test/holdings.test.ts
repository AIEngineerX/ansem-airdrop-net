import assert from "node:assert/strict";
import test from "node:test";
import { sumOwnerAnsem } from "../src/lib/holdings";

const acct = (uiAmount: number | null) => ({
  account: { data: { parsed: { info: { tokenAmount: { uiAmount } } } } },
});

test("sumOwnerAnsem sums uiAmount across an owner's ANSEM token accounts", () => {
  assert.equal(sumOwnerAnsem({ value: [acct(1000.5), acct(250)] }), 1250.5);
});

test("sumOwnerAnsem returns 0 for an owner with no ANSEM accounts", () => {
  assert.equal(sumOwnerAnsem({ value: [] }), 0);
});

test("sumOwnerAnsem treats null/missing/garbage as 0", () => {
  assert.equal(sumOwnerAnsem(null), 0);
  assert.equal(sumOwnerAnsem({}), 0);
  assert.equal(sumOwnerAnsem({ value: [acct(null)] }), 0);
});
