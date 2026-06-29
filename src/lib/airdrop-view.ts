import { type AirdropSnapshot, type AirdropRecipient } from "./airdrop-snapshot";

export type GraphNode = { id: string; label: string; val: number; kind: "source" | "recipient" | "cluster"; ansemUi: number };
export type GraphLink = { source: string; target: string };
export type GraphModel = { nodes: GraphNode[]; links: GraphLink[] };

const SOURCE_ID = "__source__";
const CLUSTER_ID = "__cluster__";
const short = (w: string) => `${w.slice(0, 4)}…${w.slice(-4)}`;

export function buildGraphModel(snap: AirdropSnapshot, cap = 300): GraphModel {
  const sorted = [...snap.recipients].sort((a, b) => b.totalAnsemUi - a.totalAnsemUi);
  const top = sorted.slice(0, cap);
  const rest = sorted.slice(cap);
  const nodes: GraphNode[] = [
    { id: SOURCE_ID, label: "GV6U (Ansem)", val: Math.max(snap.totals.totalAnsemUi, 1), kind: "source", ansemUi: snap.totals.totalAnsemUi },
    ...top.map((r) => ({ id: r.wallet, label: short(r.wallet), val: Math.max(r.totalAnsemUi, 0.0001), kind: "recipient" as const, ansemUi: r.totalAnsemUi })),
  ];
  const links: GraphLink[] = top.map((r) => ({ source: SOURCE_ID, target: r.wallet }));
  if (rest.length > 0) {
    const restUi = rest.reduce((s, r) => s + r.totalAnsemUi, 0);
    nodes.push({ id: CLUSTER_ID, label: `+${rest.length} more`, val: Math.max(restUi, 1), kind: "cluster", ansemUi: restUi });
    links.push({ source: SOURCE_ID, target: CLUSTER_ID });
  }
  return { nodes, links };
}

export function lookupRecipient(snap: AirdropSnapshot, wallet: string): AirdropRecipient | null {
  const q = wallet.trim();
  if (!q) return null;
  return snap.recipients.find((r) => r.wallet === q) ?? null;
}

export function timeAgo(iso: string, nowMs: number): string {
  const s = Math.max(0, Math.round((nowMs - Date.parse(iso)) / 1000));
  if (s < 60) return `${s}s ago`;
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.round(h / 24)}d ago`;
}
