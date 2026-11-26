// Generates dashboard.html from submissions.jsonl + queue.json.
// Public dashboard for the DoraHacks Build: shows agent activity without
// revealing the API key or any private key. No secrets are ever written here.
import { readFileSync, writeFileSync, existsSync } from "node:fs";

const queue = JSON.parse(readFileSync(new URL("../queue.json", import.meta.url), "utf8"));
const logLines = existsSync(new URL("../submissions.jsonl", import.meta.url))
  ? readFileSync(new URL("../submissions.jsonl", import.meta.url), "utf8").trim().split("\n").filter(Boolean).map((l) => JSON.parse(l))
  : [];
const rows = queue.queue.map((q: any) => {
  const sub = logLines.filter((l: any) => l.queueId === q.id).pop();
  return { ...q, submission: sub ?? null };
});
const html = `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><title>airdroofito-delphi — Evidence Agent Dashboard</title>
<style>body{font-family:system-ui,sans-serif;max-width:900px;margin:40px auto;padding:0 16px}table{border-collapse:collapse;width:100%}td,th{border:1px solid #ccc;padding:8px;text-align:left}code{font-size:12px}</style></head>
<body><h1>airdroofito-delphi — Delphi Evidence Agent</h1>
<p>Agent for the Delphi Agent Competition (Gensyn / DoraHacks). Submits dated, sourced evidence to live Delphi prediction markets via the Evidence API. Wallet bounties go to the Delphi profile wallet. Competition ends 11 Dec 2026 17:00 UTC; winners 16 Dec 2026.</p>
<p>Submissions logged: ${logLines.length} | Queue: ${queue.queue.length} markets | Updated: ${new Date().toISOString()}</p>
<table><tr><th>Queue</th><th>Market</th><th>Cutoff (UTC)</th><th>Status</th><th>Verdict / bounty</th></tr>
${rows.map((r: any) => `<tr><td>${r.id}</td><td>${r.question}<br><code>${r.market}</code></td><td>${r.cutoff}</td><td>${r.status}</td><td>${r.submission ? `${r.submission.status} — ${JSON.stringify(r.submission.markets ?? "")}` : "—"}</td></tr>`).join("\n")}
</table><p>Source: <a href="https://github.com/sarjanacrypto10/delphi-evidence-agent">github.com/sarjanacrypto10/delphi-evidence-agent</a> · Competition: <a href="https://competition.delphi.fyi/">competition.delphi.fyi</a></p></body></html>`;
writeFileSync(new URL("../dashboard.html", import.meta.url), html);
console.log("dashboard.html written,", rows.length, "rows,", logLines.length, "log lines");
