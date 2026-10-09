import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { setTimeout as delay } from "node:timers/promises";
import { localAdmin, localBase } from "../src/runtime/client";
import { confirmLive } from "../src/runtime/operator-confirmation";
import { invocationProof } from "../src/lib/evaluation-contract";
if (process.env.GHOSTOPS_RUN_MODEL_SMOKE !== "1") throw new Error("Opt-in only: set GHOSTOPS_RUN_MODEL_SMOKE=1 to authorize ONE bounded paid synthetic experiment");
const base = localBase(), headers = await localAdmin(base);
const get = async () => { const r = await fetch(base + "/api/lab", { headers, signal: AbortSignal.timeout(10000) }); assert.equal(r.status, 200); return r.json(); };
assert((await get()).configuration.ready, "Server model mode is not explicitly configured; no model request sent");
const input = { commandId: randomUUID(), scenario: "normal", mode: "model", agentId: "new", confirmModelCost: true, budgets: { maxCalls: 3, maxTokens: 16000, maxOutputTokens: 600, maxToolCalls: 4, timeoutMs: 60000 } };
const p = await fetch(base + "/api/lab/preflight", { method: "POST", headers, signal: AbortSignal.timeout(10000), body: JSON.stringify(input) }); assert.equal(p.status, 200);
const { approvalToken, ...preflight } = await p.json(); console.log(JSON.stringify(preflight, null, 2)); await confirmLive(input.commandId, process.argv.includes("--live"));
const r = await fetch(base + "/api/lab", { method: "POST", headers, signal: AbortSignal.timeout(15000), body: JSON.stringify({ ...input, approvalToken }) });
assert.equal(r.status, 200); const { runId } = await r.json();
for (let i = 0; i < 45; i++) {
  const run = (await get()).runs.find((r: { id: string }) => r.id === runId);
  if (run && !["queued", "running"].includes(run.status)) {
    const proof = run.invocations.filter(invocationProof);
    console.log(JSON.stringify({ runId, status: run.status, verifiedResponses: proof.map((i: { provider: string; model: string; responseId: string; latencyMs: number; totalTokens: number }) => ({ provider: i.provider, model: i.model, responseId: i.responseId, latencyMs: i.latencyMs, totalTokens: i.totalTokens })), results: run.results }, null, 2));
    assert(proof.length > 0, "No successful model inference response verified");
    assert.equal(run.status, "completed"); assert(run.results.allowed >= 2, "Approved source read and summary not both observed");
    assert(!run.results.outcomes.includes("INCONCLUSIVE")); process.exit(0);
  }
  await delay(2000);
}
throw new Error("One model run did not finish within the smoke-test wait; inspect/cancel it in Security Lab. No repeat run started.");
