import { test } from "node:test";
import assert from "node:assert/strict";
import { backoffDelayMs } from "../src/lib/rpc-source";

test("backoff grows exponentially and is capped", () => {
  assert.equal(backoffDelayMs(0), 500);
  assert.equal(backoffDelayMs(1), 1000);
  assert.equal(backoffDelayMs(2), 2000);
  assert.equal(backoffDelayMs(3), 4000);
  assert.equal(backoffDelayMs(10), 8000); // capped
});
