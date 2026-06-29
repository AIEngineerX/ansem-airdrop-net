# How It Works — a plain-language tour

This is the no-jargon version of how the airdrop web is built. If a term looks
unfamiliar, it's in the [Glossary](#glossary) at the bottom.

## The big idea

Ansem's wallet (`GV6U…dC52`) sent **$ANSEM** tokens out to a lot of other
wallets — an airdrop. Every one of those sends is permanently recorded on the
Solana blockchain. This project does two things:

1. **Reads the blockchain** to find *every* ANSEM send from that wallet and adds
   them up.
2. **Draws a website** that shows the result — a glowing "web" of who got what,
   a live feed, the totals (including the dollar value), and a box where anyone can
   paste their wallet to check if *they* were airdropped.

That's it. The whole system is just "gather the facts, then display them." It never
touches anyone's funds — it only **reads** public data.

## The two halves

Think of it as a **kitchen** and a **dining room**.

- **The kitchen (the collector):** a script that runs on a schedule, fetches the raw
  blockchain data, cleans it, and saves a single tidy file — a `snapshot`. The diners
  never see the kitchen.
- **The dining room (the website):** a plain, fast web page that just reads that one
  snapshot file and makes it beautiful. No cooking happens here.

Keeping them separate is the key trick: the website does **zero** heavy work, so it's
instant and cheap, and it can never break from a slow data source.

```
   BLOCKCHAIN  ──▶  KITCHEN (collector)  ──▶  snapshot.json  ──▶  DINING ROOM (website)  ──▶  you
   (Helius)         runs on a schedule        one tidy file        reads + draws it
```

## How the data gets gathered (the kitchen, step by step)

The collector is a small Node script (`scripts/collect-snapshot.ts`). Each run:

1. **Asks Helius for the wallet's transaction list.** [Helius](#helius) is a service
   that makes reading Solana easy. We ask: "give me the signatures (IDs) of this
   wallet's transactions, newest first." It pages through them 1,000 at a time.
2. **Downloads each transaction** and reads what actually happened inside it.
3. **Keeps only the real ANSEM airdrops.** A transaction can contain many things. We
   keep a send **only if the token is the exact ANSEM coin** (matched by its unique
   *mint* address, never by the name "ANSEM" — there are a dozen copycat tokens
   literally named "ANSEM"). The tiny 0.002-SOL "dust" that rides along to pay for
   the recipient's token account is overhead, not an airdrop, so it's dropped.
4. **Rolls it up.** For each recipient it tracks: total ANSEM received, how many
   times, first and last seen. It also keeps the 100 most recent sends for the feed.
5. **Saves the snapshot** — a single small JSON file with the totals, the full
   recipient list, the recent feed, and a couple of bookmarks (see *cursors* below).

### Going both directions in time (incremental + backfill)

The wallet keeps being active, and it also has a history. So each run does two things:

- **Incremental:** "anything *new* since last time?" — catches fresh airdrops.
- **Backfill:** "let me also reach a bit further *back* into history" — until the
  whole history is captured.

Two **cursors** (bookmarks) make this reliable: `newest` (the latest thing we've
counted) and `oldestScanned` (how far back we've reached). The `newest` bookmark is
what prevents double-counting — next run only looks at things *newer* than it.
When the backfill reaches the very beginning, it flags `backfillComplete: true`. The
shipped snapshot has that flag — meaning it's the **complete** history, not a sample.

### Playing nice with the free data plan

The free Helius key limits how fast you can ask. So the collector **throttles**
itself (small pauses) and, if it's told "too many requests," it **waits and retries**
with growing delays (back-off). That's why a big history backfill is slow but never
falls over.

## How the website shows it (the dining room)

The site is a [Next.js](#nextjs) app. When you open it:

1. It fetches the one `snapshot.json` (see *two modes* below) **once** and holds it.
2. It draws the pieces from that data:
   - **The web** — a *force-graph*: Ansem's wallet is a glowing dot in the middle, and
     every recipient is a smaller dot pulled around it, sized by how much ANSEM they
     got. Little particles flow along the lines, so you literally watch ANSEM leave the
     bull. (Built with `react-force-graph-2d`, drawn on an HTML canvas.)
   - **The stats** — wallets airdropped, total ANSEM, total airdrops, and the **dollar
     value** (ANSEM total × the *current* price, fetched live — we never freeze a dollar
     number, because prices move).
   - **The feed** — the latest airdrops with "x minutes ago."
   - **The lookup** — you paste a wallet, it searches the recipient list, and tells you
     if/when/how much. This is just a search over data already on the page — it never
     asks you to connect a wallet.
   - **A second tab** — Ansem's pump.fun creator rewards + the $ANSEM market panel.

## The two running modes

- **Seed-only (now):** the snapshot is **committed into the project** (`public/
  snapshot.seed.json`) and shipped with the site. The page shows real data
  immediately; it just doesn't auto-update. This is how it's deployed today.
- **Live (later):** the scheduled collector publishes fresh snapshots and the site
  fetches them automatically. Turning this on is a small switch
  (`LIVE_SNAPSHOT_ENABLED`) once the data is served somewhere public — see
  `docs/DEPLOY.md`.

## Why you can trust the numbers

- **It's all on-chain.** Every figure traces to a real Solana transaction you can open
  on a block explorer.
- **Read-only.** There's no wallet connect, signing, or trading anywhere — the project
  literally can't move funds. A CI check fails the build if such code is ever added.
- **Mint-exact.** Only the genuine ANSEM coin counts; copycats and the SOL dust don't.
- **Live dollars.** The USD figure is always "at the current price," labeled as such, so
  it's honest about drifting with the market. (For example, ~67.36M ANSEM is ≈ $6.3M at
  ~$0.093, and would be ~$7M at a higher price — same coins, different valuation.)

## Glossary

- <a name="wallet"></a>**Wallet** — an account on Solana, identified by a long address
  like `GV6U…dC52`.
- **Airdrop** — sending tokens to many wallets, often for free.
- <a name="mint"></a>**Mint** — a token's unique on-chain ID. ANSEM's is
  `9cRCn9…pump`. We match on this, never on the display name.
- **Transaction / signature** — one recorded action on-chain; its ID is the
  "signature."
- <a name="helius"></a>**Helius** — a service that provides fast, reliable access to
  Solana data (the "RPC"). We use its standard transaction-reading endpoints.
- **RPC** — the standard way software talks to a blockchain ("remote procedure call").
- **Snapshot** — the single tidy JSON file the collector produces; the website reads
  only this.
- **Backfill** — reaching backwards through history to capture older records.
- **Cursor** — a bookmark (`newest` / `oldestScanned`) so runs don't miss or
  double-count.
- **Force-graph** — a diagram of dots (nodes) and lines (links) that arrange
  themselves with simulated physics, so connected things cluster naturally.
- <a name="nextjs"></a>**Next.js** — the React-based web framework the site is built
  with; here it produces a static (pre-built) site.
- **Static site** — pre-built HTML/JS with no server doing work per visit; fast and
  cheap to host.
