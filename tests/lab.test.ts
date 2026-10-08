import { randomUUID, randomBytes } from "node:crypto";
import { expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { labStartSchema } from "../src/lib/lab-contract";
import { startExperiment, executeExperiment, cancelExperiment, experimentSnapshot, recoverExperiments } from "../src/server/lab";
import { callRuntime, enrollRuntime } from "../src/server/runtime";
import { db } from "../src/server/db";
import { command } from "../src/server/service";
import { verifySignature } from "../src/server/memory";
import * as handlers from "../src/server/runtime-tools";
import { GET as labGet, POST as labPost } from "../src/app/api/lab/route";
import { POST as labCancel } from "../src/app/api/lab/cancel/route";
import { transportToken } from "../src/server/config";

const base = "http://127.0.0.1:3210";
const input = (scenario = "normal", mode = "local") => labStartSchema.parse({ commandId: randomUUID(), scenario, mode });
const localCall: NonNullable<Parameters<typeof executeExperiment>[2]> = (name, resource, content, requestId, who) => callRuntime(who.actorId, who.sessionId, who.credential, name, { requestId, resource, ...(content ? { content } : {}) });
async function finish(scenario = "normal", mode = "local") {
  const started = await startExperiment(input(scenario, mode));
  await executeExperiment(started.runId, base, localCall);
  return db.experimentRun.findUniqueOrThrow({ where: { id: started.runId }, include: { observations: true, invocations: true } });
}
it("normal local experiments execute bounded tools without critical incidents or invented inference", async () => {
  const run = await finish();
  expect(run.status).toBe("completed"); expect(run.invocations).toHaveLength(0);
  expect(run.results).toMatchObject({ requests: 3, allowed: 3, denied: 0, handlerExecutions: 3, verifiedModelCalls: 0, scriptedDecisions: true });
  expect(await db.incident.count({ where: { actorId: run.actorId } })).toBe(0);
  expect((await db.session.findUniqueOrThrow({ where: { id: run.sessionId! } })).active).toBe(false);
  expect((await db.credential.findUniqueOrThrow({ where: { id: run.credentialId! } })).revoked).toBe(true);
});
it("offline experiments use simulation decisions and never execute local handlers", async () => {
  const spy = vi.spyOn(handlers, "executeLocalTool");
  const run = await finish("prompt-injection", "offline");
  expect(run.status).toBe("completed"); expect(spy).not.toHaveBeenCalled(); spy.mockRestore();
  expect(run.results).toMatchObject({ handlerExecutions: 0, verifiedModelCalls: 0, regressionRequests: 1 });
  const requests = await db.toolRequest.findMany({ where: { actorId: run.actorId } });
  expect(requests.every(r => r.simulated)).toBe(true); expect(requests.some(r => !r.allowed)).toBe(true);
});
it("prompt injection records untrusted provenance and labels the forbidden probe as regression, not model resistance", async () => {
  const run = await finish("prompt-injection");
  const denied = run.observations.find(o => o.kind === "POLICY_BLOCK")!;
  expect(denied.phase).toBe("enforcement-regression");
  expect(run.observations.some(o => o.kind === "MODEL_RESISTANCE")).toBe(false);
  expect((await db.toolRequest.findUniqueOrThrow({ where: { id: denied.requestId! } })).sourceId).toBe("untrusted-paper");
  expect(run.results).toMatchObject({ denied: 1, honeypotInteractions: 1 });
});
it("protected memory remains intact after poisoning while legitimate summaries continue", async () => {
  const run = await finish("memory-poisoning");
  expect(run.status).toBe("completed");
  const verification = run.observations.find(o => o.kind === "MEMORY_VERIFICATION")!;
  expect(verification.details).toMatchObject({ originalIntact: true, integrityVerified: true });
  const policy = await db.memoryVersion.findMany({ where: { ownerId: run.actorId, key: "runtime-policy" } });
  expect(policy).toHaveLength(1); expect(verifySignature(policy[0])).toBe(true);
  expect(run.results).toMatchObject({ denied: 2, allowed: 3 });
  expect(await db.securityEvent.count({ where: { actorId: run.actorId, module: "MemoryGuard", kind: "PROTECTED_MEMORY_WRITE_BLOCKED" } })).toBe(2);
});
it("identity impersonation stays unverified and cannot train or quarantine the claimed agent", async () => {
  const run = await finish("impersonation");
  const denied = await db.toolRequest.findFirstOrThrow({ where: { actorId: run.actorId } });
  expect(denied).toMatchObject({ allowed: false, reason: "INVALID_CREDENTIAL", identityVerified: false, execution: null });
  expect((await db.profile.findUniqueOrThrow({ where: { agentId: run.actorId } })).observations).toBe(0);
  expect((await db.agent.findUniqueOrThrow({ where: { id: run.actorId } })).status).toBe("active");
  expect((await db.incident.findFirstOrThrow({ where: { actorId: run.actorId } })).identityVerified).toBe(false);
});
it("a decoy interaction has actual policy, authenticated identity and incident evidence", async () => {
  const run = await finish("honeypot");
  const trap = await db.trapInteraction.findFirstOrThrow({ where: { actorId: run.actorId } });
  expect(trap.incidentId).toBeTruthy();
  expect((await db.toolRequest.findUniqueOrThrow({ where: { id: trap.requestId } })).identityVerified).toBe(true);
  expect(run.results).toMatchObject({ denied: 1, honeypotInteractions: 1, handlerExecutions: 0 });
});
it("containment blocks the writer before execution and keeps the denial in the timeline", async () => {
  const run = await finish("containment");
  expect(run.status).toBe("completed");
  expect(run.results).toMatchObject({ requests: 2, allowed: 1, denied: 1, handlerExecutions: 1, outcomes: expect.arrayContaining(["CONTAINMENT", "POLICY_BLOCK"]) });
  expect((await db.agent.findUniqueOrThrow({ where: { id: run.actorId } })).status).toBe("quarantined");
  expect((await db.toolRequest.findFirstOrThrow({ where: { actorId: run.actorId, allowed: false } })).execution).toBeNull();
  const incident = await db.incident.findFirstOrThrow({ where: { actorId: run.actorId, identityVerified: true }, include: { actions: true } });
  expect(incident.status).toBe("contained"); expect(incident.actions.some(a => a.action === "quarantine")).toBe(true);
});
it("duplicate experiment delivery and historical reads never re-execute tool effects", async () => {
  const options = input();
  const started = await startExperiment(options); await executeExperiment(started.runId, base, localCall);
  const before = await db.toolRequest.count();
  expect(await startExperiment(options)).toEqual({ runId: started.runId, replayed: true });
  await executeExperiment(started.runId, base, localCall); await experimentSnapshot();
  expect(await db.toolRequest.count()).toBe(before);
  await expect(startExperiment({ ...options, scenario: "honeypot" })).rejects.toThrow("different input");
});
it("prevents concurrent experiments and cancellation before dispatch causes no handler effects", async () => {
  const started = await startExperiment(input());
  await expect(startExperiment(input())).rejects.toThrow("active");
  const cancel = { commandId: randomUUID(), runId: started.runId };
  expect(await cancelExperiment(cancel)).toMatchObject({ cancelRequested: true });
  expect(await cancelExperiment(cancel)).toMatchObject({ cancelRequested: true });
  const spy = vi.fn(localCall); await executeExperiment(started.runId, base, spy);
  expect(spy).not.toHaveBeenCalled();
  expect((await db.experimentRun.findUniqueOrThrow({ where: { id: started.runId } })).status).toBe("cancelled");
});
it("cancellation at an in-flight boundary allows its receipt but dispatches no later tools", async () => {
  const started = await startExperiment(input());
  const spy = vi.fn(async (...args: Parameters<typeof localCall>) => {
    const result = await localCall(...args);
    await cancelExperiment({ commandId: randomUUID(), runId: started.runId }); return result;
  });
  await executeExperiment(started.runId, base, spy);
  expect(spy).toHaveBeenCalledTimes(1);
  expect((await db.experimentRun.findUniqueOrThrow({ where: { id: started.runId } })).status).toBe("cancelled");
});
it("restart recovery releases stale leases, revokes run authority, and does not resume paid/tool work", async () => {
  const started = await startExperiment(input());
  await db.experimentRun.update({ where: { id: started.runId }, data: { workerId: "departed-process" } });
  expect(await recoverExperiments()).toBe(1);
  const run = await db.experimentRun.findUniqueOrThrow({ where: { id: started.runId } });
  expect(run).toMatchObject({ status: "interrupted", slot: null });
  expect((await db.session.findUniqueOrThrow({ where: { id: run.sessionId! } })).active).toBe(false);
  expect((await db.credential.findUniqueOrThrow({ where: { id: run.credentialId! } })).revoked).toBe(true);
  const spy = vi.fn(localCall); await executeExperiment(run.id, base, spy); expect(spy).not.toHaveBeenCalled();
});
it("demo reset preserves offline and runtime experiment evidence and containment", async () => {
  const offline = await finish("prompt-injection", "offline"), rogue = await finish("impersonation", "offline"), local = await finish("containment");
  const before = await db.experimentObservation.count();
  await command({ commandId: randomUUID(), action: "reset" });
  expect(await db.experimentObservation.count()).toBe(before);
  expect(await db.toolRequest.count({ where: { actorId: offline.actorId } })).toBe(3);
  expect((await db.agent.findUniqueOrThrow({ where: { id: local.actorId } })).status).toBe("quarantined");
  expect(await db.incident.count({ where: { actorId: offline.actorId } })).toBe(1);
  expect(await db.securityEvent.count({ where: { runId: rogue.id, kind: "UNKNOWN_IDENTITY" } })).toBe(1);
});
it("requires explicit configuration, cost consent, containment consent and bounded validated input", async () => {
  expect(() => labStartSchema.parse({ ...input(), mode: "model" })).toThrow();
  await expect(startExperiment(labStartSchema.parse({ ...input(), mode: "model", confirmModelCost: true }))).rejects.toThrow("not explicitly configured");
  expect(() => labStartSchema.parse({ ...input("containment"), agentId: "live-selected" })).toThrow();
  expect(() => labStartSchema.parse({ ...input(), budgets: { maxCalls: 999 } })).toThrow();
  expect(() => labStartSchema.parse({ ...input(), credential: "forged", prompt: "untrusted" })).toThrow();
});
it("never silently restores or expands existing contained identities", async () => {
  const contained = await finish("containment");
  await expect(startExperiment({ ...input(), agentId: contained.actorId })).rejects.toThrow("active integrated");
});
it("selected-agent evaluation preserves existing permissions and credentials while closing only run authority", async () => {
  const actorId = `live-existing-${randomBytes(4).toString("hex")}`, credential = randomBytes(32).toString("hex");
  const original = await enrollRuntime({ commandId: randomUUID(), actorId, credential }) as { sessionId: string };
  const before = await db.agent.findUniqueOrThrow({ where: { id: actorId } });
  const started = await startExperiment({ ...input(), agentId: actorId }); await executeExperiment(started.runId, base, localCall);
  expect((await db.agent.findUniqueOrThrow({ where: { id: actorId } })).permissions).toEqual(before.permissions);
  expect((await callRuntime(actorId, original.sessionId, credential, "read_document", { requestId: randomUUID(), resource: "docs/research" })).allowed).toBe(true);
});
it("rejects cross-endpoint command ID reuse", async () => {
  const commandId = randomUUID(); await command({ commandId, action: "initialize" });
  await expect(startExperiment({ ...input(), commandId })).rejects.toThrow("different management action");
});
it("minimizes persisted experiment and model metadata", async () => {
  const snapshot = await experimentSnapshot(), encoded = JSON.stringify(snapshot);
  expect(encoded).not.toContain("lab-run:");
  expect(snapshot.runs.every(r => !("credentialId" in r) && !("workerId" in r) && !("fingerprint" in r))).toBe(true);
  expect(snapshot.runs.every(r => r.observations.every((o, i, all) => !i || o.ordinal > all[i - 1].ordinal))).toBe(true);
});
it("protects lab reads/start/cancel endpoints from agent credentials and forged origins", async () => {
  function request(path: string, body?: unknown) { return new NextRequest(base + path, { method: body ? "POST" : "GET", headers: { host: "127.0.0.1:3210", "x-ghostops-transport": transportToken(), "content-type": "application/json" }, ...(body ? { body: JSON.stringify(body) } : {}) }); }
  expect((await labGet(request("/api/lab"))).status).toBe(401);
  expect((await labPost(request("/api/lab", input()))).status).toBe(401);
  expect((await labCancel(request("/api/lab/cancel", { commandId: randomUUID(), runId: randomUUID() }))).status).toBe(401);
});
