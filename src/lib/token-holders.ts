import { rpcUrl, backoffDelayMs } from "./rpc-source";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

type HeliusTokenAccount = { owner: string; amount: string | number };
type GetTokenAccountsResult = {
  result?: { token_accounts?: HeliusTokenAccount[] };
  error?: unknown;
};

/**
 * Count the unique wallets currently holding $ANSEM (any positive balance) by paginating
 * Helius `getTokenAccounts` for the mint. ~68 pages of 1000 today; sequential, ~11s.
 *
 * This is the collector's single most expensive call, so it is NOT run every cron tick — the
 * collector gates it behind an hourly TTL (see scripts/collect-snapshot.ts). Reuses the same
 * Helius RPC URL and 429 backoff as the rest of the collector. `showZeroBalance:false` makes
 * Helius skip emptied/closed accounts; the `> 0` guard is belt-and-suspenders.
 */
export async function countTokenHolders(mint: string, maxPages = 250): Promise<number> {
  const url = rpcUrl();
  const owners = new Set<string>();
  for (let page = 1; page <= maxPages; page++) {
    let list: HeliusTokenAccount[] = [];
    for (let attempt = 0; ; attempt++) {
      const res = await fetch(url, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: "holders",
          method: "getTokenAccounts",
          params: { mint, page, limit: 1000, options: { showZeroBalance: false } },
        }),
      });
      if (res.status === 429) {
        if (attempt >= 5) throw new Error("getTokenAccounts 429 after 5 retries");
        await sleep(backoffDelayMs(attempt));
        continue;
      }
      if (!res.ok) throw new Error(`getTokenAccounts ${res.status} ${res.statusText}`);
      const json = (await res.json()) as GetTokenAccountsResult;
      if (json.error) throw new Error(`getTokenAccounts error: ${JSON.stringify(json.error)}`);
      list = json.result?.token_accounts ?? [];
      break;
    }
    if (list.length === 0) break;
    for (const a of list) if (Number(a.amount ?? 0) > 0) owners.add(a.owner);
    if (list.length < 1000) break;
  }
  return owners.size;
}
