#!/usr/bin/env tsx
// Fetch specific real txs as raw RpcGetTransaction JSON for fixtures.
// Usage: node --env-file=.env --import tsx scripts/capture-fixtures.ts
import { writeFileSync, mkdirSync } from "node:fs";
import { rpcUrl } from "../src/lib/rpc-source";

const SIGS: Record<string, string> = {
  "airdrop-multi": "5jM5PDMXQ136TuBWkjQ6WkFfizvAySzpoDsENT1yuvKqBzpDUh5h637yxLgq8RBZQrwGjDqSEbXGMz3Uih5TuMR9",
  "airdrop-single": "5URkAZ8oSa8BZLYcGCJ1TGw6mENYVuYS3XPoeaUjJhJF7kRLiusGh2U4Ei3En5LRB7xYWSmazSz9q6PtTzVdUNNW",
  "incoming-other": "GYrLxwrhFRc5EDNut2LWRKKD7USESW26eUDXMcK3jpSMLeaq2x1oUjMwo4MGbqMWGgwbxfpyr34So1t3KwtpjQZ",
};

async function getTx(url: string, sig: string): Promise<unknown> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0", id: 1, method: "getTransaction",
      params: [sig, { encoding: "jsonParsed", maxSupportedTransactionVersion: 0 }],
    }),
  });
  if (!res.ok) throw new Error(`RPC ${res.status}`);
  const json = (await res.json()) as { result?: unknown; error?: unknown };
  if (json.error) throw new Error(JSON.stringify(json.error));
  return json.result;
}

async function main() {
  const url = rpcUrl();
  mkdirSync("test/fixtures", { recursive: true });
  for (const [name, sig] of Object.entries(SIGS)) {
    const result = await getTx(url, sig);
    writeFileSync(`test/fixtures/${name}.json`, JSON.stringify(result, null, 2));
    console.log(`wrote test/fixtures/${name}.json`);
    await new Promise((r) => setTimeout(r, 1500)); // throttle: avoid free-tier 429
  }
}
main().catch((e) => { console.error(e instanceof Error ? e.message : e); process.exitCode = 1; });
