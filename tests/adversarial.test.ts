import { randomUUID } from "node:crypto";
import { beforeEach, expect, it } from "vitest";
import { db } from "../src/server/db";
import { command, ingest, snapshot } from "../src/server/service";
import { credentialFor, adminSession, validAdminSession, csrfToken } from "../src/server/config";
import { appendMemory, verifySignature } from "../src/server/memory";

const action = () => ({ requestId: randomUUID(), actorId: "research", sessionId: "research-session-v1", tool: "documents" as const, operation: "read" as const, resource: "docs/research" });
const secret = () => credentialFor("research-credential-v1");
beforeEach(async () => { await command({ commandId: randomUUID(), action: "reset" }); });

it("does not let an impersonator complete authenticated compromise correlation", async () => {
  await command({ commandId: randomUUID(), action: "normal" });
  await ingest({ ...action(), tool: "memory", operation: "write", resource: "memory/research-policy", content: "poison" }, secret());
  const victim = await db.incident.findFirstOrThrow({ where: { actorId: "research" } });
  const forged = await ingest({ ...action(), tool: "credentials", resource: "decoy/credentials" }, "forged-secret");
  expect(forged.reason).toBe("INVALID_CREDENTIAL");
  expect(forged.incidentId).not.toBe(victim.id);
  expect((await db.agent.findUniqueOrThrow({ where: { id: "research" } })).status).toBe("active");
  expect(await db.containmentAction.count()).toBe(0);
  expect((await ingest(action(), secret())).allowed).toBe(true);
});

it.each(["quarantine", "revoke"] as const)("rechecks current authorization on a cached receipt after %s", async operation => {
  const original = action();
  expect((await ingest(original, secret())).allowed).toBe(true);
  await command({ commandId: randomUUID(), action: operation, targetId: "research" });
  const replay = await ingest(original, secret());
  expect(replay).toMatchObject({ allowed: false, output: null, replayed: true });
  expect(await db.toolRequest.count()).toBe(1);
  expect(await db.containmentAction.count()).toBe(1);
});

it("derives untrusted source provenance from the catalogue even when sourceId is omitted", async () => {
  const before = await db.profile.findUniqueOrThrow({ where: { agentId: "research" } });
  expect((await ingest({ ...action(), operation: "ingest", resource: "docs/untrusted" }, secret())).allowed).toBe(true);
  expect(await db.session.findUniqueOrThrow({ where: { id: action().sessionId } })).toMatchObject({ sourceId: "untrusted-paper", sourceTrust: "untrusted" });
  expect((await db.profile.findUniqueOrThrow({ where: { agentId: "research" } })).observations).toBe(before.observations);
  await ingest({ ...action(), tool: "deploy", operation: "execute", resource: "infra/deploy" }, secret());
  expect(await db.finding.count({ where: { rule: "POST_INGESTION_ESCALATION" } })).toBe(1);
  expect((await ingest({ ...action(), tool: "summarize", operation: "write", resource: "research/summary" }, secret())).allowed).toBe(true);
});

it.each([false, true])("isolates delimiter-colliding actor/session pairs (reverse=%s)", async reverse => {
  const pairs = [{ actorId: "alpha:beta", sessionId: "gamma" }, { actorId: "alpha", sessionId: "beta:gamma" }];
  if (reverse) pairs.reverse();
  const results = [];
  for (const pair of pairs) results.push(await ingest({ ...action(), ...pair, tool: "credentials", resource: "decoy/credentials" }, "unknown-secret"));
  expect(results[0].incidentId).not.toBe(results[1].incidentId);
  expect(await db.incident.count()).toBe(2);
  for (const pair of pairs) {
    const incident = await db.incident.findFirstOrThrow({ where: pair, include: { events: true } });
    expect(incident.events.every(e => e.actorId === pair.actorId && e.sessionId === pair.sessionId)).toBe(true);
  }
});

it("does not allow forged requests to poison authenticated frequency baselines", async () => {
  await command({ commandId: randomUUID(), action: "normal" });
  for (let i = 0; i < 20; i++) await ingest(action(), "invalid-credential");
  await ingest(action(), secret());
  expect(await db.finding.count({ where: { rule: "TOOL_BURST" } })).toBe(0);
});

it.each(["session", "permissions", "integrity"])("rechecks %s before disclosing cached output", async boundary => {
  const original = boundary === "integrity" ? { ...action(), tool: "memory" as const, resource: "memory/research-policy" } : action();
  expect((await ingest(original, secret())).allowed).toBe(true);
  if (boundary === "session") await db.session.update({ where: { id: original.sessionId }, data: { active: false } });
  if (boundary === "permissions") await db.agent.update({ where: { id: "research" }, data: { permissions: { tools: [], resources: [], destinations: [] } } });
  if (boundary === "integrity") { const m = await db.memoryVersion.findFirstOrThrow({ orderBy: { version: "desc" } }); await db.memoryVersion.update({ where: { id: m.id }, data: { content: "tampered" } }); }
  expect(await ingest(original, secret())).toMatchObject({ allowed: false, output: null, replayed: true });
  await ingest(original, secret());
  expect(await db.securityEvent.count({ where: { kind: "REPLAY_ACCESS_DENIED" } })).toBe(1);
});

it("rejects source substitution and cross-agent memory access", async () => {
  expect((await ingest({ ...action(), operation: "ingest", resource: "docs/untrusted", sourceId: "system-policy" }, secret())).reason).toBe("INVALID_SOURCE_CONTEXT");
  const count = await db.memoryVersion.count();
  const support = { ...action(), actorId: "support", sessionId: "support-session-v1", tool: "memory" as const, resource: "memory/research-policy" };
  expect((await ingest(support, credentialFor("support-credential-v1"))).allowed).toBe(false);
  expect((await ingest({ ...support, requestId: randomUUID(), operation: "write", content: "poison" }, credentialFor("support-credential-v1"))).allowed).toBe(false);
  expect(await db.memoryVersion.count()).toBe(count);
});

it.each(["ownerId", "key", "version", "parentId", "sourceId", "sourceTrust", "sessionId", "authorization", "protected", "restoredFromId", "createdAt"] as const)("signs memory provenance field %s", async field => {
  const memory = await db.memoryVersion.findFirstOrThrow({ orderBy: { version: "desc" } });
  const changed = { ...memory, [field]: field === "ownerId" ? "support" : field === "version" ? 77 : field === "protected" ? false : field === "createdAt" ? new Date(0) : "forged" };
  expect(verifySignature(changed)).toBe(false);
});

it("checks latest snapshots for every key before restoring an agent", async () => {
  await command({ commandId: randomUUID(), action: "quarantine", targetId: "research" });
  const other = await db.$transaction(tx => appendMemory(tx, { ownerId: "research", key: "secondary-policy", content: "synthetic second policy", sourceId: "authorized-test", sourceTrust: "trusted" }));
  await db.memoryVersion.update({ where: { id: other.id }, data: { content: "tampered secondary policy" } });
  await expect(command({ commandId: randomUUID(), action: "restore-agent", targetId: "research" })).rejects.toThrow("Verify and restore memory");
});

it("expires administrative authority server-side and binds CSRF to the session", () => {
  const now = Date.now();
  const session = adminSession(now);
  expect(validAdminSession(session, now)).toBe(true);
  expect(validAdminSession(session, now + 8 * 3600_000)).toBe(false);
  expect(validAdminSession(session.slice(0, -1) + (session.endsWith("0") ? "1" : "0"), now)).toBe(false);
  expect(csrfToken(session)).not.toBe(csrfToken(adminSession(now)));
});

it("executes a persisted ten-step story with compare-and-advance protection and real evidence", async () => {
  const started = (await command({ commandId: randomUUID(), action: "start-story" })).result as { runId: string };
  for (let step = 0; step < 10; step++) {
    const input = { commandId: randomUUID(), action: "advance-story" as const, targetId: started.runId, expectedStep: step };
    await command(input);
    expect((await command(input)).replayed).toBe(true);
    await expect(command({ ...input, commandId: randomUUID() })).rejects.toThrow();
    if (step === 5) expect((await db.agent.findUniqueOrThrow({ where: { id: "research" } })).status).toBe("active");
    if (step === 8) expect((await snapshot()).memories[0].integrity).toBe("tampered");
  }
  const state = await snapshot();
  expect(state.stats).toMatchObject({ requests: 27, blocked: 6, incidents: 2, quarantined: 1, trapTriggers: 3 });
  expect(state.memories[0].integrity).toBe("verified");
  const incident = state.incidents.find(i => i.severity === "critical")!;
  expect(incident.identityVerified).toBe(true);
  expect(incident.events.some(e => e.kind === "CORRELATION_ESCALATED")).toBe(true);
  expect(incident.events.some(e => e.kind === "AGENT_QUARANTINED")).toBe(true);
  expect(incident.events.every((e, i, all) => i === 0 || e.ordinal > all[i - 1].ordinal)).toBe(true);
  expect((await db.simulationRun.findUniqueOrThrow({ where: { id: started.runId } })).status).toBe("completed");
});
