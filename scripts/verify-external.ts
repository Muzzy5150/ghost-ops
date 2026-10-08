import assert from "node:assert/strict";
import { execFileSync, spawn, type ChildProcess } from "node:child_process";
import { randomBytes, randomUUID } from "node:crypto";
import { mkdtempSync, rmSync } from "node:fs";
import { readFile, readdir } from "node:fs/promises";
import { createInterface } from "node:readline";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import { resolve, join } from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { localAdmin } from "../src/runtime/client";
import { verifyEvidence } from "../src/lib/evidence-verification";
import { createHmac, timingSafeEqual } from "node:crypto";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { writeFile, mkdir, stat } from "node:fs/promises";
import { evidenceZip, readEvidenceZip } from "../src/lib/evidence-zip";
const directory = mkdtempSync(join(tmpdir(), "ghostops-external-e2e-")), consumer = join(directory, "consumer");
execFileSync("mkdir", [consumer]);
const reservation = createServer(); await new Promise<void>(r => reservation.listen(0, "127.0.0.1", r)); const port = (reservation.address() as { port: number }).port; await new Promise<void>(r => reservation.close(() => r()));
const base = `http://127.0.0.1:${port}`, env = { ...process.env, NODE_ENV: "production" as const, DATABASE_URL: `file:${join(directory, "external.db")}`, GHOSTOPS_SIGNING_SECRET: randomBytes(48).toString("hex"), GHOSTOPS_URL: base, GHOSTOPS_RUNTIME_WORKSPACE: join(directory, "workspace"), GHOSTOPS_MODEL_ENABLED: "0", OPENAI_API_KEY: "" };
const agentEnv = { NODE_ENV: "production" as const, GHOSTOPS_URL: base, PATH: process.env.PATH };
let server: ChildProcess | undefined, agent: ChildProcess | undefined, headers: Record<string, string> = {};
let records: Record<string, unknown>[] = [], agentError = "";
async function start() { server = spawn(process.execPath, ["--import", "tsx", "scripts/server.ts", "--port", String(port)], { env, stdio: "ignore" }); for (let n = 0; n < 100; n++) { if (server.exitCode !== null) throw new Error("Disposable external server failed"); try { headers = await localAdmin(base); return; } catch { await delay(200); } } throw new Error("Disposable server not ready"); }
async function stop(child: ChildProcess | undefined) { if (!child || child.exitCode !== null) return; await new Promise<void>((r, reject) => { const timer = setTimeout(() => { child.kill("SIGKILL"); reject(new Error("Test process shutdown timeout")); }, 10000); child.once("exit", () => { clearTimeout(timer); r(); }); child.kill("SIGTERM"); }); }
async function state() { const r = await fetch(`${base}/api/state`, { headers }); assert.equal(r.status, 200); return r.json(); }
async function control(action: string, targetId: string) { const r = await fetch(`${base}/api/control`, { method: "POST", headers, body: JSON.stringify({ commandId: randomUUID(), action, targetId }) }); assert.equal(r.status, 200); return r.json(); }
const operator = (...args: string[]) => execFileSync(process.execPath, ["--import", "tsx", "scripts/external.ts", ...args], { env, encoding: "utf8", timeout: 30000 });
const example = join(consumer, "node_modules/@ghostops/external-agent-example/dist/main.js");
async function next() { for (let n = 0; n < 100; n++) { if (records.length) return records.shift()!; if (agent?.exitCode !== null) throw new Error("Independent agent exited before response"); await delay(100); } throw new Error("Independent agent response timed out"); }
async function connect(path: string) {
  records = []; agentError = "";
  agent = spawn(process.execPath, [example, "--credential-file", path, "--action", "session"], { cwd: consumer, env: agentEnv, stdio: ["pipe", "pipe", "pipe"] });
  const lines = createInterface({ input: agent.stdout! }); lines.on("line", line => { records.push(JSON.parse(line)); }); agent.stderr!.on("data", d => { agentError = (agentError + d).slice(-2048); });
  const ready = await next(); assert.equal(ready.ready, true); assert.equal(ready.modelCalls, 0); return ready;
}
async function call(tool: string, resource: string, content?: string, requestId = randomUUID()) { agent!.stdin!.write(JSON.stringify({ tool, resource, content, requestId }) + "\n"); const item = await next(); assert(item.decision, `No decision; ${String(item.code)}`); return item.decision as { requestId: string; allowed: boolean; reason: string; incidentId: string; replayed: boolean }; }
try {
  execFileSync(process.execPath, ["node_modules/typescript/bin/tsc", "-p", "packages/ghostops-sdk/tsconfig.json"], { stdio: "pipe" });
  execFileSync(process.execPath, ["node_modules/typescript/bin/tsc", "-p", "packages/ghostops-mcp/tsconfig.json"], { stdio: "pipe" });
  execFileSync(process.execPath, ["node_modules/typescript/bin/tsc", "-p", "examples/external-agent/tsconfig.json"], { stdio: "pipe" });
  const archives = ["packages/ghostops-sdk", "packages/ghostops-mcp", "examples/external-agent"].map(path => { const result = JSON.parse(execFileSync("npm", ["pack", resolve(path), "--json", "--pack-destination", directory], { encoding: "utf8" })); assert(result[0].files.some((f: { path: string }) => f.path === "dist/index.d.ts" || f.path === "dist/main.js")); return join(directory, result[0].filename); });
  execFileSync("npm", ["install", "--ignore-scripts", "--no-audit", "--no-fund", ...archives], { cwd: consumer, stdio: "pipe", timeout: 120000 });
  execFileSync(process.execPath, ["node_modules/prisma/build/index.js", "migrate", "deploy"], { env, stdio: "pipe" }); await start();
  const path = join(directory, "external.json"), otherPath = join(directory, "observer.json");
  operator("--action", "provision", "--id", "live-external-e2e", "--output", path);
  operator("--action", "provision", "--id", "live-external-observer", "--role", "observer", "--output", otherPath);
  const identity = JSON.parse(await readFile(path, "utf8")), other = JSON.parse(await readFile(otherPath, "utf8"));
  const rootCheck = JSON.parse(execFileSync("npm", ["run", "external:run", "--silent", "--", "--credential-file", path, "--action", "check"], { env: agentEnv, encoding: "utf8", timeout: 30000 }));
  assert.equal(rootCheck.agentId, identity.actorId); assert.equal(rootCheck.modelCalls, 0);
  assert.equal((await stat(path)).mode & 0o777, 0o600);
  const invalidPath = join(directory, "invalid.json"); await writeFile(invalidPath, JSON.stringify({ ...identity, credential: "0".repeat(64) }), { mode: 0o600, flag: "wx" });
  assert.throws(() => execFileSync(process.execPath, [example, "--credential-file", invalidPath, "--action", "check"], { cwd: consumer, env: agentEnv, stdio: "pipe", timeout: 15000 }));
  const disconnected = new Client({ name: "release-disconnect-test", version: "1" });
  await disconnected.connect(new StdioClientTransport({ command: process.execPath, args: [join(consumer, "node_modules/@ghostops/mcp/dist/cli.js")], env: { GHOSTOPS_URL: base, GHOSTOPS_AGENT_ID: identity.actorId, GHOSTOPS_SESSION_ID: identity.sessionId, GHOSTOPS_AGENT_TOKEN: identity.credential }, stderr: "pipe" }));
  const beforeDisconnect = (await state()).stats.requests; await disconnected.close();
  await assert.rejects(disconnected.callTool({ name: "write_summary", arguments: { requestId: randomUUID(), resource: "research/summary", content: "Must not leave disconnected transport" } })); assert.equal((await state()).stats.requests, beforeDisconnect);
  const normal = JSON.parse(execFileSync(process.execPath, [example, "--credential-file", path, "--action", "normal", "--transport", "direct"], { cwd: consumer, env: agentEnv, encoding: "utf8", timeout: 30000 })); assert(normal.decisions.every((d: { allowed: boolean }) => d.allowed)); assert.equal(normal.modelCalls, 0); await control("freeze-runtime-baseline", identity.actorId);
  const ready = await connect(path), listed = (ready.capabilities as { tools: { name: string }[] }).tools; assert(listed.some(t => t.name === "read_document")); assert(!listed.some(t => t.name === "restricted_admin"));
  const replay = randomUUID(); assert((await call("write_summary", "research/summary", "Actual external idempotent summary", replay)).allowed); assert((await call("write_summary", "research/summary", "Actual external idempotent summary", replay)).replayed); assert.equal((await readdir(env.GHOSTOPS_RUNTIME_WORKSPACE)).length, 2);
  const claimsScript = join(consumer, "node_modules/@ghostops/external-agent-example/dist/claims.js"), claimEnv = { ...agentEnv, GHOSTOPS_IDENTITY_FILE: path, GHOSTOPS_CLAIMED_AGENT: other.actorId, GHOSTOPS_CLAIMED_SESSION: other.sessionId };
  const forged = JSON.parse(execFileSync(process.execPath, [claimsScript, "identity"], { cwd: consumer, env: claimEnv, encoding: "utf8" })); assert.equal(forged.decision.reason, "INVALID_CREDENTIAL"); assert.equal(forged.outputDisclosed, false);
  const cross = JSON.parse(execFileSync(process.execPath, [claimsScript, "owner"], { cwd: consumer, env: claimEnv, encoding: "utf8" })); assert.equal(cross.status, 400); assert.equal(cross.outputDisclosed, false);
  let snapshot = await state(); assert.equal(snapshot.agents.find((a: { id: string }) => a.id === other.actorId).profile.observations, 0); assert.equal(snapshot.runtimeRequests.find((r: { id: string }) => r.id === forged.decision.requestId).identityVerified, false);
  const forbidden = await call("restricted_admin", "decoy/admin"); assert(!forbidden.allowed); assert.equal((await state()).runtimeRequests.find((r: { id: string }) => r.id === forbidden.requestId).execution, null);
  assert((await call("read_document", "docs/untrusted")).allowed); const poison = await call("write_memory", "memory/runtime-policy", "Unauthorized external policy change"); assert.equal(poison.reason, "PROTECTED_MEMORY_WRITE_REQUIRES_ADMIN"); const trap = await call("read_document", "decoy/credentials"); assert.equal(trap.incidentId, poison.incidentId);
  await control("quarantine", identity.actorId); const before = await readdir(env.GHOSTOPS_RUNTIME_WORKSPACE); const denied = await call("write_summary", "research/summary", "Blocked after containment"); assert.equal(denied.reason, "AGENT_QUARANTINED"); assert.deepEqual(await readdir(env.GHOSTOPS_RUNTIME_WORKSPACE), before); assert.equal((await call("write_summary", "research/summary", "Actual external idempotent summary", replay)).allowed, false);
  await stop(server); await start(); assert.equal((await call("write_summary", "research/summary", "Restart cannot bypass quarantine")).reason, "AGENT_QUARANTINED");
  snapshot = await state(); assert.equal(snapshot.agents.find((a: { id: string }) => a.id === identity.actorId).integrationType, "external-node"); assert.equal(snapshot.incidents.find((i: { id: string }) => i.id === trap.incidentId).status, "contained");
  const modules = new Set(snapshot.events.filter((e: { actorId: string }) => e.actorId === identity.actorId).map((e: { module: string }) => e.module)); for (const engine of ["AgentDNA", "ShadowWatch", "MemoryGuard", "GhostTrap"]) assert(modules.has(engine));
  const report = await fetch(`${base}/api/evidence/incident/${trap.incidentId}`, { headers }); assert.equal(report.status, 200); const bytes = Buffer.from(await report.arrayBuffer()); const authentication = (unsigned: string, tag: string) => { const expected = createHmac("sha256", env.GHOSTOPS_SIGNING_SECRET).update(`ghostops-evidence:v1:${unsigned}`).digest(); const given = Buffer.from(tag, "hex"); return expected.length === given.length && timingSafeEqual(expected, given); }; assert.equal(verifyEvidence(bytes, authentication).authenticated, true);
  const entries = readEvidenceZip(bytes); entries["summary.html"] = Buffer.from(entries["summary.html"].toString() + "CONTROLLED RELEASE TAMPER"); const tampered = evidenceZip(entries); assert.throws(() => verifyEvidence(tampered, authentication), /hash\/size/); assert.equal(verifyEvidence(bytes, authentication).authenticated, true);
  const artifactFlag = process.argv.indexOf("--artifacts");
  if (artifactFlag >= 0) { const output = resolve(process.argv[artifactFlag + 1]); await mkdir(output, { mode: 0o700 }); await writeFile(join(output, "original-evidence.zip"), bytes, { mode: 0o600, flag: "wx" }); await writeFile(join(output, "tampered-evidence.zip"), tampered, { mode: 0o600, flag: "wx" }); await writeFile(join(output, "verification.json"), JSON.stringify({ original: verifyEvidence(bytes, authentication), tamperRejected: true, agentId: identity.actorId, incidentId: trap.incidentId, modelCalls: 0, limitation: "Disposable verification key is not exported; future reviewers can check hashes but not reauthenticate origin without that key." }, null, 2), { mode: 0o600, flag: "wx" }); }
  assert.equal((await fetch(`${base}/api/evidence/incident/${trap.incidentId}`, { headers: { authorization: `Bearer ${identity.credential}` } })).status, 401);
  const drill = await control("runtime-memory-drill", identity.actorId); assert.equal(drill.result.restorationVerified, true);
  const rotatedPath = join(directory, "restored.json"); operator("--action", "restore", "--id", identity.actorId, "--output", rotatedPath); assert.equal((await call("read_document", "docs/research")).reason, "CREDENTIAL_REVOKED"); await stop(agent); await connect(rotatedPath); assert((await call("read_document", "docs/research")).allowed);
  assert((await call("read_document", "docs/untrusted")).allowed); await call("write_memory", "memory/runtime-policy", "Fresh-session qualifying critical activity"); const fresh = await call("read_document", "decoy/credentials"); assert.notEqual(fresh.incidentId, trap.incidentId); assert.equal((await state()).incidents.find((i: { id: string }) => i.id === fresh.incidentId).status, "contained");
  operator("--action", "revoke", "--id", identity.actorId); assert.equal((await call("read_document", "docs/research")).reason, "CREDENTIAL_REVOKED"); await stop(agent); agent = undefined;
  const safe = JSON.stringify(await state()); assert(!safe.includes(identity.credential)); assert(!agentError.includes(identity.credential));
  operator("--action", "inspect", "--id", identity.actorId);
  const checked = JSON.parse(execFileSync(process.execPath, [example, "--credential-file", otherPath, "--action", "check"], { cwd: consumer, env: agentEnv, encoding: "utf8" })); assert.deepEqual(checked.capabilities.tools.map((t: { name: string }) => t.name), ["operational_status"]);
  const prepared = JSON.parse(execFileSync(process.execPath, ["--import", "tsx", "scripts/hackathon-demo.ts", "--prepare", "--output", join(directory, "presentation")], { env, encoding: "utf8", timeout: 30000 }));
  const preflight = JSON.parse(execFileSync(process.execPath, ["--import", "tsx", "scripts/release-preflight.ts", "--credential-file", prepared.credentialFile], { env, encoding: "utf8", timeout: 30000 })); assert.equal(preflight.ready, true);
  const presentation = execFileSync(process.execPath, ["--import", "tsx", "scripts/hackathon-demo.ts", "--execute", "--credential-file", prepared.credentialFile], { env, encoding: "utf8", timeout: 60000 }); assert(presentation.includes('"complete": true')); const result = JSON.parse(await readFile(join(directory, "presentation/result.json"), "utf8")); assert.equal(result.evidence.authenticated, true); assert.equal(result.evidence.tamperRejected, true); assert.equal(result.evidence.originalUnchanged, true); assert.equal(result.forbiddenHandlerExecuted, false); assert.equal(result.containmentHandlerExecuted, false);
  await stop(server); server = undefined;
  let unavailable = false; try { execFileSync(process.execPath, [example, "--credential-file", otherPath, "--action", "normal", "--transport", "direct"], { cwd: consumer, env: agentEnv, stdio: "pipe", timeout: 15000 }); } catch { unavailable = true; } assert(unavailable);
  console.log("PASS independent tarball installation + external Node process + stdio proxy + production HTTP MCP: initialization, approved discovery, actual read/write/notes, denied handler, forged identity isolation, foreign memory owner rejection, exact replay/current-authority denial, all four engines/case correlation, quarantine/restart, signed restoration, credential replacement/revocation, authenticated forensic ZIP/HMAC, observer least privilege and unavailable-gateway fail closed. Paid inference: 0.");
} finally { await stop(agent); await stop(server); rmSync(directory, { recursive: true }); }
