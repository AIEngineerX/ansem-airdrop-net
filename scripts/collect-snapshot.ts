#!/usr/bin/env tsx
// Build/extend the AirdropSnapshot from GV6U's outgoing transfers.
// Modes:
//   sync (default for CI) — incremental pass + one backfill chunk in a single invocation
//   incremental           — only sigs newer than cursors.newest (manual use)
//   backfill              — one chunk older than cursors.oldestScanned (manual use)
//
// Usage examples:
//   node --env-file=.env --import tsx scripts/collect-snapshot.ts --in prev.json --out snapshot.json --mode sync --max 1000
//   node --env-file=.env --import tsx scripts/collect-snapshot.ts --out snapshot.json --mode backfill --max 1000
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
  const mode = arg("--mode", "sync");
  const nowIso = new Date().toISOString();

  const prev: AirdropSnapshot = inPath
    ? { ...(JSON.parse(readFileSync(inPath, "utf8")) as AirdropSnapshot), source: PRIMARY_SOURCE_WALLET }
    : { ...EMPTY_SNAPSHOT, source: PRIMARY_SOURCE_WALLET };

  if (mode === "sync") {
    // 1. Incremental pass: fetch sigs newer than prev.newest (captures new airdrops)
    const incResult = await getOutgoingTransactions({
      wallet: PRIMARY_SOURCE_WALLET,
      untilSignature: prev.cursors.newest,
      maxSignatures: max,
    });

    // 2. Backfill chunk: fetch sigs older than prev.oldestScanned (extends history)
    let bfResult: { txs: typeof incResult.txs; newestSignature: string | null } = {
      txs: [],
      newestSignature: null,
    };
    if (!prev.backfillComplete) {
      bfResult = await getOutgoingTransactions({
        wallet: PRIMARY_SOURCE_WALLET,
        beforeSignature: prev.cursors.oldestScanned,
        maxSignatures: max,
      });
    }

    // Fold both passes together (foldTransfers top-dedups by id, so overlap is safe)
    const allHelius = [...incResult.txs, ...bfResult.txs].map(rawTxToHelius);
    const { transfers } = parseOutgoingTransfers(allHelius, PRIMARY_SOURCE_WALLET);

    // Cursor updates:
    // newest: only set on first run (prev.newest == null); kept stable afterward
    const newestSig = prev.cursors.newest == null
      ? (incResult.newestSignature ?? null)
      : prev.cursors.newest;
    // oldestScanned: advance to the oldest sig returned by the backfill pass
    const bfOldest = bfResult.txs.length
      ? bfResult.txs[bfResult.txs.length - 1].transaction.signatures[0]
      : null;
    const oldestScanned = bfOldest ?? prev.cursors.oldestScanned;
    // backfillComplete: backfill returned fewer than max → no more history
    const backfillComplete = prev.backfillComplete ||
      (!prev.backfillComplete && bfResult.txs.length < max);

    const next = foldTransfers(prev, transfers, {
      newestSignature: newestSig,
      oldestScanned,
      backfillComplete,
      collectedAt: nowIso,
    });

    if (next.totals.totalAirdrops < prev.totals.totalAirdrops)
      throw new Error("refusing to write a regressed snapshot");
    writeFileSync(outPath, JSON.stringify(next, null, 2));
    console.log(
      `sync: wrote ${outPath}: ${next.totals.uniqueRecipients} recipients, ` +
      `${next.totals.totalAirdrops} airdrops, ` +
      `backfillComplete=${next.backfillComplete}, ` +
      `inc=${incResult.txs.length} txs, bf=${bfResult.txs.length} txs`,
    );
    return;
  }

  // Legacy single-pass modes: incremental or backfill
  const untilSignature = mode === "incremental" ? prev.cursors.newest : undefined;
  const beforeSignature = mode === "backfill" ? (prev.cursors.oldestScanned ?? undefined) : undefined;

  const { txs, newestSignature } = await getOutgoingTransactions({
    wallet: PRIMARY_SOURCE_WALLET,
    untilSignature,
    beforeSignature,
    maxSignatures: max,
  });

  const helius = txs.map(rawTxToHelius);
  const { transfers } = parseOutgoingTransfers(helius, PRIMARY_SOURCE_WALLET);
  const oldest = txs.length ? txs[txs.length - 1].transaction.signatures[0] : prev.cursors.oldestScanned;
  const backfillComplete = mode === "backfill" ? txs.length < max : prev.backfillComplete;
  // For backfill, do not overwrite cursors.newest with the (older) backfill newestSignature.
  const newestSigToStore = mode === "backfill"
    ? prev.cursors.newest
    : (newestSignature ?? prev.cursors.newest);

  const next = foldTransfers(prev, transfers, {
    newestSignature: newestSigToStore,
    oldestScanned: oldest ?? null,
    backfillComplete,
    collectedAt: nowIso,
  });

  if (next.totals.totalAirdrops < prev.totals.totalAirdrops)
    throw new Error("refusing to write a regressed snapshot");
  writeFileSync(outPath, JSON.stringify(next, null, 2));
  console.log(
    `${mode}: wrote ${outPath}: ${next.totals.uniqueRecipients} recipients, ` +
    `${next.totals.totalAirdrops} airdrops, ` +
    `backfillComplete=${next.backfillComplete}, ` +
    `otherMints=${next.otherMintsSent.length}`,
  );
}
main().catch((e) => { console.error(e instanceof Error ? e.message : e); process.exitCode = 1; });
