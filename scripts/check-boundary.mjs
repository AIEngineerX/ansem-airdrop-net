import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const FORBIDDEN = [
  "@solana/wallet-adapter", "@jup-ag", "phantom",
  "signTransaction", "sendTransaction",
];
const root = "src";
const offenders = [];

function walk(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p);
    else if (/\.(ts|tsx|js|jsx)$/.test(name)) {
      const text = readFileSync(p, "utf8");
      for (const term of FORBIDDEN) {
        if (text.includes(term)) offenders.push(`${p}: ${term}`);
      }
    }
  }
}
walk(root);

if (offenders.length) {
  console.error("Boundary violation (no wallet/execution surfaces allowed in src/):");
  for (const o of offenders) console.error("  " + o);
  process.exit(1);
}
console.log("boundary OK");
