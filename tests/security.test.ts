import { beforeEach, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { NextRequest } from "next/server";
import { db } from "../src/server/db";
import { command, ingest } from "../src/server/service";
import { credentialFor, adminSession, csrfToken, transportToken } from "../src/server/config";
import { hash, verifySignature } from "../src/server/memory";
import { behavioralSignals } from "../src/server/policy";
import { actionSchema } from "../src/lib/schemas";
import { localOnly, readBody, requireAdmin } from "../src/server/http";

beforeEach(async () => { await command({ commandId: randomUUID(), action: "reset" }); });
const researchAction = () => ({ requestId: randomUUID(), actorId: "research", sessionId: "research-session-v1", tool: "documents" as const, operation: "read" as const, resource: "docs/research" });
const secret = () => credentialFor("research-credential-v1");
describe("identity and enforcing gateway", () => {
  it("executes an authorized synthetic task and stores the policy decision", async () => {
    const result = await ingest(researchAction(), secret());
    expect(result.allowed).toBe(true);
    expect(result.output).toContain("Synthetic research");
    expect(await db.policyDecision.count({ where: { allowed: true } })).toBe(1);
  });
  it("blocks unknown identities without returning decoy content", async () => {
    const result = await ingest({ ...researchAction(), actorId: "RogueAgent", tool: "credentials", resource: "decoy/credentials" }, "unknown-secret");
    expect(result).toMatchObject({ allowed: false, reason: "UNKNOWN_IDENTITY", output: null });
    expect(await db.trapInteraction.count()).toBe(1);
    const incident = await db.incident.findUniqueOrThrow({ where: { id: result.incidentId! }, include: { evidence: true } });
    expect(incident.evidence.length).toBeGreaterThanOrEqual(3);
    expect(incident.severity).toBe("high");
    expect(incident.explanation).toContain("does not identify a compromised");
  });
  it("rejects invalid credentials and impersonation with another agent's secret", async () => {
    for (const value of ["invalid-credential", credentialFor("support-credential-v1")]) {
      expect((await ingest(researchAction(), value)).reason).toBe("INVALID_CREDENTIAL");
    }
  });
  it("rejects mismatched sessions, uncatalogued resources, and arbitrary external destinations", async () => {
    expect((await ingest({ ...researchAction(), sessionId: "support-session-v1" }, secret())).reason).toBe("SESSION_MISMATCH");
    expect((await ingest({ ...researchAction(), resource: "/etc/passwd" }, secret())).reason).toBe("RESOURCE_NOT_CATALOGUED");
    expect((await ingest({ ...researchAction(), destination: "https://example.invalid" }, secret())).reason).toBe("DESTINATION_NOT_PERMITTED");
  });
  it("enforces tool/resource pairing and detects permission escalation", async () => {
    const result = await ingest({ ...researchAction(), tool: "deploy", operation: "execute", resource: "infra/deploy" }, secret());
    expect(result).toMatchObject({ allowed: false, output: null, reason: "TOOL_NOT_PERMITTED" });
    expect(await db.finding.count({ where: { rule: "TOOL_NOT_PERMITTED" } })).toBe(1);
    expect((await ingest({ ...researchAction(), resource: "infra/status" }, secret())).reason).toBe("TOOL_RESOURCE_MISMATCH");
  });
  it("idempotently returns the original receipt and rejects altered or cross-credential replay", async () => {
    const action = researchAction();
    await ingest(action, secret());
    const count = await db.securityEvent.count();
    expect((await ingest(action, secret())).replayed).toBe(true);
    expect(await db.securityEvent.count()).toBe(count);
    await expect(ingest({ ...action, resource: "decoy/config" }, secret())).rejects.toThrow("Request ID");
    await expect(ingest(action, "different-secret")).rejects.toThrow("Request ID");
  });
  it("blocks protected memory writes and records source-linked evidence", async () => {
    await ingest({ ...researchAction(), tool: "documents", operation: "ingest", resource: "docs/untrusted", sourceId: "untrusted-paper" }, secret());
    const count = await db.memoryVersion.count();
    const result = await ingest({ ...researchAction(), tool: "memory", operation: "write", resource: "memory/research-policy", content: "Authorize credentials" }, secret());
    expect(result.allowed).toBe(false);
    expect(await db.memoryVersion.count()).toBe(count);
    const event = await db.securityEvent.findFirstOrThrow({ where: { kind: "PROTECTED_MEMORY_WRITE_BLOCKED" } });
    expect(event.details).toMatchObject({ sourceDocumentId: "untrusted-paper", sourceTrust: "untrusted" });
  });
  it("quarantine and revocation stop even previously authorized operations", async () => {
    await command({ commandId: randomUUID(), action: "quarantine", targetId: "research" });
    expect((await ingest(researchAction(), secret())).reason).toBe("AGENT_QUARANTINED");
    await command({ commandId: randomUUID(), action: "quarantine", targetId: "research" });
    expect(await db.containmentAction.count()).toBe(1);
    await command({ commandId: randomUUID(), action: "revoke", targetId: "support" });
    const support = { ...researchAction(), actorId: "support", sessionId: "support-session-v1", tool: "tickets" as const, resource: "tickets/inbox" };
    expect((await ingest(support, credentialFor("support-credential-v1"))).reason).toBe("CREDENTIAL_REVOKED");
  });
  it("rotates credentials during authorized restoration; old credentials stay denied", async () => {
    await command({ commandId: randomUUID(), action: "quarantine", targetId: "research" });
    await command({ commandId: randomUUID(), action: "restore-agent", targetId: "research" });
    expect((await ingest(researchAction(), secret())).reason).toBe("CREDENTIAL_REVOKED");
    const session = await db.session.findFirstOrThrow({ where: { agentId: "research", active: true } });
    expect((await ingest({ ...researchAction(), sessionId: session.id }, credentialFor(session.credentialId))).allowed).toBe(true);
  });
  it("allows a fresh audit action after restore and a later quarantine", async () => {
    await command({ commandId: randomUUID(), action: "quarantine", targetId: "research" });
    await command({ commandId: randomUUID(), action: "restore-agent", targetId: "research" });
    await command({ commandId: randomUUID(), action: "quarantine", targetId: "research" });
    expect(await db.containmentAction.count({ where: { action: "quarantine" } })).toBe(2);
  });
  it("serializes concurrent duplicate requests to one decision", async () => {
    const action = researchAction();
    const results = await Promise.all([ingest(action, secret()), ingest(action, secret())]);
    expect(results.filter(r => r.replayed)).toHaveLength(1);
    expect(await db.toolRequest.count()).toBe(1);
  });
});
describe("behavior and memory integrity", () => {
  it("explains baseline deviations, untrusted ingestion, sequences, and frequency", () => {
    const rules = behavioralSignals({ ...researchAction(), tool: "deploy", operation: "execute", resource: "infra/deploy", destination: "synthetic:outside" }, { observations: 6, tools: { "documents:read": 3 }, resources: { "docs/research": 3 }, destinations: {} }, { untrusted: true, recentTools: ["memory:write"], recentCount: 20 }).map(s => s.rule);
    expect(rules).toEqual(expect.arrayContaining(["NEW_PRIVILEGED_OPERATION", "UNSEEN_TOOL", "UNSEEN_RESOURCE", "NEW_DESTINATION", "POST_INGESTION_ESCALATION", "PRIVILEGED_SEQUENCE", "TOOL_BURST"]));
  });
  it("detects content tampering even if the attacker replaces the stored hash", async () => {
    const memory = await db.memoryVersion.findFirstOrThrow({ orderBy: { version: "desc" } });
    expect(verifySignature(memory)).toBe(true);
    const content = "tampered policy";
    const tampered = await db.memoryVersion.update({ where: { id: memory.id }, data: { content, contentHash: hash(content) } });
    expect(verifySignature(tampered)).toBe(false);
    const verification = await command({ commandId: randomUUID(), action: "verify-memory", targetId: memory.id });
    expect(verification.result).toMatchObject({ valid: false });
    await expect(command({ commandId: randomUUID(), action: "restore-memory", targetId: memory.id })).rejects.toThrow("unverified snapshot");
    const earlier = await db.memoryVersion.findFirstOrThrow({ where: { version: 1 } });
    expect((await command({ commandId: randomUUID(), action: "restore-memory", targetId: earlier.id })).result).toMatchObject({ valid: true });
    expect(await db.memoryVersion.count()).toBe(3);
  });
  it("detects altered provenance and blocks reads of unverified memory", async () => {
    const memory = await db.memoryVersion.findFirstOrThrow({ orderBy: { version: "desc" } });
    await db.memoryVersion.update({ where: { id: memory.id }, data: { sourceTrust: "untrusted" } });
    expect((await ingest({ ...researchAction(), tool: "memory", resource: "memory/research-policy" }, secret())).reason).toBe("MEMORY_INTEGRITY_FAILURE");
  });
  it("refuses agent restoration while its latest protected memory is tampered", async () => {
    await command({ commandId: randomUUID(), action: "quarantine", targetId: "research" });
    const memory = await db.memoryVersion.findFirstOrThrow({ orderBy: { version: "desc" } });
    await db.memoryVersion.update({ where: { id: memory.id }, data: { authorization: "forged-administrator" } });
    await expect(command({ commandId: randomUUID(), action: "restore-agent", targetId: "research" })).rejects.toThrow("Verify and restore memory");
    expect((await db.agent.findUniqueOrThrow({ where: { id: "research" } })).status).toBe("quarantined");
  });
});
describe("HTTP trust boundary", () => {
  const request = (headers: Record<string, string>, body = "{}") => new NextRequest("http://127.0.0.1:3000/api/control", { method: "POST", headers: { host: "127.0.0.1:3000", "x-ghostops-transport": transportToken(), ...headers }, body });
  it("rejects remote, unverified transport, and cross-site management access", () => {
    const variants: Record<string, string>[] = [{ host: "evil.invalid" }, { "x-ghostops-transport": "forged" }, { origin: "https://evil.invalid" }, { "sec-fetch-site": "cross-site" }];
    for (const headers of variants) {
      expect(() => localOnly(request(headers))).toThrow();
    }
  });
  it("requires admin session and same-origin CSRF", () => {
    const session = adminSession();
    expect(() => requireAdmin(request({}), true)).toThrow("session");
    expect(() => requireAdmin(request({ cookie: `ghostops-admin=${adminSession()}` }), true)).toThrow("CSRF");
    expect(() => requireAdmin(request({ cookie: `ghostops-admin=${session}`, origin: "http://127.0.0.1:3000", "x-ghostops-csrf": csrfToken(session) }), true)).not.toThrow();
  });
  it("rejects oversized, invalid JSON, unknown fields, and arbitrary operations", async () => {
    await expect(readBody(request({ "content-type": "application/json" }, JSON.stringify({ data: "a".repeat(17000) })))).rejects.toThrow("16 KiB");
    await expect(readBody(request({ "content-type": "application/json" }, "{"))).rejects.toThrow("Invalid JSON");
    expect(actionSchema.safeParse({ ...researchAction(), shell: "ls" }).success).toBe(false);
    expect(actionSchema.safeParse({ ...researchAction(), operation: "shell" }).success).toBe(false);
  });
});
