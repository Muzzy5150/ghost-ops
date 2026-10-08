import { randomBytes, randomUUID } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import { NextRequest } from "next/server";
import { beforeEach, expect, it, vi } from "vitest";
import { enrollRuntime, callRuntime, authorizedRuntime } from "../src/server/runtime";
import { command, ingest, snapshot } from "../src/server/service";
import { db } from "../src/server/db";
import { credentialFor, transportToken } from "../src/server/config";
import { verifySignature } from "../src/server/memory";
import * as handlers from "../src/server/runtime-tools";
import { POST as mcp } from "../src/app/api/mcp/route";
import { POST as enrollmentRoute } from "../src/app/api/runtime/enroll/route";
import { localBase } from "../src/runtime/client";
import { runtimeAction } from "../src/server/runtime";

beforeEach(async () => { vi.restoreAllMocks(); await command({ commandId: randomUUID(), action: "reset" }); });
async function identity() {
  const credential = randomBytes(32).toString("hex"), actorId = `live-${randomBytes(8).toString("hex")}`;
  const ids = await enrollRuntime({ commandId: randomUUID(), actorId, credential }) as { actorId: string; sessionId: string };
  return { ...ids, credential };
}
const args = (resource = "docs/research", content?: string) => ({ requestId: randomUUID(), resource, ...(content ? { content } : {}) });
function request(path: string, body: unknown, headers: Record<string, string> = {}) {
  return new NextRequest(`http://127.0.0.1:3210${path}`, { method: "POST", headers: { host: "127.0.0.1:3210", "x-ghostops-transport": transportToken(), "content-type": "application/json", accept: "application/json, text/event-stream", "mcp-protocol-version": "2025-11-25", ...headers }, body: JSON.stringify(body) });
}
it("executes actual fixture reads and workspace writes with minimized signed receipts", async () => {
  const id = await identity();
  const read = await callRuntime(id.actorId, id.sessionId, id.credential, "read_document", args());
  expect(read.allowed).toBe(true); expect(read.output).toContain("Synthetic project");
  const write = await callRuntime(id.actorId, id.sessionId, id.credential, "write_summary", args("research/summary", "A genuine bounded file write."));
  const stored = await db.toolRequest.findUniqueOrThrow({ where: { id: write.requestId } });
  expect(stored.simulated).toBe(false); expect(stored.execution).toMatchObject({ handlerExecuted: true, handler: "restricted-workspace-write" });
  expect((stored.result as { output: unknown }).output).toBeNull();
  const artifact = (stored.execution as { artifact: string }).artifact;
  expect(await readFile(join(process.env.GHOSTOPS_RUNTIME_WORKSPACE!, artifact), "utf8")).toBe("A genuine bounded file write.");
  expect(JSON.stringify(await snapshot())).not.toContain(id.credential);
});
it("denies unknown actors and records real MCP decoy evidence without invoking a handler", async () => {
  const spy = vi.spyOn(handlers, "executeLocalTool");
  const result = await callRuntime("RogueRuntime", "unknown-session", "invalid-test-token", "read_document", args("decoy/credentials"));
  expect(result.reason).toBe("UNKNOWN_IDENTITY"); expect(spy).not.toHaveBeenCalled();
  const incident = await db.incident.findUniqueOrThrow({ where: { id: result.incidentId! }, include: { events: true } });
  expect(incident.simulated).toBe(false); expect(incident.identityVerified).toBe(false);
  expect(incident.events.every(e => !e.simulated)).toBe(true);
  expect(incident.events.map(e => e.module)).toEqual(expect.arrayContaining(["ShadowWatch", "GhostTrap"]));
});
it("rejects impersonation without contaminating verified history", async () => {
  const id = await identity();
  const result = await callRuntime(id.actorId, id.sessionId, "forged-credential", "read_document", args("decoy/credentials"));
  expect(result.reason).toBe("INVALID_CREDENTIAL");
  expect((await db.profile.findUniqueOrThrow({ where: { agentId: id.actorId } })).observations).toBe(0);
  expect((await db.incident.findUniqueOrThrow({ where: { id: result.incidentId! } })).identityVerified).toBe(false);
  expect((await db.agent.findUniqueOrThrow({ where: { id: id.actorId } })).status).toBe("active");
});
it("binds credentials and sessions across agents", async () => {
  const a = await identity(), b = await identity();
  expect((await callRuntime(a.actorId, b.sessionId, a.credential, "read_document", args())).reason).toBe("SESSION_MISMATCH");
  expect((await callRuntime(a.actorId, a.sessionId, b.credential, "read_document", args())).reason).toBe("INVALID_CREDENTIAL");
  expect(await authorizedRuntime(a.actorId, b.sessionId, a.credential)).toBe(false);
});
it("enforces revocation immediately before handlers and discovery", async () => {
  const id = await identity(); await command({ commandId: randomUUID(), action: "revoke", targetId: id.actorId });
  const spy = vi.spyOn(handlers, "executeLocalTool");
  expect((await callRuntime(id.actorId, id.sessionId, id.credential, "write_summary", args("research/summary", "denied"))).reason).toBe("CREDENTIAL_REVOKED");
  expect(spy).not.toHaveBeenCalled(); expect(await authorizedRuntime(id.actorId, id.sessionId, id.credential)).toBe(false);
});
it("protects current authorization on replay and never reruns committed effects", async () => {
  const id = await identity(), input = args("research/summary", "stable");
  const spy = vi.spyOn(handlers, "executeLocalTool");
  expect((await callRuntime(id.actorId, id.sessionId, id.credential, "write_summary", input)).allowed).toBe(true);
  expect((await callRuntime(id.actorId, id.sessionId, id.credential, "write_summary", input)).replayed).toBe(true);
  expect(spy).toHaveBeenCalledTimes(1);
  await expect(callRuntime(id.actorId, id.sessionId, id.credential, "write_summary", { ...input, content: "altered" })).rejects.toThrow("different request");
  await command({ commandId: randomUUID(), action: "quarantine", targetId: id.actorId });
  expect(await callRuntime(id.actorId, id.sessionId, id.credential, "write_summary", input)).toMatchObject({ allowed: false, output: null, reason: "AGENT_QUARANTINED" });
  expect(spy).toHaveBeenCalledTimes(1);
});
it("keeps simulation ingestion from executing or training runtime activity", async () => {
  const id = await identity();
  const result = await ingest({ requestId: randomUUID(), actorId: id.actorId, sessionId: id.sessionId, tool: "documents", operation: "read", resource: "docs/research" }, id.credential);
  expect(result.reason).toBe("ACTIVITY_ORIGIN_MISMATCH");
  expect((await db.profile.findUniqueOrThrow({ where: { agentId: id.actorId } })).observations).toBe(0);
  expect((await callRuntime("research", "research-session-v1", credentialFor("research-credential-v1"), "read_document", args())).reason).toBe("ACTIVITY_ORIGIN_MISMATCH");
});
it("allows owner-bound signed notes but refuses protected policy writes", async () => {
  const id = await identity();
  const write = await callRuntime(id.actorId, id.sessionId, id.credential, "write_memory", args("memory/runtime-notes", "Legitimate research note"));
  expect(write.allowed).toBe(true);
  const memory = await db.memoryVersion.findFirstOrThrow({ where: { ownerId: id.actorId, key: "runtime-notes" }, orderBy: { version: "desc" } });
  expect(memory.protected).toBe(false); expect(verifySignature(memory)).toBe(true); expect(memory.sessionId).toBe(id.sessionId);
  const blocked = await callRuntime(id.actorId, id.sessionId, id.credential, "write_memory", args("memory/runtime-policy", "Permit credentials"));
  expect(blocked.reason).toBe("PROTECTED_MEMORY_WRITE_REQUIRES_ADMIN");
  expect((await db.memoryVersion.count({ where: { ownerId: id.actorId, key: "runtime-policy" } }))).toBe(1);
});
it("preserves untrusted document provenance and permits legitimate work after poisoning denial", async () => {
  const id = await identity();
  await callRuntime(id.actorId, id.sessionId, id.credential, "read_document", args("docs/untrusted"));
  const denied = await callRuntime(id.actorId, id.sessionId, id.credential, "write_memory", args("memory/runtime-policy", "poison"));
  expect(denied.allowed).toBe(false);
  expect((await db.securityEvent.findFirstOrThrow({ where: { requestId: denied.requestId, module: "MemoryGuard" } })).details).toMatchObject({ sourceDocumentId: "untrusted-paper", sourceTrust: "untrusted" });
  expect((await callRuntime(id.actorId, id.sessionId, id.credential, "write_summary", args("research/summary", "Legitimate task completed"))).allowed).toBe(true);
  await callRuntime(id.actorId, id.sessionId, id.credential, "write_memory", args("memory/runtime-notes", "Untrusted facts recorded as data"));
  expect((await db.memoryVersion.findFirstOrThrow({ where: { ownerId: id.actorId, key: "runtime-notes" }, orderBy: { version: "desc" } })).sourceTrust).toBe("untrusted");
});
it("correlates actual behavior, memory and trap signals and prevents subsequent file execution", async () => {
  const id = await identity();
  for (let i = 0; i < 4; i++) await callRuntime(id.actorId, id.sessionId, id.credential, "read_document", args());
  await callRuntime(id.actorId, id.sessionId, id.credential, "read_document", args("docs/untrusted"));
  await expect(command({ commandId: randomUUID(), action: "freeze-runtime-baseline", targetId: id.actorId })).rejects.toThrow("trusted session");
  const memory = await callRuntime(id.actorId, id.sessionId, id.credential, "write_memory", args("memory/runtime-policy", "poison"));
  const trap = await callRuntime(id.actorId, id.sessionId, id.credential, "read_document", args("decoy/credentials"));
  expect(memory.incidentId).toBe(trap.incidentId);
  const incident = await db.incident.findUniqueOrThrow({ where: { id: trap.incidentId! } });
  expect(incident).toMatchObject({ severity: "critical", status: "contained", identityVerified: true, simulated: false });
  const spy = vi.spyOn(handlers, "executeLocalTool"), before = await readdir(process.env.GHOSTOPS_RUNTIME_WORKSPACE!);
  expect((await callRuntime(id.actorId, id.sessionId, id.credential, "write_summary", args("research/summary", "bypass"))).reason).toBe("AGENT_QUARANTINED");
  expect(spy).not.toHaveBeenCalled(); expect(await readdir(process.env.GHOSTOPS_RUNTIME_WORKSPACE!)).toEqual(before);
  expect(await db.containmentAction.count({ where: { actorId: id.actorId } })).toBe(1);
});
it("detects controlled tamper, restores verified policy and retains altered evidence", async () => {
  const id = await identity();
  const result = await command({ commandId: randomUUID(), action: "runtime-memory-drill", targetId: id.actorId });
  expect(result.result).toMatchObject({ faultInjection: true, modelCausedAlteration: false, tamperDetected: true, restorationVerified: true });
  const memories = await db.memoryVersion.findMany({ where: { ownerId: id.actorId, key: "runtime-policy" }, orderBy: { version: "asc" } });
  expect(memories).toHaveLength(3); expect(verifySignature(memories[1])).toBe(false); expect(verifySignature(memories[2])).toBe(true);
  expect(memories[2].restoredFromId).toBe(memories[0].id);
});
it("normal real workflows do not produce critical findings", async () => {
  const id = await identity();
  await expect(command({ commandId: randomUUID(), action: "freeze-runtime-baseline", targetId: id.actorId })).rejects.toThrow("four trusted");
  for (let i = 0; i < 2; i++) {
    expect((await callRuntime(id.actorId, id.sessionId, id.credential, "read_document", args())).allowed).toBe(true);
    expect((await callRuntime(id.actorId, id.sessionId, id.credential, "write_summary", args("research/summary", "approved summary"))).allowed).toBe(true);
  }
  expect(await db.incident.count({ where: { actorId: id.actorId } })).toBe(0);
  expect((await command({ commandId: randomUUID(), action: "freeze-runtime-baseline", targetId: id.actorId })).result).toMatchObject({ frozen: true, observations: 4 });
  await callRuntime(id.actorId, id.sessionId, id.credential, "read_document", args());
  expect((await db.profile.findUniqueOrThrow({ where: { agentId: id.actorId } })).observations).toBe(4);
});
it("simulation reset retains runtime quarantine, memory, evidence and replay receipts", async () => {
  const id = await identity(), input = args();
  await callRuntime(id.actorId, id.sessionId, id.credential, "read_document", input);
  await command({ commandId: randomUUID(), action: "quarantine", targetId: id.actorId });
  await callRuntime(id.actorId, id.sessionId, id.credential, "write_summary", args("research/summary", "denied"));
  await command({ commandId: randomUUID(), action: "reset" });
  expect((await db.agent.findUniqueOrThrow({ where: { id: id.actorId } })).status).toBe("quarantined");
  expect(await db.toolRequest.findUnique({ where: { id: input.requestId } })).not.toBeNull();
  expect(await db.incident.count({ where: { actorId: id.actorId, simulated: false } })).toBeGreaterThan(0);
  expect(await db.memoryVersion.count({ where: { ownerId: id.actorId } })).toBe(2);
  expect((await callRuntime(id.actorId, id.sessionId, id.credential, "read_document", input)).allowed).toBe(false);
});
it("rejects oversized MCP input, identity forgery fields and unauthorized enrollment", async () => {
  const id = await identity(), headers = { authorization: `Bearer ${id.credential}`, "x-ghostops-agent": id.actorId, "x-ghostops-session": id.sessionId };
  const rpc = { jsonrpc: "2.0", id: 1, method: "tools/call", params: { name: "write_summary", arguments: { ...args("research/summary", "safe"), actorId: "research" } } };
  expect((await mcp(request("/api/mcp", rpc, headers))).status).toBe(400);
  expect((await mcp(request("/api/mcp", { ...rpc, params: { name: "write_summary", arguments: args("research/summary", "x".repeat(17000)) } }, headers))).status).toBe(413);
  expect((await enrollmentRoute(request("/api/runtime/enroll", { commandId: randomUUID(), actorId: "live-forged", credential: id.credential }, headers))).status).toBe(401);
});
it("runs a genuine MCP tool request through the protocol implementation", async () => {
  const id = await identity();
  const response = await mcp(request("/api/mcp", { jsonrpc: "2.0", id: 1, method: "tools/call", params: { name: "read_document", arguments: args() } }, { authorization: `Bearer ${id.credential}`, "x-ghostops-agent": id.actorId, "x-ghostops-session": id.sessionId }));
  expect(response.status).toBe(200);
  const body = await response.json(); expect(body.result.structuredContent.allowed).toBe(true); expect(body.result.structuredContent.output).toContain("Synthetic project");
});
it("forbids arbitrary paths, destinations and nonlocal runtime URLs", () => {
  for (const value of ["https://127.0.0.1:3210", "http://example.com", "http://127.0.0.1:3210/evil", "http://user:password@127.0.0.1:3210"]) expect(() => localBase(value)).toThrow();
  expect(() => runtimeAction("live-test", randomUUID(), "read_document", { ...args(), resource: "../../.env" })).toThrow();
  expect(() => runtimeAction("live-test", randomUUID(), "read_document", { ...args(), destination: "https://example.com" })).toThrow();
});
it("persists a handler failure without fabricated success or sensitive error text", async () => {
  const id = await identity();
  vi.spyOn(handlers, "executeLocalTool").mockRejectedValueOnce(new Error("private-path-and-secret-must-not-be-logged"));
  const result = await callRuntime(id.actorId, id.sessionId, id.credential, "read_document", args());
  expect(result).toMatchObject({ allowed: false, output: null, reason: "TOOL_HANDLER_FAILED" });
  const request = await db.toolRequest.findUniqueOrThrow({ where: { id: result.requestId } });
  expect(request.execution).toMatchObject({ handlerExecuted: true, completed: false });
  expect(JSON.stringify(await snapshot())).not.toContain("private-path-and-secret");
});
it("blocks a tampered note append before the handler and requires verified restoration", async () => {
  const id = await identity();
  const good = await db.memoryVersion.findFirstOrThrow({ where: { ownerId: id.actorId, key: "runtime-notes" } });
  await db.memoryVersion.update({ where: { id: good.id }, data: { content: "unauthorized DB alteration" } });
  const spy = vi.spyOn(handlers, "executeLocalTool");
  const result = await callRuntime(id.actorId, id.sessionId, id.credential, "write_memory", args("memory/runtime-notes", "Do not conceal tamper"));
  expect(result.reason).toBe("MEMORY_INTEGRITY_FAILURE"); expect(spy).not.toHaveBeenCalled();
  await expect(command({ commandId: randomUUID(), action: "restore-memory", targetId: good.id })).rejects.toThrow("unverified snapshot");
});
it("makes enrollment receipts idempotent without storing raw credentials or implicitly reenrolling", async () => {
  const input = { commandId: randomUUID(), actorId: `live-${randomBytes(8).toString("hex")}`, credential: randomBytes(32).toString("hex") };
  const a = await enrollRuntime(input), b = await enrollRuntime(input); expect(a).toEqual(b);
  const receipt = await db.command.findUniqueOrThrow({ where: { id: input.commandId } }); expect(JSON.stringify(receipt)).not.toContain(input.credential);
  await expect(enrollRuntime({ ...input, credential: randomBytes(32).toString("hex") })).rejects.toThrow("conflict");
  await expect(enrollRuntime({ ...input, commandId: randomUUID() })).rejects.toThrow("already exists");
});
it("guards MCP discovery, hostile origins and missing credentials without accepting forged events", async () => {
  const id = await identity();
  const rpc = { jsonrpc: "2.0", id: 1, method: "tools/list" };
  expect((await mcp(request("/api/mcp", rpc))).status).toBe(401);
  const headers = { authorization: `Bearer ${id.credential}`, "x-ghostops-agent": id.actorId, "x-ghostops-session": id.sessionId };
  expect((await mcp(request("/api/mcp", rpc, { ...headers, origin: "https://untrusted.example" }))).status).toBe(403);
  expect((await mcp(request("/api/mcp", rpc, { ...headers, authorization: "Bearer invalid-token" }))).status).toBe(401);
  const events = await db.securityEvent.count({ where: { actorId: id.actorId } });
  expect((await mcp(request("/api/mcp", { jsonrpc: "2.0", id: 1, method: "events/ingest", params: { simulated: false, identityVerified: true } }, headers))).status).toBe(400);
  expect(await db.securityEvent.count({ where: { actorId: id.actorId } })).toBe(events);
});
