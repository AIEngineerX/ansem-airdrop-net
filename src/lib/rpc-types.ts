// Typed subset of a Solana `getTransaction` response with
// { encoding: "jsonParsed", maxSupportedTransactionVersion: 0 }.

export type RpcAccountKey = {
  pubkey: string;
  signer: boolean;
  writable: boolean;
  source?: "transaction" | "lookupTable";
};

export type RpcTokenBalance = {
  accountIndex: number;
  mint: string;
  owner?: string;
  programId?: string;
  uiTokenAmount: {
    amount: string;
    decimals: number;
    uiAmount: number | null;
    uiAmountString: string;
  };
};

export type RpcInstruction = {
  program?: string; // e.g. "system", "spl-token", "spl-token-2022"
  programId?: string;
  parsed?: { type?: string; info?: Record<string, unknown> };
};

export type RpcGetTransaction = {
  slot?: number;
  blockTime?: number | null;
  meta: {
    err: unknown | null;
    fee: number;
    preBalances: number[];
    postBalances: number[];
    preTokenBalances?: RpcTokenBalance[];
    postTokenBalances?: RpcTokenBalance[];
    innerInstructions?: { index: number; instructions: RpcInstruction[] }[];
  } | null;
  transaction: {
    signatures: string[];
    message: { accountKeys: RpcAccountKey[]; instructions: RpcInstruction[] };
  };
};
