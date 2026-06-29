import type { RpcGetTransaction } from "./rpc-types";

export function rpcUrl(): string {
  const url =
    process.env.HELIUS_RPC_URL ??
    (process.env.HELIUS_API_KEY
      ? `https://mainnet.helius-rpc.com/?api-key=${process.env.HELIUS_API_KEY}`
      : null);
  if (!url) throw new Error("Set HELIUS_API_KEY or HELIUS_RPC_URL");
  return url;
}

export function backoffDelayMs(attempt: number): number {
  return Math.min(500 * 2 ** attempt, 8000);
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

type RpcCall = { method: string; params: unknown[] };

async function rpcBatch(url: string, calls: RpcCall[]): Promise<unknown[]> {
  const body = calls.map((c, i) => ({ jsonrpc: "2.0", id: i, method: c.method, params: c.params }));
  for (let attempt = 0; ; attempt++) {
    const res = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    if (res.status === 429) {
      if (attempt >= 5) throw new Error("RPC 429 after 5 retries");
      await sleep(backoffDelayMs(attempt));
      continue;
    }
    if (!res.ok) throw new Error(`RPC ${res.status} ${res.statusText}`);
    const json = (await res.json()) as Array<{ id: number; result?: unknown; error?: unknown }>;
    const arr = Array.isArray(json) ? json : [json];
    const rateLimited = arr.find((r) => r.error && JSON.stringify(r.error).includes("rate"));
    if (rateLimited) {
      if (attempt >= 5) throw new Error("RPC rate-limited after 5 retries");
      await sleep(backoffDelayMs(attempt));
      continue;
    }
    return arr
      .sort((a, b) => a.id - b.id)
      .map((r) => { if (r.error) throw new Error(`RPC error: ${JSON.stringify(r.error)}`); return r.result; });
  }
}

type SignatureInfo = { signature: string; blockTime: number | null };

export async function getOutgoingTransactions(opts: {
  wallet: string;
  sinceDays?: number;
  untilSignature?: string | null;
  beforeSignature?: string | null;
  maxSignatures?: number;
}): Promise<{
  txs: RpcGetTransaction[];
  newestSignature: string | null;
  oldestSignature: string | null;
  signatureCount: number;
}> {
  const url = rpcUrl();
  const cutoff = opts.sinceDays ? Date.now() / 1000 - opts.sinceDays * 86400 : 0;
  const cap = opts.maxSignatures ?? 10_000;
  // FIX B2: the forward/incremental scan (untilSignature set) must NOT be capped by max —
  // `until` makes getSignaturesForAddress stop naturally at the cursor, so we paginate to a
  // short page and capture EVERY new airdrop, even a burst of >max between cron runs. The max
  // cap is reserved for the backfill (older) direction, where it bounds one chunk per run.
  const uncapped = Boolean(opts.untilSignature);

  // 1) paginate signatures (newest -> older)
  // Seed `before` from opts.beforeSignature so backfill continues from oldestScanned.
  const signatures: string[] = [];
  let before: string | undefined = opts.beforeSignature ?? undefined;
  let newest: string | null = null;
  outer: while (uncapped || signatures.length < cap) {
    const [page] = (await rpcBatch(url, [
      {
        method: "getSignaturesForAddress",
        params: [
          opts.wallet,
          {
            limit: 1000,
            ...(before ? { before } : {}),
            ...(opts.untilSignature ? { until: opts.untilSignature } : {}),
          },
        ],
      },
    ])) as [SignatureInfo[]];
    if (!page.length) break;
    newest ??= page[0].signature;
    for (const s of page) {
      if (cutoff && s.blockTime && s.blockTime < cutoff) break outer;
      signatures.push(s.signature);
    }
    before = page[page.length - 1].signature;
    if (page.length < 1000) break;
  }

  // 2) fetch transactions in batches (kept small — Helius returns 413 on large batches)
  const BATCH = 25;
  const txs: RpcGetTransaction[] = [];
  for (let i = 0; i < signatures.length; i += BATCH) {
    const chunk = signatures.slice(i, i + BATCH);
    const results = await rpcBatch(
      url,
      chunk.map((sig) => ({
        method: "getTransaction",
        params: [sig, { encoding: "jsonParsed", maxSupportedTransactionVersion: 0 }],
      })),
    );
    for (const r of results) if (r) txs.push(r as RpcGetTransaction);
    await sleep(250);
  }
  // FIX B1: report SIGNATURES fetched (and the oldest signature seen), independent of how
  // many getTransaction results survived (null/pruned txs are dropped above). The collector
  // judges backfillComplete and advances oldestScanned from these signature-level values.
  return {
    txs,
    newestSignature: newest,
    oldestSignature: signatures.length ? signatures[signatures.length - 1] : null,
    signatureCount: signatures.length,
  };
}
