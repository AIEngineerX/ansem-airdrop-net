#!/usr/bin/env tsx
import { writeFile, mkdir } from "node:fs/promises";
import { PRIMARY_SOURCE_WALLET, ANSEM_MINT } from "../src/lib/domain";
import type { RpcGetTransaction } from "../src/lib/rpc-types";

const RPC =
  process.env.HELIUS_RPC_URL ??
  `https://mainnet.helius-rpc.com/?api-key=${process.env.HELIUS_API_KEY}`;

async function rpc(method: string, params: unknown[]) {
  const res = await fetch(RPC, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
  });
  const json = await res.json();
  if (json.error) throw new Error(`${method}: ${JSON.stringify(json.error)}`);
  return json.result;
}

function classify(tx: RpcGetTransaction, wallet: string) {
  const ix = [
    ...(tx.transaction.message.instructions ?? []),
    ...(tx.meta?.innerInstructions ?? []).flatMap((g) => g.instructions),
  ];
  const isFailed = Boolean(tx.meta?.err);
  const hasALT = (tx.transaction.message.accountKeys ?? []).some((k) => k.source === "lookupTable");
  const hasInner = (tx.meta?.innerInstructions?.length ?? 0) > 0;
  const ansem2022 = ix.some(
    (i) =>
      (i.program === "spl-token-2022" || i.program === "spl-token") &&
      (i.parsed?.type === "transfer" || i.parsed?.type === "transferChecked") &&
      ((i.parsed?.info as Record<string, unknown>)?.mint === ANSEM_MINT),
  );
  const nativeOut = ix.some(
    (i) =>
      i.program === "system" &&
      i.parsed?.type === "transfer" &&
      (i.parsed?.info as Record<string, unknown>)?.source === wallet,
  );
  const createsAcct = ix.some((i) =>
    /create|initializeAccount|createIdempotent/i.test(i.parsed?.type ?? ""),
  );
  const tokenTransfers = ix.filter(
    (i) =>
      (i.program === "spl-token" || i.program === "spl-token-2022") &&
      (i.parsed?.type === "transfer" || i.parsed?.type === "transferChecked"),
  ).length;
  return { isFailed, hasALT, hasInner, ansem2022, nativeOut, createsAcct, tokenTransfers };
}

async function main() {
  if (!process.env.HELIUS_API_KEY && !process.env.HELIUS_RPC_URL) {
    throw new Error("Set HELIUS_API_KEY (or HELIUS_RPC_URL) — put it in .env and run with node --env-file=.env");
  }
  await mkdir("test/fixtures", { recursive: true });
  const sigs: Array<{ signature: string }> = await rpc("getSignaturesForAddress", [
    PRIMARY_SOURCE_WALLET,
    { limit: 100 },
  ]);

  const index: Record<string, ReturnType<typeof classify>> = {};
  let saved = 0;
  for (const { signature } of sigs) {
    const tx = (await rpc("getTransaction", [
      signature,
      { encoding: "jsonParsed", maxSupportedTransactionVersion: 0 },
    ])) as RpcGetTransaction | null;
    if (!tx) continue;
    const name = `raw-${signature.slice(0, 16)}.json`;
    await writeFile(`test/fixtures/${name}`, JSON.stringify(tx, null, 2));
    index[name] = classify(tx, PRIMARY_SOURCE_WALLET);
    saved++;
  }
  await writeFile("test/fixtures/_index.json", JSON.stringify(index, null, 2));
  console.log(`Saved ${saved} raw transactions + _index.json to test/fixtures/`);
}
main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exitCode = 1;
});
