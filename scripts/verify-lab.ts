import assert from "node:assert/strict";
import { spawn, execFileSync, type ChildProcess } from "node:child_process";
import { randomBytes, randomUUID, createHmac } from "node:crypto";
import { mkdtempSync, rmSync } from "node:fs";
import { readdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createServer } from "node:net";
import { setTimeout as delay } from "node:timers/promises";
import { localAdmin } from "../src/runtime/client";
import { scenarios, labStartSchema } from "../src/lib/lab-contract";

const directory = mkdtempSync(join(tmpdir(), "ghostops-lab-e2e-"));
const reservation = createServer(); await new Promise<void>(resolve => reservation.listen(0, "127.0.0.1", resolve));
const port = (reservation.address() as { port: number }).port; await new Promise<void>(resolve => reservation.close(() => resolve()));
const base = `http://127.0.0.1:${port}`, key = randomBytes(48).toString("hex");
const env = { ...process.env, NODE_ENV: "production" as const, DATABASE_URL: `file:${join(directory, "lab.db")}`, GHOSTOPS_SIGNING_SECRET: key, GHOSTOPS_RUNTIME_WORKSPACE: join(directory, "workspace"), GHOSTOPS_MODEL_ENABLED: "0", OPENAI_API_KEY: "" };
let child: ChildProcess | undefined, headers: Record<string, string> = {};
async function start() {
  child = spawn(process.execPath, ["--import", "tsx", "scripts/server.ts", "--port", String(port)], { env, stdio: "ignore" });
  for (let i = 0; i < 100; i++) { if (child.exitCode !== null) throw new Error("Lab server exited before readiness"); try { headers = await localAdmin(base); return; } catch { await delay(200); } }
  throw new Error("Lab server readiness timed out");
}
async function stop() {
  if (!child || child.exitCode !== null) return;
  const owned = child; await new Promise<void>((resolve, reject) => { const timer = setTimeout(() => { owned.kill("SIGKILL"); reject(new Error("Lab server stop timed out")); }, 10000); owned.once("exit", () => { clearTimeout(timer); resolve(); }); owned.kill("SIGTERM"); });
}
async function get(path = "/api/lab") { const r = await fetch(base + path, { headers }); assert.equal(r.status, 200); return r.json(); }
async function post(path: string, body: unknown, expected = 200) { const r = await fetch(base + path, { method: "POST", headers, body: JSON.stringify(body) }); assert.equal(r.status, expected); return r.json(); }
async function finished(id: string) {
  for (let i = 0; i < 100; i++) { const run = (await get()).runs.find((r: { id: string }) => r.id === id); if (run && !["queued", "running"].includes(run.status)) return run; await delay(100); }
  throw new Error("Lab experiment did not finish within bounded verifier timeout");
}
try {
  execFileSync(process.execPath, ["node_modules/prisma/build/index.js", "migrate", "deploy"], { env, stdio: "pipe" }); await start();
  assert.equal((await fetch(base + "/api/lab")).status, 401);
  assert.equal((await fetch(base + "/api/lab", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(labStartSchema.parse({ commandId: randomUUID(), scenario: "normal", mode: "local" })) })).status, 401);
  const wrongCsrf = await fetch(base + "/api/lab", { method: "POST", headers: { ...headers, "x-ghostops-csrf": "wrong" }, body: JSON.stringify(labStartSchema.parse({ commandId: randomUUID(), scenario: "normal", mode: "local" })) }); assert.equal(wrongCsrf.status, 403);
  let contained: { id: string; actorId: string; sessionId: string } | undefined;
  for (const mode of ["local", "offline"] as const) for (const scenario of scenarios) {
    const options = labStartSchema.parse({ commandId: randomUUID(), scenario, mode });
    const receipt = await post("/api/lab", options), run = await finished(receipt.runId);
    assert.equal(run.status, "completed", `${mode}/${scenario} did not complete`);
    assert.equal(run.invocations.length, 0); assert.equal(run.results.verifiedModelCalls, 0);
    if (mode === "offline") assert.equal(run.results.handlerExecutions, 0);
    if (scenario === "normal") { assert.equal(run.results.denied, 0); assert.equal(run.results.incidents.length, 0); }
    else assert(run.results.denied >= 1);
    if (scenario === "memory-poisoning") assert(run.observations.find((o: { kind: string }) => o.kind === "MEMORY_VERIFICATION").details.originalIntact);
    if (scenario === "impersonation") { assert(run.events.some((e: { kind: string; identityVerified: boolean }) => e.kind === "INVALID_CREDENTIAL" && !e.identityVerified)); assert(run.events.some((e: { kind: string }) => e.kind === "UNKNOWN_IDENTITY")); }
    if (scenario === "containment" && mode === "local") contained = run;
    const before = (await get("/api/state")).stats.requests;
    assert.equal((await post("/api/lab", options)).replayed, true); await get(); assert.equal((await get("/api/state")).stats.requests, before);
  }
  assert(contained);
  const beforeFiles = await readdir(env.GHOSTOPS_RUNTIME_WORKSPACE);
  await stop(); await start();
  const snapshot = await get(); assert.equal(snapshot.runs.length, 12);
  assert(snapshot.runs.every((r: { status: string }) => r.status === "completed"));
  const credential = createHmac("sha256", key).update(`agent-credential:lab-run:${contained.id}`).digest("hex"), requestId = randomUUID();
  const rpc = await fetch(base + "/api/mcp", { method: "POST", headers: { authorization: `Bearer ${credential}`, "x-ghostops-agent": contained.actorId, "x-ghostops-session": contained.sessionId, "content-type": "application/json", accept: "application/json, text/event-stream", "mcp-protocol-version": "2025-11-25" }, body: JSON.stringify({ jsonrpc: "2.0", id: requestId, method: "tools/call", params: { name: "write_summary", arguments: { requestId, resource: "research/summary", content: "Restart containment verification must not execute" } } }) });
  assert.equal(rpc.status, 200); assert.equal((await rpc.json()).result.structuredContent.reason, "AGENT_QUARANTINED");
  assert.deepEqual(await readdir(env.GHOSTOPS_RUNTIME_WORKSPACE), beforeFiles);
  // A separate process creates a lease and exits before dispatch; the server must interrupt it, not resume.
  const queued = JSON.parse(execFileSync(process.execPath, ["--import", "tsx", "--input-type=module", "-e", 'const { startExperiment } = await import("./src/server/lab.ts"); const { labStartSchema } = await import("./src/lib/lab-contract.ts"); const { db } = await import("./src/server/db.ts"); console.log(JSON.stringify(await startExperiment(labStartSchema.parse({commandId:crypto.randomUUID(),scenario:"normal",mode:"local"})))); await db.$disconnect();'], { env, encoding: "utf8", timeout: 15000 }));
  assert.equal((await finished(queued.runId)).status, "interrupted");
  const preserved = (await get()).runs.length;
  await post("/api/control", { commandId: randomUUID(), action: "runtime-memory-drill", targetId: contained.actorId });
  await post("/api/control", { commandId: randomUUID(), action: "reset" });
  assert.equal((await get()).runs.length, preserved);
  assert((await get()).runs.find((r: { mode: string; scenario: string }) => r.mode === "offline" && r.scenario === "impersonation").events.some((e: { kind: string }) => e.kind === "UNKNOWN_IDENTITY"));
  const current = await get("/api/state"); assert(current.memories.some((m: { ownerId: string; integrity: string; restoredFromId: string }) => m.ownerId === contained.actorId && m.integrity === "verified" && m.restoredFromId));
  const cli = execFileSync(process.execPath, ["--import", "tsx", "scripts/lab.ts", "--scenario", "normal", "--mode", "local"], { env: { ...env, GHOSTOPS_URL: base }, encoding: "utf8", timeout: 20000 });
  assert(cli.includes('"status": "completed"')); assert(cli.includes('"verifiedModelCalls": 0'));
  console.log("PASS Security Lab production HTTP: 12 A–F local/offline runs, real MCP handlers, protected memory, unknown/spoofed attribution, evidence correlation, idempotency, CSRF, restart containment, stale-worker interruption, signed restoration and demo-reset preservation. Actual inference calls: 0.");
} finally { await stop(); rmSync(directory, { recursive: true }); }
