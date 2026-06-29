#!/usr/bin/env tsx
// One-off investigation: characterize a wallet's ANSEM in/out flow.
// Usage: node --env-file=.env --import tsx scripts/investigate.ts <wallet> [maxSigs]
import { getOutgoingTransactions } from "../src/lib/rpc-source";
import { ANSEM_MINT } from "../src/lib/domain";
import type { RpcGetTransaction, RpcInstruction } from "../src/lib/rpc-types";

function tokenMap(tx: RpcGetTransaction) {
  const keys = tx.transaction.message.accountKeys;
  const m = new Map<string, { owner?: string; mint: string; prog?: string }>();
  for (const b of [...(tx.meta?.preTokenBalances ?? []), ...(tx.meta?.postTokenBalances ?? [])]) {
    const pk = keys[b.accountIndex]?.pubkey;
    if (pk) m.set(pk, { owner: b.owner, mint: b.mint, prog: b.programId });
  }
  return m;
}
function insts(tx: RpcGetTransaction): RpcInstruction[] {
  return [
    ...tx.transaction.message.instructions,
    ...(tx.meta?.innerInstructions ?? []).flatMap((g) => g.instructions),
  ];
}

async function main() {
  const wallet = process.argv[2];
  const maxSigs = Number(process.argv[3] ?? 400);
  if (!wallet) throw new Error("usage: investigate.ts <wallet> [maxSigs]");

  const { txs } = await getOutgoingTransactions({ wallet, maxSignatures: maxSigs });

  let outCount = 0,
    inCount = 0,
    outAmt = 0,
    inAmt = 0,
    signedByWallet = 0,
    nativeOut = 0;
  const recipients = new Set<string>();
  const fundedBy = new Map<string, number>();
  let minTime = Infinity,
    maxTime = -Infinity;

  for (const tx of txs) {
    if (tx.meta?.err) continue;
    if (tx.blockTime) {
      minTime = Math.min(minTime, tx.blockTime);
      maxTime = Math.max(maxTime, tx.blockTime);
    }
    if (tx.transaction.message.accountKeys[0]?.pubkey === wallet) signedByWallet++;
    const tm = tokenMap(tx);
    for (const i of insts(tx)) {
      const p = i.parsed;
      if (!p || typeof p !== "object") continue;
      const info = (p.info ?? {}) as Record<string, string>;
      const t = p.type;
      if (i.program === "system" && t === "transfer" && info.source === wallet) nativeOut++;
      if ((i.program === "spl-token" || i.program === "spl-token-2022") && (t === "transfer" || t === "transferChecked")) {
        const src = info.source;
        const srcOwner = tm.get(src)?.owner;
        const mint = info.mint ?? tm.get(src)?.mint;
        if (mint !== ANSEM_MINT) continue;
        const destOwner = tm.get(info.destination)?.owner;
        const amt = Number((info.tokenAmount as unknown as { uiAmount?: number })?.uiAmount ?? 0);
        if (info.authority === wallet || srcOwner === wallet) {
          outCount++;
          outAmt += amt;
          if (destOwner) recipients.add(destOwner);
        } else if (destOwner === wallet) {
          inCount++;
          inAmt += amt;
          if (srcOwner) fundedBy.set(srcOwner, (fundedBy.get(srcOwner) ?? 0) + amt);
        }
      }
    }
  }

  const span = maxTime > 0 ? ((maxTime - minTime) / 3600).toFixed(1) + "h" : "n/a";
  console.log(`\n=== ${wallet} ===`);
  console.log(`txs fetched: ${txs.length} | window: ${span} | signed-by-wallet: ${signedByWallet}`);
  console.log(`OUTGOING ANSEM: ${outCount} transfers, ${recipients.size} unique recipients, ${outAmt.toLocaleString()} ANSEM, ${nativeOut} native-SOL sends`);
  console.log(`INCOMING ANSEM: ${inCount} transfers, ${inAmt.toLocaleString()} ANSEM`);
  console.log(`Top ANSEM funders (incoming source owner -> amount):`);
  for (const [k, v] of [...fundedBy.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6)) {
    console.log(`   ${k} -> ${v.toLocaleString()}`);
  }
}
main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exitCode = 1;
});
