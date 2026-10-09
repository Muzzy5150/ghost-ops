import { afterEach, expect, it } from "vitest";
import { randomBytes, randomUUID } from "node:crypto";
import { NextRequest } from "next/server";
import { db } from "../src/server/db";
import { enrollRuntime, callRuntime, rotateRuntime, approvedRuntimeTools } from "../src/server/runtime";
import { huntCommand, huntSnapshot, runHuntBatch } from "../src/server/hunt";
import { integrationSchema } from "../src/lib/runtime-contract";
import { POST } from "../src/app/api/hunt/route";
import { command } from "../src/server/service";
import { hash, verifySignature } from "../src/server/memory";
import { mac, secureEqual, transportToken } from "../src/server/config";
import { exportEvidence } from "../src/server/evidence";
import { evidenceZip, readEvidenceZip } from "../src/lib/evidence-zip";
import { verifyEvidence } from "../src/lib/evidence-verification";
import { recordEvent } from "../src/server/investigation";
import { execFileSync } from "node:child_process";
import { Prisma } from "../src/generated/prisma/client";
async function agent() { const actorId = `live-hunt-test-${randomBytes(4).toString("hex")}`, credential = randomBytes(32).toString("hex"); const result = await enrollRuntime({ commandId: randomUUID(), actorId, credential, integration: integrationSchema.parse({ name: "Synthetic hunt agent", role: "research", permissions: { tools: ["documents:read", "documents:ingest", "summarize:write", "status:read", "memory:read", "memory:write", "delegation:write", "delegation:read"], resources: ["docs/research", "docs/untrusted", "research/summary", "infra/status", "memory/runtime-policy", "memory/runtime-notes", "agents/outbox", "agents/inbox"], destinations: [] } }) }) as { actorId: string; sessionId: string }; return { ...result, credential }; }
type Identity = Awaited<ReturnType<typeof agent>>;
const invoke = (id: Identity, tool: Parameters<typeof callRuntime>[3], resource: string, extra: Record<string, unknown> = {}) => callRuntime(id.actorId, id.sessionId, id.credential, tool, { requestId: randomUUID(), resource, ...extra });
const manage = (input: Record<string, unknown>) => huntCommand({ commandId: randomUUID(), ...input }) as Promise<Record<string, unknown>>;
async function organization() { const a = await agent(), b = await agent(); const scope = await manage({ action: "scope", name: "Isolated lab", agentIds: [a.actorId, b.actorId] }); return { a, b, scopeId: String(scope.id) }; }
async function qualified(mode = "OBSERVE") { const org = await organization(); if (mode !== "OBSERVE") await manage({ action: "configure", scopeId: org.scopeId, mode }); await invoke(org.b, "restricted_admin", "decoy/admin"); return org; }
afterEach(async () => { await db.agent.deleteMany({ where: { id: { startsWith: "live-hunt-test-" } } }); await db.huntScope.deleteMany(); });

it("hunt administration requires actual transport, admin cookie and CSRF", async () => {
  const base = "http://127.0.0.1:3210/api/hunt";
  expect((await POST(new NextRequest(base, { method: "POST", headers: { host: "127.0.0.1:3210", "content-type": "application/json" }, body: "{}" }))).status).toBe(403);
  expect((await POST(new NextRequest(base, { method: "POST", headers: { host: "127.0.0.1:3210", "x-ghostops-transport": transportToken(), "content-type": "application/json" }, body: "{}" }))).status).toBe(401);
});
it("scope defaults OBSERVE, rejects unknown or overlapping identities and altered command replay", async () => {
  const { a, scopeId } = await organization(); expect((await db.huntScope.findUniqueOrThrow({ where: { id: scopeId } })).mode).toBe("OBSERVE");
  await expect(manage({ action: "scope", name: "invalid", agentIds: ["live-unregistered"] })).rejects.toThrow();
  await expect(manage({ action: "scope", name: "overlap", agentIds: [a.actorId] })).rejects.toThrow();
  const input = { commandId: randomUUID(), action: "configure", scopeId, mode: "OBSERVE" }; expect(await huntCommand(input)).toEqual(await huntCommand(input)); await expect(huntCommand({ ...input, mode: "AUTOMATIC" })).rejects.toThrow("replay");
});
it("baseline is versioned, uses only authenticated permitted observations and configured windows", async () => {
  const { a, scopeId } = await organization(); for (let n = 0; n < 4; n++) await invoke(a, "read_document", "docs/research");
  const one = await manage({ action: "baseline", scopeId, actorId: a.actorId }); const two = await manage({ action: "baseline", scopeId, actorId: a.actorId }); expect(one.version).toBe(1); expect(two.version).toBe(2); expect(one.requestIds).toHaveLength(4);
  const baseline = await db.behaviorBaseline.findUniqueOrThrow({ where: { id: String(one.id) } }); expect(baseline.profile).toMatchObject({ tools: { "documents:read": 4 } });
});
it("forged claims cannot contaminate baseline or hunt attribution", async () => {
  const { a, b, scopeId } = await organization(); const r = await callRuntime(b.actorId, b.sessionId, a.credential, "read_document", { requestId: randomUUID(), resource: "docs/research" }); expect(r.reason).toBe("INVALID_CREDENTIAL");
  await expect(manage({ action: "baseline", scopeId, actorId: b.actorId })).rejects.toThrow("four"); expect((await huntSnapshot()).links.filter(l => l.requestId === r.requestId)).toHaveLength(0);
});
it("untrusted or suspicious session activity cannot silently retrain a baseline", async () => {
  const { a, scopeId } = await organization(); for (let n = 0; n < 4; n++) await invoke(a, "read_document", "docs/research"); await invoke(a, "read_document", "docs/untrusted"); await invoke(a, "write_memory", "memory/runtime-policy", { content: "Controlled unauthorized policy" }); await expect(manage({ action: "baseline", scopeId, actorId: a.actorId })).rejects.toThrow(); expect(await db.behaviorBaseline.count({ where: { agentId: a.actorId } })).toBe(0);
});
it("benign novel authorized operation is observed as novelty, not compromise", async () => {
  const { a, scopeId } = await organization(); for (let n = 0; n < 4; n++) await invoke(a, "read_document", "docs/research"); await manage({ action: "baseline", scopeId, actorId: a.actorId }); const r = await invoke(a, "operational_status", "infra/status"); expect(r.allowed).toBe(true); const finding = await db.securityEvent.findFirstOrThrow({ where: { requestId: r.requestId, kind: "UNSEEN_TOOL_V2" } }); expect(finding.severity).toBe("low"); expect((await db.agent.findUniqueOrThrow({ where: { id: a.actorId } })).status).toBe("active");
});
it("source-linked protected-memory deviation has baseline and policy evidence, original snapshot intact", async () => {
  const { a, scopeId } = await organization(); for (let n = 0; n < 4; n++) await invoke(a, "read_document", "docs/research"); await manage({ action: "baseline", scopeId, actorId: a.actorId }); const original = await db.memoryVersion.findFirstOrThrow({ where: { ownerId: a.actorId, key: "runtime-policy" } }); await invoke(a, "read_document", "docs/untrusted"); const r = await invoke(a, "write_memory", "memory/runtime-policy", { content: "CONTROLLED memory rewrite" }); expect(r.reason).toBe("PROTECTED_MEMORY_WRITE_REQUIRES_ADMIN");
  const finding = await db.securityEvent.findFirstOrThrow({ where: { requestId: r.requestId, kind: "POST_SOURCE_POLICY_VIOLATION_V2" } }); expect(finding.details).toMatchObject({ sourceId: "untrusted-paper", allowed: false }); expect(verifySignature(await db.memoryVersion.findUniqueOrThrow({ where: { id: original.id } }))).toBe(true); expect(await db.memoryVersion.count({ where: { ownerId: a.actorId, key: "runtime-policy" } })).toBe(1);
});
it("actual guarded delegation retains source and root request; receiving text grants no permissions", async () => {
  const { a, b } = await organization(); expect(await approvedRuntimeTools(a.actorId, a.sessionId, a.credential)).toContain("send_message"); const root = await invoke(a, "read_document", "docs/untrusted"); const sent = await invoke(a, "send_message", "agents/outbox", { content: "Synthetic adversarial relay, not instructions", targetId: b.actorId, referenceRequestId: root.requestId }); const messageId = JSON.parse(sent.output!).messageId;
  const received = await invoke(b, "read_inbox", "agents/inbox", { messageId }); expect(received.allowed).toBe(true); expect((await db.session.findUniqueOrThrow({ where: { id: b.sessionId } })).sourceTrust).toBe("untrusted");
  const denied = await invoke(b, "write_memory", "memory/runtime-policy", { content: "CONTROLLED cross-agent manipulation" }); expect(denied.allowed).toBe(false); const request = await db.toolRequest.findUniqueOrThrow({ where: { id: denied.requestId } }); expect(request.sourceId).toBe("untrusted-paper");
  const state = await huntSnapshot(); const causal = state.links.find(l => l.source === `agent:${a.actorId}` && l.target === `agent:${b.actorId}`); expect(causal?.details).toMatchObject({ rootRequestId: root.requestId, sourceId: "untrusted-paper" }); expect(JSON.stringify(state.messages)).not.toContain("adversarial relay");
});
it("cross-agent inbox ownership and forged source references fail before handler", async () => {
  const { a, b } = await organization(); const doc = await invoke(b, "read_document", "docs/research"); const bad = await invoke(a, "send_message", "agents/outbox", { content: "Not authorized provenance", targetId: b.actorId, referenceRequestId: doc.requestId }); expect(bad.reason).toBe("DELEGATION_NOT_AUTHORIZED"); expect((await db.toolRequest.findUniqueOrThrow({ where: { id: bad.requestId } })).execution).toBeNull();
  const root = await invoke(a, "read_document", "docs/research"); const good = await invoke(a, "send_message", "agents/outbox", { content: "Own reference", targetId: b.actorId, referenceRequestId: root.requestId }); const cross = await invoke(a, "read_inbox", "agents/inbox", { messageId: JSON.parse(good.output!).messageId }); expect(cross.reason).toBe("MESSAGE_NOT_AUTHORIZED"); expect(cross.output).toBeNull();
});
it("message hash tampering is denied, duplicates do not create additional messages or hunt links", async () => {
  const { a, b } = await organization(); const root = await invoke(a, "read_document", "docs/research"); const args = { requestId: randomUUID(), resource: "agents/outbox", content: "Synthetic content", targetId: b.actorId, referenceRequestId: root.requestId }; const first = await callRuntime(a.actorId, a.sessionId, a.credential, "send_message", args); const count = await db.agentMessage.count(); const links = await db.huntLink.count(); expect((await callRuntime(a.actorId, a.sessionId, a.credential, "send_message", args)).replayed).toBe(true); expect(await db.agentMessage.count()).toBe(count); await runHuntBatch(); const stable = await db.huntLink.count(); await runHuntBatch(); expect(await db.huntLink.count()).toBe(stable); expect(stable).toBeGreaterThanOrEqual(links);
  const messageId = JSON.parse(first.output!).messageId; await db.agentMessage.update({ where: { id: messageId }, data: { content: "Changed without hash" } }); expect((await invoke(b, "read_inbox", "agents/inbox", { messageId })).reason).toBe("MESSAGE_NOT_AUTHORIZED");
});
it("adaptive deployment selects only inert approved templates and cleanup leaves original shared traps alone", async () => {
  const { a, scopeId } = await organization(); const r = await invoke(a, "write_memory", "memory/runtime-policy", { content: "Forbidden" }); const e = await db.securityEvent.findFirstOrThrow({ where: { requestId: r.requestId, identityVerified: true } }); const deployment = await manage({ action: "deploy", scopeId, template: "adaptive", reasonEventId: e.id }); expect(deployment.template).toBe("memory"); await manage({ action: "cleanup", deploymentId: deployment.id }); expect((await db.deceptionDeployment.findUniqueOrThrow({ where: { id: String(deployment.id) } })).active).toBe(false); expect((await db.honeypot.findUniqueOrThrow({ where: { id: String(deployment.trapId) } })).active).toBe(true);
});
it("observe preview never changes state and anomaly alone cannot preview containment", async () => {
  const { b, scopeId } = await qualified(); const p = await manage({ action: "preview", scopeId, actorId: b.actorId }); expect(p.status).toBe("observed"); await expect(manage({ action: "approve", planId: p.id })).rejects.toThrow("mode"); expect((await db.agent.findUniqueOrThrow({ where: { id: b.actorId } })).status).toBe("active");
});
it("approval executes existing containment idempotently; actual follow-up supplies verification", async () => {
  const { b, scopeId } = await qualified("APPROVAL_REQUIRED"); const p = await manage({ action: "preview", scopeId, actorId: b.actorId }); expect(p.status).toBe("pending"); await manage({ action: "approve", planId: p.id }); await manage({ action: "approve", planId: p.id }); expect(await db.containmentAction.count({ where: { actorId: b.actorId, action: "quarantine" } })).toBe(1);
  const r = await invoke(b, "write_summary", "research/summary", { content: "Must not execute" }); expect(r.reason).toBe("AGENT_QUARANTINED"); expect((await db.toolRequest.findUniqueOrThrow({ where: { id: r.requestId } })).execution).toBeNull(); const receipt = await db.responsePlan.findUniqueOrThrow({ where: { id: String(p.id) } }); expect(receipt.status).toBe("verified"); expect(receipt.result).toMatchObject({ verificationRequestId: r.requestId, handlerNeverExecuted: true });
});
it("rejected, expired and reconfigured plans cannot execute", async () => {
  const { b, scopeId } = await qualified("APPROVAL_REQUIRED"); const p = await manage({ action: "preview", scopeId, actorId: b.actorId }); await manage({ action: "configure", scopeId, mode: "OBSERVE" }); expect((await manage({ action: "approve", planId: p.id })).status).toBe("stale");
  await manage({ action: "configure", scopeId, mode: "APPROVAL_REQUIRED" }); const fresh = await manage({ action: "preview", scopeId, actorId: b.actorId }); await db.responsePlan.update({ where: { id: String(fresh.id) }, data: { expiresAt: new Date(0) } }); expect((await manage({ action: "approve", planId: fresh.id })).status).toBe("stale");
  await manage({ action: "configure", scopeId, mode: "APPROVAL_REQUIRED" }); const rejected = await manage({ action: "preview", scopeId, actorId: b.actorId }); await manage({ action: "reject", planId: rejected.id }); await expect(manage({ action: "approve", planId: rejected.id })).rejects.toThrow();
});
it("automatic mode is explicit/current-scoped and old sessions never recontain restored identity", async () => {
  const { a, b, scopeId } = await organization(); await manage({ action: "configure", scopeId, mode: "AUTOMATIC" }); await invoke(b, "restricted_admin", "decoy/admin"); expect((await db.agent.findUniqueOrThrow({ where: { id: b.actorId } })).status).toBe("quarantined"); const credential = randomBytes(32).toString("hex"); const restored = await rotateRuntime({ commandId: randomUUID(), actorId: b.actorId, credential, restore: true }) as { sessionId: string };
  await invoke(b, "restricted_admin", "decoy/admin"); await runHuntBatch(); expect((await db.agent.findUniqueOrThrow({ where: { id: b.actorId } })).status).toBe("active"); const next = { ...b, credential, sessionId: restored.sessionId }; expect((await invoke(next, "read_document", "docs/research")).allowed).toBe(true); expect((await invoke(a, "read_document", "docs/research")).allowed).toBe(true); await invoke(next, "restricted_admin", "decoy/admin"); expect((await db.agent.findUniqueOrThrow({ where: { id: b.actorId } })).status).toBe("quarantined");
});
it("analysis cursor is bounded and durable; replaying batches changes no previously derived links", async () => {
  const { a } = await organization(); await invoke(a, "read_document", "docs/research"); for (let i = 0; i < 5; i++) await runHuntBatch(); const before = await db.huntLink.count(); const cursor = await db.huntCursor.findUniqueOrThrow({ where: { id: "events-v1" } }); const result = await runHuntBatch(); expect(result.processed).toBe(0); expect(result.ordinal).toBe(cursor.ordinal); expect(await db.huntLink.count()).toBe(before);
});
it("existing signed restoration remains independently authorized after provenance-linked attempts", async () => {
  const { a } = await organization(); const memory = await db.memoryVersion.findFirstOrThrow({ where: { ownerId: a.actorId, key: "runtime-notes" } }); await db.memoryVersion.update({ where: { id: memory.id }, data: { content: "CONTROLLED alteration", contentHash: hash("CONTROLLED alteration") } }); expect((await invoke(a, "read_memory", "memory/runtime-notes")).allowed).toBe(false); // Restore requires a different verified historical version, never the altered one.
  await expect(command({ commandId: randomUUID(), action: "restore-memory", targetId: memory.id })).rejects.toThrow();
});

it("an allowed sequence deviation preserves ordinal ordering and baseline reference", async () => {
  const { a, scopeId } = await organization(); for (let n = 0; n < 4; n++) await invoke(a, "read_document", "docs/research"); const baseline = await manage({ action: "baseline", scopeId, actorId: a.actorId });
  const novel = await invoke(a, "operational_status", "infra/status"); const back = await invoke(a, "read_document", "docs/research"); const finding = await db.securityEvent.findFirstOrThrow({ where: { requestId: back.requestId, kind: "SEQUENCE_DRIFT_V2" } }); expect(finding.details).toMatchObject({ baselineId: baseline.id, previousRequestId: novel.requestId, allowed: true }); expect(finding.severity).toBe("low");
});
it("revocation plan requires operator approval and verifies a real rejected credential", async () => {
  const { b, scopeId } = await qualified("APPROVAL_REQUIRED"); const p = await manage({ action: "preview", scopeId, actorId: b.actorId, response: "revoke" }); await manage({ action: "approve", planId: p.id }); const r = await invoke(b, "read_document", "docs/research"); expect(r.reason).toBe("CREDENTIAL_REVOKED"); expect((await db.responsePlan.findUniqueOrThrow({ where: { id: String(p.id) } })).status).toBe("verified");
});
it("old denied requests cannot falsely verify containment after restoration", async () => {
  const { b, scopeId } = await qualified("APPROVAL_REQUIRED"); const p = await manage({ action: "preview", scopeId, actorId: b.actorId }); await manage({ action: "approve", planId: p.id }); await rotateRuntime({ commandId: randomUUID(), actorId: b.actorId, credential: randomBytes(32).toString("hex"), restore: true }); await invoke(b, "read_document", "docs/research"); expect((await db.responsePlan.findUniqueOrThrow({ where: { id: String(p.id) } })).status).toBe("executed"); expect((await db.agent.findUniqueOrThrow({ where: { id: b.actorId } })).status).toBe("active");
});
it("explicit hourly limit denies a second containment without changing the other identity", async () => {
  const { a, b, scopeId } = await organization(); await manage({ action: "configure", scopeId, mode: "APPROVAL_REQUIRED", maxActionsPerHour: 1 }); await invoke(a, "restricted_admin", "decoy/admin"); await invoke(b, "restricted_admin", "decoy/admin"); const first = await manage({ action: "preview", scopeId, actorId: a.actorId }); const second = await manage({ action: "preview", scopeId, actorId: b.actorId }); await manage({ action: "approve", planId: first.id }); await expect(manage({ action: "approve", planId: second.id })).rejects.toThrow("rate limit"); expect((await db.agent.findUniqueOrThrow({ where: { id: b.actorId } })).status).toBe("active");
});
it("hunt exports preserve actual relationships, ordered decisions and no private message content", async () => {
  const { a, b, scopeId } = await organization(); const root = await invoke(a, "read_document", "docs/research"); const sent = await invoke(a, "send_message", "agents/outbox", { content: "PRIVATE SYNTHETIC MESSAGE not in evidence", targetId: b.actorId, referenceRequestId: root.requestId }); await invoke(b, "read_inbox", "agents/inbox", { messageId: JSON.parse(sent.output!).messageId });
  const investigation = await db.huntCase.findUniqueOrThrow({ where: { scopeId } }); const result = await exportEvidence("hunt", investigation.id); const auth = (text: string, tag: string) => secureEqual(mac(`ghostops-evidence:v1:${text}`), tag); expect(verifyEvidence(result.zip, auth)).toMatchObject({ valid: true, authenticated: true, scope: "hunt", subjectId: investigation.id }); const files = readEvidenceZip(result.zip); const text = Object.values(files).map(b => b.toString()).join("\n"); expect(text).not.toContain("PRIVATE SYNTHETIC MESSAGE"); expect(text).not.toContain(a.credential); expect(text).not.toContain('"credentialId":'); expect(text).toContain(root.requestId); const timeline = files["events.jsonl"].toString().trim().split("\n").map(l => JSON.parse(l)); expect(timeline.every((e, i) => !i || e.ordinal > timeline[i - 1].ordinal)).toBe(true);
});
it("modified and missing hunt evidence fail authenticated verification", async () => {
  const { scopeId } = await qualified(); const c = await db.huntCase.findUniqueOrThrow({ where: { scopeId } }); const { zip } = await exportEvidence("hunt", c.id); const auth = (text: string, tag: string) => secureEqual(mac(`ghostops-evidence:v1:${text}`), tag); const changed = readEvidenceZip(zip); changed["summary.html"] = Buffer.from("altered"); expect(() => verifyEvidence(evidenceZip(changed), auth)).toThrow(); const missing = readEvidenceZip(zip); delete missing["events.jsonl"]; expect(() => verifyEvidence(evidenceZip(missing), auth)).toThrow("Missing");
});
it("response exports omit credential binding identifiers while retaining real containment receipts", async () => {
  const { b, scopeId } = await qualified("APPROVAL_REQUIRED"); const p = await manage({ action: "preview", scopeId, actorId: b.actorId }); await manage({ action: "approve", planId: p.id }); await invoke(b, "read_document", "docs/research"); const c = await db.huntCase.findUniqueOrThrow({ where: { scopeId } }); const text = Object.values(readEvidenceZip((await exportEvidence("hunt", c.id)).zip)).map(b => b.toString()).join("\n"); expect(text).not.toContain('"credentialId":'); expect(text).not.toContain(b.credential); expect(text).toContain('"handlerNeverExecuted":true'); expect(text).toContain('"honeypotInteractions":');
});
it("privileged-denial bursts explain the bounded session window without a compromise verdict", async () => {
  const { a, scopeId } = await organization(); for (let n = 0; n < 4; n++) await invoke(a, "read_document", "docs/research"); await manage({ action: "baseline", scopeId, actorId: a.actorId }); for (let n = 0; n < 3; n++) await invoke(a, "write_memory", "memory/runtime-policy", { content: "Controlled rejected policy attempt" }); expect(await db.securityEvent.findFirst({ where: { actorId: a.actorId, kind: "PRIVILEGED_DENIAL_BURST_V2" } })).toMatchObject({ severity: "medium" });
});
it("malformed event claims cannot create missing traps or cross-agent request relationships", async () => {
  const { a, b } = await organization(); const foreign = await invoke(b, "read_document", "docs/research"); const event = await db.$transaction(tx => recordEvent(tx, { actorId: a.actorId, sessionId: a.sessionId, requestId: foreign.requestId, identityVerified: true, simulated: false, module: "GhostTrap", kind: "MALFORMED_FIXTURE", severity: "info", message: "Malformed synthetic input", details: {} })); await runHuntBatch(); const links = (await huntSnapshot()).links.filter(l => l.eventId === event.id); expect(links.every(l => !l.target.startsWith("trap:") && !l.target.startsWith("resource:"))).toBe(true);
});
it("direct destructive HTTP verifier refuses an unspecified server before network access", () => {
  expect(() => execFileSync(process.execPath, ["--import", "tsx", "scripts/verify-api.ts"], { env: { ...process.env, GHOSTOPS_TEST_URL: "" }, stdio: "pipe" })).toThrow("owned disposable Ghost Ops server");
});
it("new scopes cannot authorize plans from pre-scope historical denials", async () => {
  const a = await agent(); await invoke(a, "restricted_admin", "decoy/admin"); const scope = await manage({ action: "scope", name: "New scope", agentIds: [a.actorId] }); await manage({ action: "configure", scopeId: scope.id, mode: "APPROVAL_REQUIRED" }); await expect(manage({ action: "preview", scopeId: scope.id, actorId: a.actorId })).rejects.toThrow("current verified session");
});
it("forensic findings carry their actual frozen baseline definitions and request references", async () => {
  const { a, scopeId } = await organization(); for (let n = 0; n < 4; n++) await invoke(a, "read_document", "docs/research"); const baseline = await manage({ action: "baseline", scopeId, actorId: a.actorId }); await invoke(a, "operational_status", "infra/status"); const c = await db.huntCase.findUniqueOrThrow({ where: { scopeId } }); const files = readEvidenceZip((await exportEvidence("hunt", c.id)).zip); const records = JSON.parse(files["incidents.json"].toString()); expect(records[0].baselines).toEqual([expect.objectContaining({ id: baseline.id, version: 1, requestIds: baseline.requestIds, profile: { tools: { "documents:read": 4 }, resources: { "docs/research": 4 }, sequences: { "documents:read->documents:read": 3 } } })]);
});
it("malformed JSON details cannot stall the durable analysis checkpoint", async () => {
  const { a } = await organization(); const event = await db.$transaction(tx => recordEvent(tx, { actorId: a.actorId, sessionId: a.sessionId, identityVerified: true, simulated: false, module: "MemoryGuard", kind: "CROSS_AGENT_SUBMITTED", severity: "info", message: "Controlled malformed details", details: {} })); await db.securityEvent.update({ where: { id: event.id }, data: { details: Prisma.JsonNull } }); const result = await runHuntBatch(); expect(result.ordinal).toBeGreaterThanOrEqual(event.ordinal); expect((await huntSnapshot()).links.filter(l => l.eventId === event.id).every(l => l.relation !== "verified-message-submission-not-proof-of-influence")).toBe(true);
});
it("backpressure cannot omit triggering evidence or actual containment records from exports", async () => {
  const { a, b, scopeId } = await organization(); await manage({ action: "configure", scopeId, mode: "APPROVAL_REQUIRED" });
  // Queue fault fixture only. The suspicious request and response below still
  // execute actual gateway/containment logic, never insert expected decisions.
  await db.$transaction(async tx => { for (let n = 0; n < 200; n++) await recordEvent(tx, { actorId: a.actorId, sessionId: a.sessionId, identityVerified: false, simulated: true, module: "Gateway", kind: "BACKLOG_FIXTURE", severity: "info", message: "Controlled cursor backlog" }); });
  const request = await invoke(b, "restricted_admin", "decoy/admin"); const plan = await manage({ action: "preview", scopeId, actorId: b.actorId }); await manage({ action: "approve", planId: plan.id }); const c = await db.huntCase.findUniqueOrThrow({ where: { scopeId } }); const files = readEvidenceZip((await exportEvidence("hunt", c.id)).zip); const events = files["events.jsonl"].toString().trim().split("\n").map(l => JSON.parse(l)); expect(events.some(e => e.requestId === request.requestId && e.kind === "DECOY_INTERACTION")).toBe(true); const records = JSON.parse(files["incidents.json"].toString()); expect(records[0].actions).toEqual([expect.objectContaining({ actorId: b.actorId, action: "quarantine" })]);
});
it("first untrusted inbox read cannot contaminate the legacy trusted baseline", async () => {
  const { a, b } = await organization(); const root = await invoke(a, "read_document", "docs/research"); const sent = await invoke(a, "send_message", "agents/outbox", { content: "Agent-authored data stays untrusted", targetId: b.actorId, referenceRequestId: root.requestId }); const before = await db.profile.findUniqueOrThrow({ where: { agentId: b.actorId } }); const read = await invoke(b, "read_inbox", "agents/inbox", { messageId: JSON.parse(sent.output!).messageId }); expect(read.allowed).toBe(true); expect((await db.profile.findUniqueOrThrow({ where: { agentId: b.actorId } })).observations).toBe(before.observations);
});
