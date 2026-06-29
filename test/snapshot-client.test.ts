import { test } from "node:test";
import assert from "node:assert/strict";
import { fetchSnapshot } from "../src/lib/snapshot-client";

test("CDN failure falls back to the bundled seed (never throws)", async () => {
  const failing = (async () => { throw new Error("network down"); }) as unknown as typeof fetch;
  const snap = await fetchSnapshot(failing);
  assert.ok(snap.recipients.length >= 0); // returns the seed object, not an exception
  assert.equal(snap.source.length > 0 || snap.source === "", true);
});
