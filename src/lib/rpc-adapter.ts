import type { RpcGetTransaction, RpcInstruction, RpcTokenBalance } from "./rpc-types";
import type { HeliusTransaction, HeliusNativeTransfer, HeliusTokenTransfer } from "./transfer-parser";

const TOKEN_2022_PROGRAM = "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb";

type AcctInfo = { owner?: string; mint: string; decimals: number; programId?: string };

function tokenAccountMap(tx: RpcGetTransaction): Map<string, AcctInfo> {
  const keys = tx.transaction.message.accountKeys;
  const m = new Map<string, AcctInfo>();
  const all: RpcTokenBalance[] = [
    ...(tx.meta?.preTokenBalances ?? []),
    ...(tx.meta?.postTokenBalances ?? []),
  ];
  for (const b of all) {
    const pk = keys[b.accountIndex]?.pubkey;
    if (pk) m.set(pk, { owner: b.owner, mint: b.mint, decimals: b.uiTokenAmount.decimals, programId: b.programId });
  }
  return m;
}

function allInstructions(tx: RpcGetTransaction): RpcInstruction[] {
  return [
    ...tx.transaction.message.instructions,
    ...(tx.meta?.innerInstructions ?? []).flatMap((g) => g.instructions),
  ];
}

export function rawTxToHelius(tx: RpcGetTransaction): HeliusTransaction {
  const signature = tx.transaction.signatures[0] ?? "";
  const nativeTransfers: HeliusNativeTransfer[] = [];
  const tokenTransfers: HeliusTokenTransfer[] = [];

  if (tx.meta?.err == null) {
    const map = tokenAccountMap(tx);
    for (const ins of allInstructions(tx)) {
      const info = (ins.parsed?.info ?? {}) as Record<string, unknown>;
      const type = ins.parsed?.type;

      // Native SOL out — handle transfer, transferChecked, and createAccount (ATA rent funding)
      if (
        ins.program === "system" &&
        (type === "transfer" || type === "transferChecked" || type === "createAccount")
      ) {
        const source = info.source as string | undefined;
        // createAccount uses "newAccount" as the destination; transfer uses "destination"
        const destination = (info.destination ?? info.newAccount) as string | undefined;
        const lamports = Number(info.lamports ?? 0);
        if (source && destination) {
          nativeTransfers.push({ fromUserAccount: source, toUserAccount: destination, amount: lamports });
        }
        continue;
      }

      // SPL / Token-2022 out
      if (
        (ins.program === "spl-token" || ins.program === "spl-token-2022") &&
        (type === "transfer" || type === "transferChecked")
      ) {
        const srcAcct = info.source as string | undefined;
        const dstAcct = info.destination as string | undefined;
        if (!srcAcct || !dstAcct) continue;
        const srcOwner = map.get(srcAcct)?.owner;
        const dstOwner = map.get(dstAcct)?.owner;
        const mint = (info.mint as string | undefined) ?? map.get(srcAcct)?.mint ?? map.get(dstAcct)?.mint;
        if (!mint) continue;
        if (dstOwner && srcOwner && dstOwner === srcOwner) continue; // self-move guard
        const decimals = map.get(srcAcct)?.decimals ?? map.get(dstAcct)?.decimals;
        const tokenAmountObj = info.tokenAmount as { amount?: string; uiAmount?: number } | undefined;
        const rawAmount = (info.amount as string | undefined) ?? tokenAmountObj?.amount ?? "0";
        const uiAmount =
          tokenAmountObj?.uiAmount ??
          (decimals != null ? Number(rawAmount) / 10 ** decimals : Number(rawAmount));
        tokenTransfers.push({
          fromUserAccount: srcOwner,
          toUserAccount: dstOwner,
          fromTokenAccount: srcAcct,
          toTokenAccount: dstAcct,
          mint,
          tokenAmount: uiAmount,
          rawTokenAmount: { tokenAmount: String(rawAmount), decimals },
          tokenStandard: ins.program === "spl-token-2022" || map.get(srcAcct)?.programId === TOKEN_2022_PROGRAM
            ? "FungibleToken2022"
            : "FungibleToken",
        });
      }
    }
  }

  return {
    signature,
    slot: tx.slot,
    timestamp: tx.blockTime ?? undefined,
    transactionError: tx.meta?.err ?? null,
    nativeTransfers,
    tokenTransfers,
  };
}
