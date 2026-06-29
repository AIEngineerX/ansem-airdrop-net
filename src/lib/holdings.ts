import { ANSEM_MINT } from "./domain";
import { rpcUrl, rpcBatch } from "./rpc-source";

type ParsedTokenAccount = {
  account?: { data?: { parsed?: { info?: { tokenAmount?: { uiAmount?: number | null } } } } };
};

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Sum uiAmount across one owner's getTokenAccountsByOwner(jsonParsed) result. */
export function sumOwnerAnsem(result: unknown): number {
  const value = (result as { value?: ParsedTokenAccount[] } | null)?.value;
  if (!Array.isArray(value)) return 0;
  return value.reduce(
    (sum, acc) => sum + (acc?.account?.data?.parsed?.info?.tokenAmount?.uiAmount ?? 0),
    0,
  );
}

/** Current ANSEM balance (uiAmount) for each wallet, batched + throttled. */
export async function getAnsemBalances(wallets: string[]): Promise<Map<string, number>> {
  const url = rpcUrl();
  const out = new Map<string, number>();
  const BATCH = 25;
  for (let i = 0; i < wallets.length; i += BATCH) {
    const chunk = wallets.slice(i, i + BATCH);
    const results = await rpcBatch(
      url,
      chunk.map((w) => ({
        method: "getTokenAccountsByOwner",
        params: [w, { mint: ANSEM_MINT }, { encoding: "jsonParsed" }],
      })),
    );
    chunk.forEach((w, j) => out.set(w, sumOwnerAnsem(results[j])));
    if (i + BATCH < wallets.length) await sleep(250);
  }
  return out;
}
