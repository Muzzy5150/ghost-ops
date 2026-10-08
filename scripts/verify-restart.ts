import assert from "node:assert/strict";
import { createHmac, randomBytes, randomUUID } from "node:crypto";
import { spawn, execFileSync, type ChildProcess } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createServer } from "node:net";
import { setTimeout as delay } from "node:timers/promises";

// Disposable database and a separate signing root; never touches the presenter's demo.
const directory = mkdtempSync(join(tmpdir(), "ghostops-restart-"));
const signingKey = randomBytes(48).toString("hex");
const env: NodeJS.ProcessEnv = { ...process.env, DATABASE_URL: `file:${join(directory, "restart.db")}`, GHOSTOPS_SIGNING_SECRET: signingKey, NODE_ENV: "production" };
const credential = createHmac("sha256", signingKey).update("agent-credential:research-credential-v1").digest("hex");
const reservation = createServer();
await new Promise<void>((resolve, reject) => { reservation.once("error", reject); reservation.listen(0, "127.0.0.1", resolve); });
const port = (reservation.address() as { port: number }).port;
await new Promise<void>(resolve => reservation.close(() => resolve()));
const base = `http://127.0.0.1:${port}`;
let child: ChildProcess | undefined, headers: Record<string, string>;
let serverLog = "";
async function start() {
  serverLog = "";
  const launched = spawn(process.execPath, ["--import", "tsx", "scripts/server.ts", "--port", String(port)], { env, stdio: ["ignore", "pipe", "pipe"] });
  child = launched;
  launched.stdout?.on("data", data => { serverLog = (serverLog + data).slice(-4000); });
  launched.stderr?.on("data", data => { serverLog = (serverLog + data).slice(-4000); });
  for (let i = 0; i < 100; i++) {
    if (launched.exitCode !== null) throw new Error(`Server exited before readiness: ${serverLog.replaceAll(signingKey, "[redacted]")}`);
    try {
      const response = await fetch(`${base}/api/bootstrap`, { signal: AbortSignal.timeout(1000) });
      if (response.ok) {
        const data = await response.json();
        headers = { cookie: response.headers.get("set-cookie")!.split(";")[0], origin: base, "x-ghostops-csrf": data.csrf, "content-type": "application/json" };
        return;
      }
    } catch { /* readiness only, bounded to twenty seconds */ }
    await delay(200);
  }
  throw new Error("Production server readiness timed out");
}
async function stop() {
  if (!child || child.exitCode !== null) return;
  const processToStop = child;
  await new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => { processToStop.kill("SIGKILL"); reject(new Error("Server shutdown timed out")); }, 10000);
    processToStop.once("exit", () => { clearTimeout(timer); resolve(); });
    processToStop.kill("SIGTERM");
  });
}
async function state() { const r = await fetch(`${base}/api/state`, { headers }); assert.equal(r.status, 200); return r.json(); }
async function control(action: string, targetId?: string, expectedStep?: number, commandId = randomUUID()) {
  const r = await fetch(`${base}/api/control`, { method: "POST", headers, body: JSON.stringify({ action, commandId, targetId, expectedStep }) });
  const data = await r.json(); assert.equal(r.status, 200, JSON.stringify(data)); return data;
}
const action = () => ({ requestId: randomUUID(), actorId: "research", sessionId: "research-session-v1", tool: "documents", operation: "read", resource: "docs/research" });
async function ingest(payload: ReturnType<typeof action>, secret = credential) {
  const r = await fetch(`${base}/api/ingest`, { method: "POST", headers: { "content-type": "application/json", authorization: `Bearer ${secret}` }, body: JSON.stringify(payload) });
  return { status: r.status, ...(await r.json()) };
}

try {
  execFileSync(process.execPath, ["node_modules/prisma/build/index.js", "migrate", "deploy"], { env, stdio: "pipe" });
  await start(); await control("reset");
  const cached = action(); assert.equal((await ingest(cached)).allowed, true);
  assert.equal((await ingest({ ...action(), operation: "ingest", resource: "docs/untrusted" })).allowed, true);
  assert.equal((await state()).sessions.find((s: { id: string }) => s.id === cached.sessionId).sourceTrust, "untrusted");
  assert.equal((await ingest(action(), "forged-credential")).reason, "INVALID_CREDENTIAL");
  assert.equal((await ingest(action(), "")).status, 401);
  const victim = await ingest({ ...action(), tool: "memory", operation: "write", resource: "memory/research-policy", content: "synthetic poison" } as ReturnType<typeof action>);
  const impostor = await ingest({ ...action(), tool: "credentials", resource: "decoy/credentials" }, "forged-credential");
  assert.equal(victim.allowed, false);
  assert.equal(impostor.reason, "INVALID_CREDENTIAL");
  assert.notEqual(victim.incidentId, impostor.incidentId);
  assert.equal((await state()).agents.find((a: { id: string }) => a.id === "research").status, "active");
  const unauthenticatedRestore = await fetch(`${base}/api/control`, { method: "POST", headers: { "content-type": "application/json", authorization: `Bearer ${credential}` }, body: JSON.stringify({ commandId: randomUUID(), action: "restore-memory", targetId: (await state()).memories[0].id }) });
  assert.equal(unauthenticatedRestore.status, 401);
  await control("quarantine", "research");
  assert.equal((await ingest(cached)).allowed, false);
  await stop(); await start();
  assert.equal((await state()).agents.find((a: { id: string }) => a.id === "research").status, "quarantined");
  assert.equal((await ingest(action())).reason, "AGENT_QUARANTINED");
  assert.equal((await ingest(cached)).output, null);
  assert.equal((await state()).actions.length, 1);
  await control("restore-agent", "research");
  assert.equal((await ingest(cached)).reason, "CREDENTIAL_REVOKED");
  console.log("PASS restart: quarantine, revoked credential, cached-output denial and idempotent audit survive a fresh server process.");

  await control("reset");
  const runId = (await control("start-story")).result.runId;
  for (let step = 0; step < 9; step++) await control("advance-story", runId, step);
  const before = await state();
  assert.equal(before.memories[0].integrity, "tampered");
  assert.equal(before.agents.find((a: { id: string }) => a.id === "research").status, "quarantined");
  await stop(); await start();
  const resumed = await state();
  assert.equal(resumed.runs.find((r: { id: string }) => r.id === runId).results.nextStep, 9);
  assert.equal((await ingest(action())).allowed, false);
  const commandId = randomUUID();
  await control("advance-story", runId, 9, commandId);
  assert.equal((await control("advance-story", runId, 9, commandId)).replayed, true);
  const finished = await state();
  assert.deepEqual({ requests: finished.stats.requests, blocked: finished.stats.blocked, incidents: finished.stats.incidents, quarantined: finished.stats.quarantined, trapTriggers: finished.stats.trapTriggers }, { requests: 28, blocked: 7, incidents: 3, quarantined: 1, trapTriggers: 3 });
  // The extra post-restart old-session denial is a separate genuine investigation.
  assert.equal(finished.memories[0].integrity, "verified");
  assert.equal(finished.runs.find((r: { id: string }) => r.id === runId).status, "completed");
  const replay = await control("replay", runId);
  assert.equal(replay.result.readOnlyReplay, true);
  console.log("PASS story restart: ten real steps, tamper detection persists, authorized restoration resumes, replay cannot duplicate effects.");
} finally {
  await stop();
  rmSync(directory, { recursive: true });
}
