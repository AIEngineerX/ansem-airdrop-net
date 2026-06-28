#!/usr/bin/env tsx
import { readFile, writeFile } from "node:fs/promises";
import { parseOutgoingTransfers, type HeliusTransaction } from "../src/lib/transfer-parser";
import { PRIMARY_SOURCE_WALLET } from "../src/lib/domain";

type Args = {
  fixture?: string;
  out?: string;
  limit: number;
  sourceWallet: string;
};

function parseArgs(argv: string[]): Args {
  const args: Args = { limit: 100, sourceWallet: PRIMARY_SOURCE_WALLET };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--fixture") args.fixture = argv[++index];
    else if (arg === "--out") args.out = argv[++index];
    else if (arg === "--limit") args.limit = Number(argv[++index]);
    else if (arg === "--source-wallet") args.sourceWallet = argv[++index];
    else throw new Error(`Unknown argument: ${arg}`);
  }

  return args;
}

async function loadTransactions(args: Args): Promise<HeliusTransaction[]> {
  if (args.fixture) {
    const raw = await readFile(args.fixture, "utf8");
    return JSON.parse(raw) as HeliusTransaction[];
  }

  const apiKey = process.env.HELIUS_API_KEY;
  if (!apiKey) {
    throw new Error("HELIUS_API_KEY is required unless --fixture is provided");
  }

  const url = new URL(`https://api.helius.xyz/v0/addresses/${args.sourceWallet}/transactions`);
  url.searchParams.set("api-key", apiKey);
  url.searchParams.set("limit", String(args.limit));

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Helius request failed: ${response.status} ${response.statusText}`);
  }

  return (await response.json()) as HeliusTransaction[];
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const transactions = await loadTransactions(args);
  const result = parseOutgoingTransfers(transactions, args.sourceWallet);
  const payload = {
    sourceWallet: args.sourceWallet,
    collectedAt: new Date().toISOString(),
    transferCount: result.transfers.length,
    unparsedCount: result.unparsed.length,
    ...result,
  };

  const json = JSON.stringify(payload, null, 2);
  if (args.out) {
    await writeFile(args.out, `${json}\n`);
  } else {
    process.stdout.write(`${json}\n`);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
