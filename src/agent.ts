// Delphi evidence-mining agent — airdroofito
// Reads queue.json (dated, sourced facts researched 26 Nov 2026), checks
// limits + terms + entry-state via the Evidence API, submits one fact per
// market (max 1 slot used per market on first pass, saving slots 2-3 for
// event-driven refreshes), polls the verdict, logs every receipt to
// submissions.jsonl, and regenerates the public dashboard (dashboard.html).
// Env: DELPHI_API_ACCESS_KEY (never print it), ACCEPT_TERMS=<version> only
// when the operator has read the terms at the URL from GET /v1/terms.
// Usage: npm run limits | npm start [--dry-run] [--only <queue-id>]
import { readFileSync, appendFileSync, writeFileSync, existsSync } from "node:fs";
import { EvidenceClient } from "@gensyn-ai/gensyn-delphi-sdk";

const API_URL = process.env.DELPHI_API_URL ?? "https://delphi.fyi/v1";
const AGENT_ID = process.env.AGENT_ID ?? "airdroofito-delphi";
const AGENT_MODEL = process.env.AGENT_MODEL ?? "muse-spark";
const QUEUE_FILE = new URL("../queue.json", import.meta.url);
const LOG_FILE = new URL("../submissions.jsonl", import.meta.url);

type QueueItem = { id: string; priority: number; market: string; question: string; cutoff: string; status: string; note: string; links: string[] };
type Queue = { agent: string; queue: QueueItem[] };

function loadQueue(): Queue { return JSON.parse(readFileSync(QUEUE_FILE, "utf8")); }
function log(obj: unknown) { appendFileSync(LOG_FILE, JSON.stringify(obj) + "\n"); console.log(JSON.stringify(obj)); }

function client() {
  const key = process.env.DELPHI_API_ACCESS_KEY || process.env.DELPHI_API_KEY;
  if (!key) { console.error("DELPHI_API_ACCESS_KEY is required"); process.exit(1); }
  return new EvidenceClient({ baseUrl: API_URL, apiKey: key, agentId: AGENT_ID, agentHarness: "airdroofito-delphi-agent", agentModel: AGENT_MODEL });
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const only = args[args.indexOf("--only") + 1];
  const ev = client();
  const { data: limits } = await ev.getLimits();
  console.log("limits:", JSON.stringify(limits));
  const { data: terms } = await ev.getTerms();
  console.log("terms:", JSON.stringify({ version: terms.version, url: terms.url, acceptedAt: terms.acceptedAt }));
  if (terms.acceptedAt === null) {
    if (process.env.ACCEPT_TERMS !== terms.version) {
      console.log(`Terms not accepted. Read ${terms.url}, then set ACCEPT_TERMS=${terms.version} to accept. Stopping before any submission.`);
      return;
    }
    if (dryRun) { console.log("dry-run: would accept terms", terms.version); return; }
    await ev.acceptTerms(terms.version);
    console.log("accepted terms", terms.version);
  }
  const q = loadQueue();
  const items = q.queue.filter((i) => i.status === "pending" && (!only || i.id === only))
    .sort((a, b) => new Date(a.cutoff).getTime() - new Date(b.cutoff).getTime());
  for (const item of items) {
    if (Date.parse(item.cutoff) <= Date.now()) { console.log(`skip ${item.id}: past cutoff ${item.cutoff}`); continue; }
    const { data: entry } = await ev.getEntryState(item.market);
    console.log(item.id, "entry-state:", JSON.stringify(entry));
    if (!entry.canSubmit) continue;
    if (dryRun) { console.log(`dry-run: would submit ${item.id} to ${item.market}`); continue; }
    const { data } = await ev.submitEvidence({ marketAddress: item.market, note: item.note, links: item.links });
    log({ at: new Date().toISOString(), queueId: item.id, market: item.market, submissionId: data.id, status: data.status });
    const result = data.status === "rejected" ? data : (await ev.waitForSubmission(data.id)).data;
    log({ at: new Date().toISOString(), queueId: item.id, market: item.market, submissionId: data.id, status: result.status, markets: result.markets });
    // Mark submitted in queue.json so a re-run never re-submits the same fact.
    const q2 = loadQueue();
    const it = q2.queue.find((x) => x.id === item.id);
    if (it) { it.status = `submitted:${data.id}`; writeFileSync(QUEUE_FILE, JSON.stringify(q2, null, 2)); }
    // One submission per run per market is the safe default; the operator
    // re-runs for the next market. Remove this break to batch a full pass.
    break;
  }
}

if (process.argv[1]?.endsWith("agent.ts")) main().catch((e) => { console.error(e); process.exit(1); });
