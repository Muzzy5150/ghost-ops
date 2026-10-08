import { randomUUID } from "node:crypto";
import { setTimeout as delay } from "node:timers/promises";
import { labStartSchema, labCancelSchema } from "../src/lib/lab-contract";
import { localAdmin, localBase } from "../src/runtime/client";
import { confirmLive } from "../src/runtime/operator-confirmation";
const args = process.argv.slice(2), base = localBase(), headers = await localAdmin(base);
const value = (flag: string, fallback: string) => args.includes(flag) ? args[args.indexOf(flag) + 1] : fallback;
const get = async () => { const response = await fetch(`${base}/api/lab`, { headers, redirect: "error", signal: AbortSignal.timeout(10000) }); if (!response.ok) throw new Error("Lab read unavailable; apply the additive migration and run the new build"); return response.json(); };
try {
  if (args.includes("--list")) {
    const history = await get(); console.log(JSON.stringify({ configuration: history.configuration, runs: history.runs.map((r: { id: string; scenario: string; mode: string; status: string; actorId: string; results: unknown }) => ({ id: r.id, scenario: r.scenario, mode: r.mode, status: r.status, actorId: r.actorId, results: r.results })) }, null, 2));
  } else {
    const cancel = args.includes("--cancel");
    const payload = cancel ? labCancelSchema.parse({ commandId: value("--command-id", randomUUID()), runId: value("--cancel", "") })
      : labStartSchema.parse({ commandId: value("--command-id", randomUUID()), scenario: value("--scenario", "normal"), scenarioVersion: value("--version", "2.0"), variant: value("--variant", "standard"), mode: value("--mode", "local"), agentId: value("--agent", "new"), confirmModelCost: args.includes("--allow-model-cost"), confirmContainment: args.includes("--confirm-containment") });
    console.log(`Operator command ${payload.commandId}; only one dispatch, no automatic retry.`);
    if (!cancel && "mode" in payload && (payload.mode === "model" || args.includes("--dry-run"))) {
      const response = await fetch(`${base}/api/lab/preflight`, { method: "POST", headers, redirect: "error", signal: AbortSignal.timeout(10000), body: JSON.stringify(payload) });
      if (!response.ok) throw new Error("Preflight failed");
      const preflight = await response.json(); const { approvalToken, ...display } = preflight; console.log(JSON.stringify(display, null, 2));
      if (args.includes("--dry-run")) process.exit(0);
      if (!preflight.canExecute) throw new Error("Provider not configured");
      await confirmLive(payload.commandId, args.includes("--live")); payload.approvalToken = approvalToken;
    }
    const response = await fetch(`${base}/api/lab${cancel ? "/cancel" : ""}`, { method: "POST", headers, redirect: "error", signal: AbortSignal.timeout(15000), body: JSON.stringify(payload) });
    if (!response.ok) throw new Error("Lab command denied; check configuration, consent, active run or identity status");
    const receipt = await response.json(); console.log(JSON.stringify(receipt));
    if (!cancel) {
      let completed = false;
      for (let i = 0; i < 100; i++) {
        const run = (await get()).runs.find((r: { id: string }) => r.id === receipt.runId);
        if (run && !["queued", "running"].includes(run.status)) {
          console.log(JSON.stringify({ id: run.id, scenario: run.scenario, mode: run.mode, status: run.status, actorId: run.actorId, results: run.results, modelInvocations: run.invocations }, null, 2)); completed = true;
          if (run.status !== "completed") process.exitCode = 1;
          break;
        }
        await delay(1000);
      }
      if (!completed) throw new Error("Run is still pending; inspect/cancel the persisted run. No second run dispatched");
    }
  }
} catch { console.error("Security Lab CLI did not complete. Inspect its printed command/run ID; do not blindly create a new paid run after a timeout. No secrets or provider errors printed."); process.exitCode = 1; }
