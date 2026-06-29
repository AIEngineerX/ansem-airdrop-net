#!/usr/bin/env tsx
// Build/extend the AirdropSnapshot from GV6U's outgoing transfers.
// Usage: node --env-file=.env --import tsx scripts/collect-snapshot.ts --out public/snapshot.seed.json --max 1000 --mode backfill
import { readFileSync, writeFileSync } from "node:fs";
import { getOutgoingTransactions } from "../src/lib/rpc-source";
import { rawTxToHelius } from "../src/lib/rpc-adapter";
import { parseOutgoingTransfers } from "../src/lib/transfer-parser";
import { EMPTY_SNAPSHOT, foldTransfers, type AirdropSnapshot } from "../src/lib/airdrop-snapshot";
import { PRIMARY_SOURCE_WALLET } from "../src/lib/domain";

function arg(name: string, fallback?: string): string | undefined {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : fallback;
}

async function main() {
  const inPath = arg("--in");
  const outPath = arg("--out", "public/snapshot.seed.json")!;
  const max = Number(arg("--max", "1000"));
  const mode = arg("--mode", "incremental");
  const nowIso = new Date().toISOString();

  const prev: AirdropSnapshot = inPath
    ? { ...(JSON.parse(readFileSync(inPath, "utf8")) as AirdropSnapshot), source: PRIMARY_SOURCE_WALLET }
    : { ...EMPTY_SNAPSHOT, source: PRIMARY_SOURCE_WALLET };

  // incremental: only sigs newer than cursor.newest; backfill: older than oldestScanned
  const untilSignature = mode === "incremental" ? prev.cursors.newest : undefined;
  const { txs, newestSignature } = await getOutgoingTransactions({
    wallet: PRIMARY_SOURCE_WALLET,
    untilSignature,
    maxSignatures: max,
  });

  const helius = txs.map(rawTxToHelius);
  const { transfers } = parseOutgoingTransfers(helius, PRIMARY_SOURCE_WALLET);
  const oldest = txs.length ? txs[txs.length - 1].transaction.signatures[0] : prev.cursors.oldestScanned;
  const backfillComplete = mode === "backfill" ? txs.length < max : prev.backfillComplete;

  const next = foldTransfers(prev, transfers, {
    newestSignature: newestSignature ?? prev.cursors.newest,
    oldestScanned: oldest ?? null,
    backfillComplete,
    collectedAt: nowIso,
  });

  if (next.totals.totalAirdrops < prev.totals.totalAirdrops) throw new Error("refusing to write a regressed snapshot");
  writeFileSync(outPath, JSON.stringify(next, null, 2));
  console.log(`wrote ${outPath}: ${next.totals.uniqueRecipients} recipients, ${next.totals.totalAirdrops} airdrops, backfillComplete=${next.backfillComplete}, otherMints=${next.otherMintsSent.length}`);
}
main().catch((e) => { console.error(e instanceof Error ? e.message : e); process.exitCode = 1; });
