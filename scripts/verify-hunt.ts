import assert from "node:assert/strict";
import { randomBytes, randomUUID } from "node:crypto";
import { spawn, execFileSync, type ChildProcess } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { localAdmin } from "../src/runtime/client";
const directory = mkdtempSync(join(tmpdir(), "ghostops-hunt-e2e-"));
const reservation = createServer(); await new Promise<void>(r => reservation.listen(0, "127.0.0.1", r)); const port = (reservation.address() as { port: number }).port; await new Promise<void>(r => reservation.close(() => r()));
const base = `http://127.0.0.1:${port}`, env = { ...process.env, NODE_ENV: "production" as const, DATABASE_URL: `file:${join(directory, "hunt.db")}`, GHOSTOPS_SIGNING_SECRET: randomBytes(48).toString("hex"), GHOSTOPS_URL: base, GHOSTOPS_RUNTIME_WORKSPACE: join(directory, "workspace"), GHOSTOPS_MODEL_ENABLED: "0", OPENAI_API_KEY: "" };
let server: ChildProcess | undefined, headers: Record<string, string>;
async function start() { server = spawn(process.execPath, ["--import", "tsx", "scripts/server.ts", "--port", String(port)], { env, stdio: "ignore" }); for (let n = 0; n < 100; n++) { if (server.exitCode !== null) throw new Error("Owned isolated server failed"); try { headers = await localAdmin(base); return; } catch { await delay(100); } } throw new Error("Server not ready"); }
async function stop() { if (!server || server.exitCode !== null || server.signalCode !== null) return; const child = server; await new Promise<void>(r => { const timeout = setTimeout(() => child.kill("SIGKILL"), 10000); child.once("exit", () => { clearTimeout(timeout); r(); }); child.kill("SIGTERM"); }); server = undefined; }
async function data() { const r = await fetch(`${base}/api/hunt`, { headers }); assert.equal(r.status, 200); return r.json(); }
async function manage(input: Record<string, unknown>) { const r = await fetch(`${base}/api/hunt`, { method: "POST", headers, body: JSON.stringify({ commandId: randomUUID(), ...input }) }); assert.equal(r.status, 200); return r.json(); }
try {
  execFileSync("npm", ["run", "sdk:build"], { stdio: "pipe" });
  execFileSync(process.execPath, ["node_modules/prisma/build/index.js", "migrate", "deploy"], { env, stdio: "pipe" }); await start();
  const output = join(directory, "organization");
  execFileSync(process.execPath, ["--import", "tsx", "scripts/hunt-demo.ts", "--output", output], { env, stdio: "pipe", timeout: 90000 });
  const result = JSON.parse(await readFile(join(output, "result.json"), "utf8")); assert.equal(result.complete, true); assert.equal(result.authenticated, true); assert.equal(result.tamperRejected, true); assert.equal(result.restoredAccess, true); assert.equal(result.modelCalls, 0);
  const before = await data(); assert.equal(before.plans.find((p: { id: string }) => p.id === result.planId).status, "verified"); assert(before.messages.some((m: { sourceId: string; rootRequestId: string }) => m.sourceId === "untrusted-paper" && m.rootRequestId === result.rootRequestId));
  // A new epoch remains usable after old case evidence, then fresh scoped
  // policy+decoy evidence is eligible for EXPLICIT automatic response.
  await manage({ action: "configure", scopeId: result.scopeId, mode: "AUTOMATIC" });
  const restored = JSON.parse(await readFile(result.restoredFile, "utf8"));
  const callArgs = { requestId: randomUUID(), resource: "decoy/admin" };
  const proof = JSON.parse(execFileSync(process.execPath, ["--input-type=module", "-e", "import {GhostOpsClient} from '@ghostops/sdk'; const i=JSON.parse(process.env.HUNT_IDENTITY); const g=new GhostOpsClient({endpoint:process.env.GHOSTOPS_URL,agentId:i.actorId,sessionId:i.sessionId,credential:i.credential}); try {await g.connect(); const d=await g.requestTool({tool:'restricted_admin',arguments:JSON.parse(process.env.HUNT_REQUEST)}); console.log(JSON.stringify({allowed:d.allowed,reason:d.reason}));} finally {await g.close();}"], { env: { NODE_ENV: "production", PATH: process.env.PATH, GHOSTOPS_URL: base, HUNT_IDENTITY: JSON.stringify(restored), HUNT_REQUEST: JSON.stringify(callArgs) }, encoding: "utf8" })); assert.equal(proof.allowed, false);
  let current = await data(); const newPlan = current.plans.find((p: { actorId: string; id: string; mode: string; status: string }) => p.actorId === result.coordinatorId && p.id !== result.planId && p.mode === "AUTOMATIC" && p.status === "executed"); assert(newPlan);
  await stop(); await start();
  const after = await data(); assert.equal(after.cases.find((c: { id: string }) => c.id === result.caseId).id, result.caseId); assert.equal(after.plans.find((p: { id: string }) => p.id === result.planId).status, "verified"); assert(after.plans.some((p: { id: string }) => p.id === newPlan.id));
  // Genuine tools/call from another OS process, not internal server imports or DB insertion.
  const restarted = JSON.parse(execFileSync(process.execPath, ["--input-type=module", "-e", "const i=JSON.parse(process.env.HUNT_IDENTITY);const r=await fetch(process.env.GHOSTOPS_URL+'/api/mcp',{method:'POST',headers:{'content-type':'application/json',accept:'application/json, text/event-stream',authorization:'Bearer '+i.credential,'x-ghostops-agent':i.actorId,'x-ghostops-session':i.sessionId},body:JSON.stringify({jsonrpc:'2.0',id:1,method:'tools/call',params:{name:'write_summary',arguments:{requestId:process.env.HUNT_REQUEST_ID,resource:'research/summary',content:'Must not execute after restart'}}})});const j=await r.json();console.log(JSON.stringify({status:r.status,reason:j.result?.structuredContent?.reason,allowed:j.result?.structuredContent?.allowed}));"], { env: { NODE_ENV: "production", PATH: process.env.PATH, GHOSTOPS_URL: base, HUNT_IDENTITY: JSON.stringify(restored), HUNT_REQUEST_ID: randomUUID() }, encoding: "utf8" })); assert.equal(restarted.reason, "AGENT_QUARANTINED"); assert.equal(restarted.allowed, false);
  current = await data(); assert.equal(current.plans.find((p: { id: string }) => p.id === newPlan.id).status, "verified");
  const identity = JSON.parse(await readFile(join(output, "OperationsAgent.json"), "utf8"));
  // Actual bounded local tool workload through authenticated HTTP MCP. Timing
  // includes transport, analysis and SQLite, not browser FPS or model inference.
  const timings: number[] = []; const begin = performance.now();
  for (let n = 0; n < 60; n++) {
    const started = performance.now(); const r = await fetch(`${base}/api/mcp`, { method: "POST", headers: { "content-type": "application/json", accept: "application/json, text/event-stream", authorization: `Bearer ${identity.credential}`, "x-ghostops-agent": identity.actorId, "x-ghostops-session": identity.sessionId }, body: JSON.stringify({ jsonrpc: "2.0", id: n + 1, method: "tools/call", params: { name: "operational_status", arguments: { requestId: randomUUID(), resource: "infra/status" } } }) }); assert.equal(r.status, 200); assert.equal((await r.json()).result.structuredContent.allowed, true); timings.push(performance.now() - started);
  }
  const sorted = timings.toSorted((a, b) => a - b), metrics = { requests: timings.length, totalMs: Math.round(performance.now() - begin), p50Ms: Math.round(sorted[Math.floor(sorted.length * .5)]), p95Ms: Math.round(sorted[Math.floor(sorted.length * .95)]), maxMs: Math.round(sorted.at(-1)!), verifierHeapMiB: Math.round(process.memoryUsage().heapUsed / 1024 / 1024), provenance: "60 sequential authenticated mock-status handlers; local wall-clock includes HTTP/hunt/SQLite; verifier heap is NOT server/UI memory", modelCalls: 0 };
  const artifactFlag = process.argv.indexOf("--artifacts");
  if (artifactFlag >= 0) { const artifacts = resolve(process.argv[artifactFlag + 1]); await mkdir(artifacts, { mode: 0o700 }); await writeFile(join(artifacts, "performance.json"), JSON.stringify(metrics, null, 2), { mode: 0o600, flag: "wx" }); await writeFile(join(artifacts, "hunt-original.zip"), await readFile(result.original), { mode: 0o600, flag: "wx" }); await writeFile(join(artifacts, "hunt-tampered.zip"), await readFile(result.tampered), { mode: 0o600, flag: "wx" }); await writeFile(join(artifacts, "verification.json"), JSON.stringify({ ...result, original: "hunt-original.zip", tampered: "hunt-tampered.zip", restoredFile: undefined, performance: metrics, automaticRestartVerified: true, verificationKeyExported: false }, null, 2), { mode: 0o600, flag: "wx" }); }
  console.log("PASS real three-agent/stdio organization, permitted workflow, inherited untrusted source/request provenance, protected-write denial, evidence graph, approved adaptive overlay, approval response/real handler-null verification, authenticated hunt ZIP/tamper, retirement and authorized restored access. Explicit automatic fresh-epoch response and normal restart enforcement pass; no database insertion or inference."); console.log(JSON.stringify(metrics));
} finally { await stop(); rmSync(directory, { recursive: true }); }
