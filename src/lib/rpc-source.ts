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

type RpcCall = { method: string; params: unknown[] };

async function rpcBatch(url: string, calls: RpcCall[]): Promise<unknown[]> {
  const body = calls.map((c, i) => ({ jsonrpc: "2.0", id: i, method: c.method, params: c.params }));
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`RPC ${res.status} ${res.statusText}`);
  const json = (await res.json()) as Array<{ id: number; result?: unknown; error?: unknown }>;
  const arr = Array.isArray(json) ? json : [json];
  return arr
    .sort((a, b) => a.id - b.id)
    .map((r) => {
      if (r.error) throw new Error(`RPC error: ${JSON.stringify(r.error)}`);
      return r.result;
    });
}

type SignatureInfo = { signature: string; blockTime: number | null };

export async function getOutgoingTransactions(opts: {
  wallet: string;
  sinceDays?: number;
  untilSignature?: string | null;
  maxSignatures?: number;
}): Promise<{ txs: RpcGetTransaction[]; newestSignature: string | null }> {
  const url = rpcUrl();
  const cutoff = opts.sinceDays ? Date.now() / 1000 - opts.sinceDays * 86400 : 0;
  const cap = opts.maxSignatures ?? 10_000;

  // 1) paginate signatures (newest -> older)
  const signatures: string[] = [];
  let before: string | undefined;
  let newest: string | null = null;
  outer: while (signatures.length < cap) {
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
  }
  return { txs, newestSignature: newest };
}
