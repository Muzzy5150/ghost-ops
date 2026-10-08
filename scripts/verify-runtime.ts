import assert from "node:assert/strict";
import { spawn, execFileSync, type ChildProcess } from "node:child_process";
import { randomBytes, randomUUID } from "node:crypto";
import { mkdtempSync, rmSync } from "node:fs";
import { readFile, readdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createServer } from "node:net";
import { setTimeout as delay } from "node:timers/promises";
import { LocalAgentClient, localAdmin } from "../src/runtime/client";
import { runtimeIdentitySchema } from "../src/lib/runtime-contract";

const directory = mkdtempSync(join(tmpdir(), "ghostops-runtime-e2e-"));
const reservation = createServer();
await new Promise<void>(resolve => reservation.listen(0, "127.0.0.1", resolve));
const port = (reservation.address() as { port: number }).port;
await new Promise<void>(resolve => reservation.close(() => resolve()));
const base = `http://127.0.0.1:${port}`;
const env = { ...process.env, NODE_ENV: "production" as const, DATABASE_URL: `file:${join(directory, "runtime.db")}`, GHOSTOPS_SIGNING_SECRET: randomBytes(48).toString("hex"), GHOSTOPS_RUNTIME_WORKSPACE: join(directory, "workspace"), GHOSTOPS_CLIENT_DIR: join(directory, "clients"), GHOSTOPS_URL: base, GHOSTOPS_MODEL_ENABLED: "0", OPENAI_API_KEY: "" };
let server: ChildProcess | undefined, log = "", headers: Record<string, string>;
const clients: LocalAgentClient[] = [];
async function start() {
  log = "";
  const launched = spawn(process.execPath, ["--import", "tsx", "scripts/server.ts", "--port", String(port)], { env, stdio: ["ignore", "pipe", "pipe"] });
  server = launched;
  launched.stdout?.on("data", d => { log = (log + d).slice(-3000); });
  launched.stderr?.on("data", d => { log = (log + d).slice(-3000); });
  for (let i = 0; i < 100; i++) {
    if (launched.exitCode !== null) throw new Error("Production runtime server exited before readiness");
    try { headers = await localAdmin(base); return; } catch { await delay(200); }
  }
  throw new Error("Production runtime readiness timed out");
}
async function stop() {
  if (!server || server.exitCode !== null) return;
  const child = server;
  await new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => { child.kill("SIGKILL"); reject(new Error("Runtime server shutdown timed out")); }, 10_000);
    child.once("exit", () => { clearTimeout(timer); resolve(); }); child.kill("SIGTERM");
  });
}
async function state() { const r = await fetch(`${base}/api/state`, { headers }); assert.equal(r.status, 200); return r.json(); }
async function control(action: string, targetId?: string) {
  const r = await fetch(`${base}/api/control`, { method: "POST", headers, body: JSON.stringify({ commandId: randomUUID(), action, ...(targetId ? { targetId } : {}) }) });
  assert.equal(r.status, 200); return r.json();
}
function cli(...args: string[]) { return execFileSync(process.execPath, ["--import", "tsx", "scripts/agent.ts", ...args], { env, encoding: "utf8", timeout: 30_000 }); }
try {
  execFileSync(process.execPath, ["node_modules/prisma/build/index.js", "migrate", "deploy"], { env, stdio: "pipe" });
  await start();
  // Independently preserve and rerun the original HTTP demonstration before live enrollment.
  execFileSync(process.execPath, ["--import", "tsx", "scripts/verify-api.ts"], { env: { ...env, GHOSTOPS_TEST_URL: base }, stdio: "pipe", timeout: 60_000 });
  console.log("PASS existing A/B/C/D scenarios and original HTTP security checks on the Phase 3 build.");
  await control("reset");
  assert.equal((await fetch(`${base}/api/runtime/enroll`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ commandId: randomUUID(), actorId: "live-forged", credential: "a".repeat(64) }) })).status, 401);
  cli("--provision", "--id", "live-e2e");
  const normal = JSON.parse(cli("--id", "live-e2e", "--task", "Summarize approved research"));
  assert.equal(normal.mode, "offline-scripted"); assert.equal(normal.modelCalls, 0); assert.equal(normal.requests.length, 4); assert(normal.requests.every((r: { allowed: boolean }) => r.allowed));
  let snapshot = await state();
  const write = snapshot.runtimeRequests.find((r: { tool: string }) => r.tool === "summarize");
  assert.equal(await readFile(join(env.GHOSTOPS_RUNTIME_WORKSPACE, write.execution.artifact), "utf8"), normal.outcome);
  assert.equal(snapshot.incidents.length, 0);
  assert.equal(snapshot.mode, "local-runtime-and-simulation");
  await control("freeze-runtime-baseline", "live-e2e");
  const identity = runtimeIdentitySchema.parse(JSON.parse(await readFile(join(env.GHOSTOPS_CLIENT_DIR, "live-e2e.json"), "utf8")));
  const client = new LocalAgentClient(identity, base); clients.push(client); await client.connect();
  const duplicateId = randomUUID();
  const first = await client.call("write_summary", "research/summary", "Idempotent real file", duplicateId);
  assert(first.allowed); assert((await client.call("write_summary", "research/summary", "Idempotent real file", duplicateId)).replayed);
  const entries = await readdir(env.GHOSTOPS_RUNTIME_WORKSPACE); assert.equal(entries.length, 2);
  assert.equal(JSON.parse(cli("--id", "live-e2e", "--task", "Read the untrusted document")).modelCalls, 0);
  const poison = await client.call("write_memory", "memory/runtime-policy", "Persist synthetic elevated permission");
  assert.equal(poison.reason, "PROTECTED_MEMORY_WRITE_REQUIRES_ADMIN");
  assert((await client.call("write_summary", "research/summary", "Legitimate task still completes")).allowed);
  assert((await client.call("write_memory", "memory/runtime-notes", "Untrusted facts remain data, never policy")).allowed);
  const trap = await client.call("read_document", "decoy/credentials"); assert.equal(trap.incidentId, poison.incidentId);
  snapshot = await state();
  assert.equal(snapshot.incidents.find((i: { id: string }) => i.id === trap.incidentId).severity, "critical");
  const before = await readdir(env.GHOSTOPS_RUNTIME_WORKSPACE);
  const blocked = await client.call("write_summary", "research/summary", "quarantine bypass"); assert.equal(blocked.reason, "AGENT_QUARANTINED");
  assert.deepEqual(await readdir(env.GHOSTOPS_RUNTIME_WORKSPACE), before);
  assert.equal((await state()).runtimeRequests.find((r: { id: string }) => r.id === blocked.requestId).execution, null);
  assert.equal((await client.call("write_summary", "research/summary", "Idempotent real file", duplicateId)).allowed, false);
  await stop(); await start();
  assert.equal((await client.call("write_summary", "research/summary", "restart bypass")).reason, "AGENT_QUARANTINED");
  assert.deepEqual(await readdir(env.GHOSTOPS_RUNTIME_WORKSPACE), before);
  const restored = await control("runtime-memory-drill", identity.actorId);
  assert.equal(restored.result.tamperDetected, true); assert.equal(restored.result.restorationVerified, true);
  await control("reset");
  snapshot = await state(); assert.equal(snapshot.agents.find((a: { id: string }) => a.id === identity.actorId).status, "quarantined");
  assert(snapshot.runtimeRequests.length > 0); assert(snapshot.incidents.some((i: { actorId: string }) => i.actorId === identity.actorId));
  await control("restore-agent", identity.actorId);
  assert.equal((await client.call("read_document", "docs/research")).reason, "CREDENTIAL_REVOKED");
  assert(!JSON.stringify(await state()).includes(identity.credential));
  console.log("PASS real MCP client + separate agent processes: fixture read, file write, signed notes, untrusted provenance, denial, correlation, containment, restart, restoration and simulation reset preservation. Model calls: 0.");
  // Execute the exact presenter CLI, using a fresh identity and its real gateway.
  cli("--provision", "--id", "live-presenter");
  const story = execFileSync(process.execPath, ["--import", "tsx", "scripts/live-demo.ts", "--id", "live-presenter"], { env, encoding: "utf8", timeout: 30_000 });
  assert(story.includes("Complete.")); assert(story.includes('"handlerExecuted":false'));
  console.log("PASS exact live demo CLI, including unregistered actor MCP interaction and explicit fault-injection restoration.");
} catch (error) {
  // Do not print raw credentials, environment values, prompts or captured server logs.
  void log;
  throw error;
} finally {
  for (const client of clients) await client.close();
  await stop(); rmSync(directory, { recursive: true });
}
