# delphi-evidence-agent

Evidence-mining agent for the **Delphi Agent Competition** (Gensyn / DoraHacks) — `airdroofito-delphi`.

The agent submits dated, sourced facts to live Delphi prediction markets via the Evidence API (`https://delphi.fyi/v1`). Bounties pay for information that moves the forecaster, not for compute. Competition window: 25 Nov – 11 Dec 2026 17:00 UTC. Winners announced 16 Dec 2026.

## How it works

1. Research (in `../research/cluster-*.md`, 26 Nov 2026): 27 markets read, 26 researched in 3 clusters. Facts must be dated, sourced, and plausibly unpriced by the forecaster. The judge only reads what is in the submission; X / Reddit / paywall links usually fail to fetch, so key text is pasted into the note.
2. Queue (`queue.json`): 13 submissions across 13 markets, earliest cutoff first. Vox + War Materiel Act first (cutoff 28 Nov 06:00 UTC), then Korea / Turkey / German CPI / Swiss CPI, then Node / Go / IETF / Wikipedia / ARC-AGI-3, then Mexico CPI / Japan food-tax.
3. Submit (`src/agent.ts`): checks `GET /v1/limits` and entry-state before every submit, accepts evidence terms only when `ACCEPT_TERMS=<version>` is set by the operator, submits one fact per run per market (saving slots 2–3 for event-driven refreshes), polls the verdict with `waitForSubmission`, logs every receipt to `submissions.jsonl`, and marks the queue item submitted so it is never re-sent.
4. Dashboard (`src/dashboard.ts` → `dashboard.html`): public activity log, no secrets.

## Rules the agent follows

- Max 3 submissions per market, max 3 items per submission, max 1 per trading day per market.
- Never submit both sides of a market (settlement is netted per person per market).
- Never submit a headline alone, a prediction without a source, or a fact already public before the forecaster's view.
- No trading, no manual submissions, no interaction with Delphi markets except through the Evidence API.

## Run

```bash
npm install
DELPHI_API_ACCESS_KEY=<key> npm run limits
DELPHI_API_ACCESS_KEY=<key> ACCEPT_TERMS=<version> npm start -- --dry-run
DELPHI_API_ACCESS_KEY=<key> npm start -- --only vox-01
npm run dashboard
```

`DELPHI_API_ACCESS_KEY` is a Mainnet Delphi API key from https://api-access.delphi.fyi, created from the Delphi account (email airdropfito@gmail.com via Privy). The agent needs no private key, ETH, or USDC to submit.

## Status

- Wallet (Delphi profile, via Privy email login): to be confirmed after sign-in.
- Dedicated agent wallet (backup, unused for Delphi login): `0xD71C28fB38a18a29509A3F23737359b10d04fa88`
- Deadline for DoraHacks Build submission: 12 Dec 2026 00:00 WIB.
