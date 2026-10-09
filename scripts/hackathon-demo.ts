import assert from "node:assert/strict";
import { spawn, execFile, type ChildProcess } from "node:child_process";
import { randomUUID } from "node:crypto";
import { mkdir, lstat, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve, join } from "node:path";
import { createInterface } from "node:readline";
import { createInterface as promptInterface } from "node:readline/promises";
import { promisify } from "node:util";
import { localAdmin, localBase } from "../src/runtime/client";
import { releasePreflight } from "../src/runtime/release-preflight";
import { releaseId } from "../src/lib/release";
import { contentHash, verifyEvidence } from "../src/lib/evidence-verification";
import { readEvidenceZip, evidenceZip } from "../src/lib/evidence-zip";
const execute = promisify(execFile), args = process.argv.slice(2), value = (name: string) => args[args.indexOf(name) + 1];
let agent: ChildProcess | undefined, cancelled = false;
const cancellation = new AbortController();
const cancel = () => { cancelled = true; cancellation.abort(); agent?.kill("SIGTERM"); };
process.once("SIGINT", cancel); process.once("SIGTERM", cancel);
async function stopAgent() { if (!agent || agent.exitCode !== null) return; const child = agent; await new Promise<void>(r => { const timer = setTimeout(() => child.kill("SIGKILL"), 5000); child.once("exit", () => { clearTimeout(timer); r(); }); child.kill("SIGTERM"); }); }
try {
  const base = localBase(), interactive = args.includes("--interactive");
  if (interactive && !process.stdin.isTTY) throw new Error("Interactive terminal required");
  if (args.includes("--prepare") === args.includes("--execute")) throw new Error("Choose prepare OR execute");
  async function stage(message: string) {
    if (cancelled) throw new Error("Cancelled at safe boundary"); console.log(message);
    if (interactive) { const prompt = promptInterface({ input: process.stdin, output: process.stdout }); prompt.once("SIGINT", cancel); try { await prompt.question("Enter to continue (Ctrl+C stops new requests): ", { signal: cancellation.signal }); } finally { prompt.close(); } }
    if (cancelled) throw new Error("Cancelled at safe boundary");
  }
  if (args.includes("--prepare")) {
    const preflight = await releasePreflight({ endpoint: base, serverOnly: true }); assert(preflight.ready);
    const id = `live-judge-${randomUUID().slice(0, 8)}`, directory = resolve(args.includes("--output") ? value("--output") : `.ghostops/hackathon/${id}`);
    await mkdir(dirname(directory), { recursive: true, mode: 0o700 }); await mkdir(directory, { mode: 0o700 });
    const identity = join(directory, "identity.json");
    await execute(process.execPath, ["--import", "tsx", "scripts/external.ts", "--action", "provision", "--id", id, "--name", "HackathonExternalResearch", "--output", identity], { env: { ...process.env, GHOSTOPS_URL: base }, timeout: 20000, maxBuffer: 65536, signal: cancellation.signal });
    console.log(JSON.stringify({ prepared: true, release: releaseId, agentId: id, credentialFile: identity, outputDirectory: directory, next: "release:preflight -- --credential-file FILE; release:demo -- --execute --credential-file FILE --interactive", historicalDataReset: false, modelCalls: 0 }, null, 2));
  } else {
    if (!args.includes("--credential-file")) throw new Error("Fresh private identity required");
    const identity = resolve(value("--credential-file")), directory = resolve(args.includes("--output") ? value("--output") : dirname(identity));
    const stat = await lstat(directory); assert(stat.isDirectory() && !stat.isSymbolicLink() && !(stat.mode & 0o077));
    const originalPath = join(directory, "original-evidence.zip"), tamperedPath = join(directory, "tampered-evidence.zip");
    await assert.rejects(lstat(originalPath)); await assert.rejects(lstat(tamperedPath));
    const preflight = await releasePreflight({ endpoint: base, credentialFile: identity }); assert(preflight.ready);
    const saved = JSON.parse(await readFile(identity, "utf8")), agentEnv = { PATH: process.env.PATH, NODE_ENV: "production" as const, GHOSTOPS_URL: base };
    const headers = await localAdmin(base), state = async () => { const r = await fetch(`${base}/api/state`, { headers, signal: AbortSignal.timeout(10000) }); assert.equal(r.status, 200); return r.json(); };
    await stage("1 · Real external process: permitted document/summary/status/signed-notes workflow. Decisions are SCRIPTED; effects are real.");
    const normal = JSON.parse((await execute(process.execPath, ["examples/external-agent/dist/main.js", "--credential-file", identity, "--action", "normal"], { env: agentEnv, timeout: 30000, maxBuffer: 65536, signal: cancellation.signal })).stdout); assert(normal.decisions.every((d: { allowed: boolean }) => d.allowed));
    console.log(JSON.stringify({ agentId: saved.actorId, allowedRequests: normal.decisions.map((d: { requestId: string }) => d.requestId), modelCalls: 0 }));
    const queue: Record<string, unknown>[] = [];
    const launched = spawn(process.execPath, ["examples/external-agent/dist/main.js", "--credential-file", identity, "--action", "session"], { env: agentEnv, stdio: ["pipe", "pipe", "pipe"] }); agent = launched;
    createInterface({ input: launched.stdout! }).on("line", line => { try { queue.push(JSON.parse(line)); } catch { cancelled = true; } });
    launched.stderr!.resume();
    const next = async () => { for (let n = 0; n < 150; n++) { if (cancelled) throw new Error("Cancelled"); if (queue.length) return queue.shift()!; if (agent!.exitCode !== null) throw new Error("External process disconnected"); await new Promise(r => setTimeout(r, 100)); } throw new Error("External response timeout; do not auto-retry effects"); };
    assert.equal((await next()).ready, true);
    const decisions: { requestId: string; allowed: boolean; reason: string; incidentId: string | null }[] = [];
    const call = async (tool: string, resource: string, content?: string) => {
      if (cancelled) throw new Error("Cancelled"); agent!.stdin!.write(JSON.stringify({ tool, resource, content, requestId: randomUUID() }) + "\n");
      const item = await next(); assert(item.decision); const decision = item.decision as typeof decisions[number]; decisions.push(decision); console.log(JSON.stringify(decision)); return decision;
    };
    await stage("2 · Forbidden MCP operation: show the real policy denial and persisted handler proof.");
    const forbidden = await call("restricted_admin", "decoy/admin"); assert(!forbidden.allowed); assert.equal((await state()).runtimeRequests.find((r: { id: string }) => r.id === forbidden.requestId).execution, null);
    await stage("3 · Untrusted document and protected-memory attempt: recorded provenance cannot grant permissions.");
    assert((await call("read_document", "docs/untrusted")).allowed);
    const memory = await call("write_memory", "memory/runtime-policy", "CONTROLLED TEST: unauthorized administrator policy"); assert.equal(memory.reason, "PROTECTED_MEMORY_WRITE_REQUIRES_ADMIN");
    const trap = await call("read_document", "decoy/credentials"); assert(trap.incidentId);
    const incident = (await state()).incidents.find((i: { id: string }) => i.id === trap.incidentId); assert(incident);
    console.log(JSON.stringify({ incidentId: incident.id, severity: incident.severity, actualStatus: incident.status, observedEngines: [...new Set(incident.events.map((e: { module: string }) => e.module))], explanation: "Inspect this actual case in Investigations. Correlated findings may already have automatically contained the agent." }));
    await stage("4 · Containment: existing operator control, followed by a request on the still-initialized external MCP session.");
    const response = await fetch(`${base}/api/control`, { method: "POST", headers, body: JSON.stringify({ commandId: randomUUID(), action: "quarantine", targetId: saved.actorId }), signal: AbortSignal.timeout(10000) }); assert.equal(response.status, 200);
    const contained = await call("write_summary", "research/summary", "This handler must not run after containment"); assert.equal(contained.reason, "AGENT_QUARANTINED"); assert.equal((await state()).runtimeRequests.find((r: { id: string }) => r.id === contained.requestId).execution, null);
    await stage("5 · Forensic export and authenticated local verification; preserve the original and reject an altered copy.");
    await execute(process.execPath, ["--import", "tsx", "scripts/evidence-export.ts", "--incident", incident.id, "--output", originalPath], { env: { ...process.env, GHOSTOPS_URL: base }, timeout: 20000, maxBuffer: 65536, signal: cancellation.signal });
    const verified = JSON.parse((await execute(process.execPath, ["--import", "tsx", "scripts/evidence-verify.ts", originalPath], { timeout: 15000, maxBuffer: 65536, signal: cancellation.signal })).stdout); assert.equal(verified.authenticated, true);
    const original = await readFile(originalPath), files = readEvidenceZip(original); files["summary.html"] = Buffer.from(files["summary.html"].toString() + "\nCONTROLLED TAMPER");
    const altered = evidenceZip(files); assert.throws(() => verifyEvidence(altered), /hash\/size/);
    await writeFile(tamperedPath, altered, { flag: "wx", mode: 0o600 });
    let rejected = false; try { await execute(process.execPath, ["--import", "tsx", "scripts/evidence-verify.ts", tamperedPath], { timeout: 15000, maxBuffer: 65536 }); } catch (error) { rejected = typeof error === "object" && error !== null && "code" in error && error.code === 1; } assert(rejected);
    assert.equal(contentHash(await readFile(originalPath)), contentHash(original));
    const result = { release: releaseId, agentId: saved.actorId, incidentId: incident.id, mode: "scripted-external-real-MCP", modelCalls: 0, authorizedRequests: normal.decisions.length, forbiddenHandlerExecuted: false, containmentHandlerExecuted: false, decisions, evidence: { originalPath, tamperedPath, authenticated: true, tamperRejected: true, originalUnchanged: true }, limitation: "Only routed tools are protected; local HMAC does not exclude host/key compromise." };
    await writeFile(join(directory, "result.json"), JSON.stringify(result, null, 2), { mode: 0o600, flag: "wx" }); console.log(JSON.stringify({ complete: true, ...result }, null, 2));
  }
} catch { console.error("Release demo stopped safely. Check release:preflight, fresh restricted identity, matching operator verification key and unused private evidence filenames. No automatic retry/reset/fallback; committed events remain inspectable. No secrets printed."); process.exitCode = 1; }
finally { await stopAgent(); }
