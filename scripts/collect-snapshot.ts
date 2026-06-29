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
import { computeNextCursors } from "../src/lib/collector-cursors";
import { PRIMARY_SOURCE_WALLET } from "../src/lib/domain";
import { getAnsemBalances } from "../src/lib/holdings";

// Enrich the top-50 recipients with their current on-chain ANSEM balance.
// Fail-soft: holdings are enrichment, not core truth — never fail the run over them.
async function withHoldings(snap: AirdropSnapshot): Promise<AirdropSnapshot> {
  try {
    const top = snap.recipients.slice(0, 50).map((r) => r.wallet);
    if (top.length === 0) return snap;
    const held = await getAnsemBalances(top);
    return {
      ...snap,
      recipients: snap.recipients.map((r) =>
        held.has(r.wallet) ? { ...r, heldAnsemUi: held.get(r.wallet) } : r,
      ),
    };
  } catch (e) {
    console.warn("holdings: fetch failed, writing snapshot without holdings:", (e as Error).message);
    return snap;
  }
}

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
    let bfResult: Awaited<ReturnType<typeof getOutgoingTransactions>> = {
      txs: [],
      newestSignature: null,
      oldestSignature: null,
      signatureCount: 0,
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

    // Compute next cursors via pure function. FIX A: newest advances each run.
    // FIX B1: judge backfill on SIGNATURES fetched (signatureCount) and advance oldestScanned
    // from the oldest SIGNATURE seen — never from txs[last], which omits null/pruned txs and
    // would prematurely mark backfillComplete (dropping older history).
    const nextCursors = computeNextCursors(
      { ...prev.cursors, backfillComplete: prev.backfillComplete },
      {
        mode: "sync",
        incNewestSignature: incResult.newestSignature ?? null,
        backfillOldest: bfResult.oldestSignature,
        backfillCount: bfResult.signatureCount,
        max,
      },
    );

    const next = foldTransfers(prev, transfers, {
      newestSignature: nextCursors.newest,
      oldestScanned: nextCursors.oldestScanned,
      backfillComplete: nextCursors.backfillComplete,
      collectedAt: nowIso,
    });

    if (next.totals.totalAirdrops < prev.totals.totalAirdrops)
      throw new Error("refusing to write a regressed snapshot");
    const enriched = await withHoldings(next);
    writeFileSync(outPath, JSON.stringify(enriched, null, 2));
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

  const { txs, newestSignature, oldestSignature, signatureCount } = await getOutgoingTransactions({
    wallet: PRIMARY_SOURCE_WALLET,
    untilSignature,
    beforeSignature,
    maxSignatures: max,
  });

  const helius = txs.map(rawTxToHelius);
  const { transfers } = parseOutgoingTransfers(helius, PRIMARY_SOURCE_WALLET);

  // For backfill: the single scan IS the backfill scan, so pass its newestSignature as
  // incNewestSignature to seed cursors.newest on bootstrap (FIX A: no bootstrap double-count).
  // For incremental: incNewestSignature is the fresh scan's newestSignature; no backfill ran.
  // FIX B1: backfill judged on signatureCount + oldestSignature, not parsed-tx values.
  const nextCursors = computeNextCursors(
    { ...prev.cursors, backfillComplete: prev.backfillComplete },
    {
      mode: mode as "incremental" | "backfill",
      incNewestSignature: newestSignature ?? null,
      backfillOldest: mode === "backfill" ? oldestSignature : null,
      backfillCount: mode === "backfill" ? signatureCount : 0,
      max,
    },
  );

  const next = foldTransfers(prev, transfers, {
    newestSignature: nextCursors.newest,
    oldestScanned: nextCursors.oldestScanned,
    backfillComplete: nextCursors.backfillComplete,
    collectedAt: nowIso,
  });

  if (next.totals.totalAirdrops < prev.totals.totalAirdrops)
    throw new Error("refusing to write a regressed snapshot");
  const enriched = await withHoldings(next);
  writeFileSync(outPath, JSON.stringify(enriched, null, 2));
  console.log(
    `${mode}: wrote ${outPath}: ${next.totals.uniqueRecipients} recipients, ` +
    `${next.totals.totalAirdrops} airdrops, ` +
    `backfillComplete=${next.backfillComplete}, ` +
    `otherMints=${next.otherMintsSent.length}`,
  );
}
main().catch((e) => { console.error(e instanceof Error ? e.message : e); process.exitCode = 1; });
