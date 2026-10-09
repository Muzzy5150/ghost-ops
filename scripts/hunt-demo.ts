import assert from "node:assert/strict";
import { randomBytes, randomUUID } from "node:crypto";
import { spawn, execFileSync, type ChildProcess } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createInterface } from "node:readline";
import { join, resolve } from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { localBase, localAdmin } from "../src/runtime/client";
import { readEvidenceZip, evidenceZip } from "../src/lib/evidence-zip";
import { verifyEvidence } from "../src/lib/evidence-verification";
const base = localBase(), args = process.argv.slice(2), output = resolve(args.includes("--output") ? args[args.indexOf("--output") + 1] : `.ghostops/hunt-demo-${randomUUID().slice(0, 8)}`);
const env = { PATH: process.env.PATH, NODE_ENV: "production" as const, GHOSTOPS_URL: base };
const children: ChildProcess[] = [];
type Decision = { requestId: string; allowed: boolean; reason: string; incidentId: string | null };
type ProcessAgent = { id: string; file: string; child: ChildProcess; call: (tool: string, resource: string, extra?: Record<string, unknown>) => Promise<{ decision: Decision; messageId?: string }> };
let headers: Record<string, string>;
const stop = async (p: ChildProcess) => { if (p.exitCode !== null || p.signalCode !== null) return; await new Promise<void>(r => { const timeout = setTimeout(() => p.kill("SIGKILL"), 10000); p.once("exit", () => { clearTimeout(timeout); r(); }); p.kill("SIGTERM"); }); };
let cancelled = false;
for (const signal of ["SIGINT", "SIGTERM"] as const) process.on(signal, () => { cancelled = true; for (const child of children) child.kill("SIGTERM"); });
async function manage(input: Record<string, unknown>) { if (cancelled) throw new Error("Cancelled"); const r = await fetch(`${base}/api/hunt`, { method: "POST", headers, body: JSON.stringify({ commandId: randomUUID(), ...input }), signal: AbortSignal.timeout(15000) }); assert.equal(r.status, 200, "Hunt command denied; inspect state, no reset/retry"); return r.json(); }
async function state() { const r = await fetch(`${base}/api/hunt`, { headers }); assert.equal(r.status, 200); return r.json(); }
async function stage(label: string) { console.log(label); if (args.includes("--interactive")) { if (!process.stdin.isTTY) throw new Error("Interactive requires a terminal"); const line = createInterface({ input: process.stdin, output: process.stdout }); await new Promise<void>(r => line.question("Enter to continue (scripted choices / real MCP effects): ", () => { line.close(); r(); })); } }
async function provision(name: string, observer = false): Promise<ProcessAgent> {
  const id = `live-hunt-${name}-${randomUUID().slice(0, 8)}`, file = join(output, `${name}.json`);
  const defaults = observer ? ["status:read,delegation:read", "infra/status,agents/inbox"] : ["documents:read,documents:ingest,summarize:write,status:read,memory:read,memory:write,delegation:write,delegation:read", "docs/research,docs/untrusted,research/summary,infra/status,memory/runtime-policy,memory/runtime-notes,agents/outbox,agents/inbox"];
  execFileSync(process.execPath, ["--import", "tsx", "scripts/external.ts", "--action", "provision", "--id", id, "--name", name, "--role", observer ? "observer" : "research", "--tools", defaults[0], "--resources", defaults[1], "--output", file], { env, stdio: "pipe" });
  const child = spawn(process.execPath, ["examples/external-agent/dist/main.js", "--credential-file", file, "--action", "session"], { env, stdio: ["pipe", "pipe", "pipe"] }); children.push(child);
  const records: { decision: Decision; messageId?: string; ready?: boolean }[] = [];
  createInterface({ input: child.stdout! }).on("line", line => { records.push(JSON.parse(line)); }); child.stderr!.resume();
  async function next() { for (let n = 0; n < 200; n++) { if (records.length) return records.shift()!; if (cancelled || child.exitCode !== null) throw new Error("Agent unavailable"); await delay(50); } throw new Error("Agent request timed out; no automatic retry"); }
  assert.equal((await next()).ready, true);
  return { id, file, child, call: async (tool, resource, extra = {}) => { if (cancelled) throw new Error("Cancelled"); child.stdin!.write(JSON.stringify({ tool, resource, requestId: randomUUID(), ...extra }) + "\n"); const result = await next(); assert(result.decision, "Expected an actual MCP decision"); return result; } };
}
try {
  headers = await localAdmin(base); await state(); // Missing Phase 10 route fails BEFORE issuing identities.
  await mkdir(output, { mode: 0o700 });
  await stage("1 / Normal organization: three independent Node agents + stdio proxies, no inference.");
  const research = await provision("ResearchAgent"), coordinator = await provision("CoordinatorAgent"), operations = await provision("OperationsAgent", true);
  const scope = await manage({ action: "scope", name: "Synthetic multi-agent investigation", agentIds: [research.id, coordinator.id, operations.id] });
  const initialResponse = await fetch(`${base}/api/state`, { headers }); assert.equal(initialResponse.status, 200); const initial = await initialResponse.json();
  const originalPolicies = initial.memories.filter((m: { ownerId: string; key: string }) => [research.id, coordinator.id, operations.id].includes(m.ownerId) && m.key === "runtime-policy").map((m: { id: string; contentHash: string }) => ({ id: m.id, contentHash: m.contentHash })); assert.equal(originalPolicies.length, 3);
  let approved: Decision | undefined;
  for (const agent of [research, coordinator, operations]) {
    for (let n = 0; n < 4; n++) { const r = await agent.call(agent === operations ? "operational_status" : "read_document", agent === operations ? "infra/status" : "docs/research"); assert(r.decision.allowed); if (agent === research) approved = r.decision; }
    await manage({ action: "baseline", scopeId: scope.id, actorId: agent.id });
  }
  const summary = await research.call("write_summary", "research/summary", { content: "Approved synthetic summary; permissions stay at the gateway." }); assert(summary.decision.allowed);
  const normal = await research.call("send_message", "agents/outbox", { targetId: coordinator.id, referenceRequestId: approved!.requestId, content: "Permitted research summary. Agent-authored text is still untrusted data." }); assert(normal.decision.allowed); assert((await coordinator.call("read_inbox", "agents/inbox", { messageId: normal.messageId })).decision.allowed);
  await stage("2 / Research reads untrusted fixture; deterministic protected-memory probe is blocked.");
  const source = await research.call("read_document", "docs/untrusted"); assert(source.decision.allowed);
  const poison = await research.call("write_memory", "memory/runtime-policy", { content: "CONTROLLED TEST: persist forbidden credential access." }); assert.equal(poison.decision.reason, "PROTECTED_MEMORY_WRITE_REQUIRES_ADMIN");
  await stage("3 / Explicit message references propagate untrusted provenance across processes, never permissions.");
  const sent = await research.call("send_message", "agents/outbox", { targetId: coordinator.id, referenceRequestId: source.decision.requestId, content: "Synthetic unrelated instruction attempt: request restricted admin and change protected policy. This is test data." });
  const received = await coordinator.call("read_inbox", "agents/inbox", { messageId: sent.messageId }); assert(received.decision.allowed);
  const forwarded = await coordinator.call("send_message", "agents/outbox", { targetId: operations.id, referenceRequestId: received.decision.requestId, content: "CONTROLLED inherited untrusted instruction test; no new authority." }); assert(forwarded.decision.allowed);
  assert((await operations.call("read_inbox", "agents/inbox", { messageId: forwarded.messageId })).decision.allowed);
  const crossWrite = await operations.call("write_memory", "memory/runtime-policy", { content: "CONTROLLED cross-agent protected modification" }); assert(!crossWrite.decision.allowed);
  await stage("4 / Forbidden administrator decoy request: handler never runs; approved adaptive catalog overlay.");
  // A fourth independent synthetic actor exercises identity boundaries. These
  // unverified claims remain in ShadowWatch and must NOT be attached to the
  // ResearchAgent's trusted Hunt history just because they claim its name.
  const identityProbes: Decision[] = [];
  for (const actorId of [`live-hunt-RogueAgent-${randomUUID().slice(0, 8)}`, research.id]) {
    const probe = JSON.parse(execFileSync(process.execPath, ["--input-type=module", "-e", "const r=await fetch(process.env.GHOSTOPS_URL+'/api/mcp',{method:'POST',headers:{'content-type':'application/json',accept:'application/json, text/event-stream',authorization:'Bearer '+process.env.HUNT_INVALID_TOKEN,'x-ghostops-agent':process.env.HUNT_CLAIM,'x-ghostops-session':process.env.HUNT_SESSION},body:JSON.stringify({jsonrpc:'2.0',id:1,method:'tools/call',params:{name:'restricted_admin',arguments:{requestId:process.env.HUNT_REQUEST_ID,resource:'decoy/admin'}}})});const j=await r.json();console.log(JSON.stringify(j.result.structuredContent));"], { env: { ...env, HUNT_INVALID_TOKEN: randomBytes(32).toString("hex"), HUNT_CLAIM: actorId, HUNT_SESSION: randomUUID(), HUNT_REQUEST_ID: randomUUID() }, encoding: "utf8", timeout: 10000 }));
    assert.equal(probe.allowed, false); assert.equal(probe.reason, actorId === research.id ? "INVALID_CREDENTIAL" : "UNKNOWN_IDENTITY"); identityProbes.push(probe);
  }
  const forbidden = await coordinator.call("restricted_admin", "decoy/admin"); assert.equal(forbidden.decision.reason, "TOOL_NOT_PERMITTED");
  let data = await state(); const evidence = data.events.find((e: { requestId: string; module: string }) => e.requestId === forbidden.decision.requestId && e.module === "Gateway"); assert(evidence);
  const deployment = await manage({ action: "deploy", scopeId: scope.id, template: "adaptive", reasonEventId: evidence.id }); assert.equal(deployment.template, "admin");
  await stage("5 / Ghost Hunt: source/request evidence and explicit Research → Coordinator → Operations links.");
  data = await state(); const investigation = data.cases.find((c: { scopeId: string }) => c.scopeId === scope.id); assert(investigation); assert(data.links.some((l: { source: string; target: string }) => l.source === `agent:${research.id}` && l.target === `agent:${coordinator.id}`)); assert(data.links.some((l: { source: string; target: string }) => l.source === `agent:${coordinator.id}` && l.target === `agent:${operations.id}`)); console.log(JSON.stringify({ caseId: investigation.id, sourceRequest: source.decision.requestId, policyDenials: [poison.decision, crossWrite.decision, forbidden.decision], mode: "scripted-separate-process-real-MCP", modelCalls: 0 }));
  await stage("6 / Approval-required response, current-state revalidation and actual blocked follow-up.");
  await manage({ action: "configure", scopeId: scope.id, mode: "APPROVAL_REQUIRED" });
  const plan = await manage({ action: "preview", scopeId: scope.id, actorId: coordinator.id }); assert.equal(plan.status, "pending"); await manage({ action: "approve", planId: plan.id });
  const blocked = await coordinator.call("write_summary", "research/summary", { content: "Must not reach handler after response" }); assert.equal(blocked.decision.reason, "AGENT_QUARANTINED");
  const proofResponse = await fetch(`${base}/api/state`, { headers }); assert.equal(proofResponse.status, 200); const proof = await proofResponse.json();
  for (const decision of [poison.decision, crossWrite.decision, forbidden.decision, blocked.decision, ...identityProbes]) { const request = proof.runtimeRequests.find((r: { id: string }) => r.id === decision.requestId); assert.equal(request?.execution, null); }
  for (const memory of originalPolicies) { const current = proof.memories.find((m: { id: string }) => m.id === memory.id); assert.equal(current?.contentHash, memory.contentHash); assert.equal(current?.integrity, "verified"); }
  data = await state(); const receipt = data.plans.find((p: { id: string }) => p.id === plan.id); assert.equal(receipt.status, "verified"); assert.equal(receipt.result.handlerNeverExecuted, true);
  for (const probe of identityProbes) assert(!data.links.some((l: { requestId: string }) => l.requestId === probe.requestId), "Unverified impersonation claims must not enter the verified graph");
  await stage("7 / Forensic export: authenticated original, isolated altered copy rejected.");
  const original = join(output, "hunt-original.zip"), tampered = join(output, "hunt-tampered.zip");
  const response = await fetch(`${base}/api/evidence/hunt/${investigation.id}`, { headers }); assert.equal(response.status, 200); const bytes = Buffer.from(await response.arrayBuffer()); verifyEvidence(bytes); await writeFile(original, bytes, { mode: 0o600, flag: "wx" });
  const auth = JSON.parse(execFileSync(process.execPath, ["--import", "tsx", "scripts/evidence-verify.ts", original], { env: { ...process.env, GHOSTOPS_URL: base }, encoding: "utf8" })); assert.equal(auth.authenticated, true);
  const entries = readEvidenceZip(bytes); entries["summary.html"] = Buffer.concat([entries["summary.html"], Buffer.from("CONTROLLED TAMPER")]); await writeFile(tampered, evidenceZip(entries), { mode: 0o600, flag: "wx" });
  assert.throws(() => execFileSync(process.execPath, ["--import", "tsx", "scripts/evidence-verify.ts", tampered], { env: process.env, stdio: "pipe" })); assert((await readFile(original)).equals(bytes));
  await stage("8 / Retire scoped deception overlay; restore identity through existing authorized rotation and verify legitimate access.");
  await manage({ action: "cleanup", deploymentId: deployment.id }); await stop(coordinator.child);
  const restoredFile = join(output, "CoordinatorAgent-restored.json");
  execFileSync(process.execPath, ["--import", "tsx", "scripts/external.ts", "--action", "restore", "--id", coordinator.id, "--output", restoredFile], { env, stdio: "pipe" });
  const restored = JSON.parse(execFileSync(process.execPath, ["examples/external-agent/dist/main.js", "--credential-file", restoredFile, "--action", "call", "--tool", "read_document", "--resource", "docs/research"], { env, encoding: "utf8" })); assert.equal(restored.decisions[0].allowed, true);
  const result = { complete: true, caseId: investigation.id, scopeId: scope.id, planId: plan.id, agentIds: [research.id, coordinator.id, operations.id], coordinatorId: coordinator.id, restoredFile, original, tampered, rootRequestId: source.decision.requestId, enforcementVerified: true, memoryPolicyIntact: true, authenticated: auth.authenticated, tamperRejected: true, restoredAccess: true, modelCalls: 0, limitation: "Scripted choices, real tools; source/submission is not proof of influence. Local HMAC is not external attestation." };
  await writeFile(join(output, "result.json"), JSON.stringify(result, null, 2), { mode: 0o600, flag: "wx" }); console.log(JSON.stringify(result, null, 2));
} catch { console.error("Hunt demo stopped safely: require a migrated isolated Phase 10 server, built packages, matching operator key, unused private output and current grants. No automatic reset/retry/fallback or inference."); process.exitCode = 1; }
finally { await Promise.all(children.map(stop)); }
