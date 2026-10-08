import { randomUUID } from "node:crypto";
import type { Prisma } from "@/generated/prisma/client";
import type { AgentAction, Counts, Permissions } from "@/lib/schemas";
import { actionSchema } from "@/lib/schemas";
import { credentialDigest, secureEqual } from "./config";
import { hash, verifySignature } from "./memory";
import { behavioralSignals, permissionDecision, resources } from "./policy";
import { correlate, recordEvent } from "./investigation";

export class ConflictError extends Error {}
export class CapacityError extends Error {}
export type GatewayResult = { requestId: string; allowed: boolean; reason: string; output: string | null; incidentId: string | null; replayed: boolean };
export type RuntimeExecutor = (tx: Prisma.TransactionClient, action: AgentAction) => Promise<{ output: string; metadata: Prisma.InputJsonObject }>;

export async function gateway(tx: Prisma.TransactionClient, rawAction: AgentAction, credential: string, runId?: string, executor?: RuntimeExecutor): Promise<GatewayResult> {
  const action = actionSchema.parse(rawAction);
  const simulated = !executor;
  const fingerprint = hash(JSON.stringify([action, credentialDigest(credential), ...(!simulated ? ["local-runtime"] : [])]));
  const previous = await tx.toolRequest.findUnique({ where: { id: action.requestId } });
  if (previous && previous.fingerprint !== fingerprint) throw new ConflictError("Request ID already used for a different request or credential");
  if (!previous && await tx.toolRequest.count() >= 2000) throw new CapacityError("Local demo capacity reached (2,000 requests); reset the synthetic environment");
  const agent = await tx.agent.findUnique({ where: { id: action.actorId }, include: { profile: true } });
  const session = await tx.session.findUnique({ where: { id: action.sessionId } });
  const storedCredential = await tx.credential.findUnique({ where: { digest: credentialDigest(credential) } });
  // Identity binding is distinct from active authority. Bound revoked credentials
  // still identify containment verification; invalid claims cannot impersonate it.
  const identityVerified = !!(agent && storedCredential?.agentId === agent.id && session?.agentId === agent.id && session.credentialId === storedCredential.id);
  let reason: string | null = null;
  if (!agent) reason = "UNKNOWN_IDENTITY";
  else if (!storedCredential || storedCredential.agentId !== agent.id || !secureEqual(storedCredential.digest, credentialDigest(credential))) reason = "INVALID_CREDENTIAL";
  else if (agent.status === "quarantined") reason = "AGENT_QUARANTINED";
  else if (storedCredential.revoked || agent.status === "revoked") reason = "CREDENTIAL_REVOKED";
  else if (!session || session.agentId !== agent.id || session.credentialId !== storedCredential.id || !session.active) reason = "SESSION_MISMATCH";
  else if (agent.simulated !== simulated) reason = "ACTIVITY_ORIGIN_MISMATCH";
  const authenticated = !reason;
  let source = null;
  const catalogueSource = action.tool === "documents" && action.operation === "ingest" && action.resource === "docs/untrusted" ? "untrusted-paper" : null;
  if (authenticated && (action.sourceId || catalogueSource)) {
    source = await tx.sourceDocument.findUnique({ where: { id: catalogueSource ?? "" } });
    if (!source || action.sourceId && action.sourceId !== catalogueSource || source && (source.contentHash !== hash(source.content) || source.trust !== "untrusted")) reason = "INVALID_SOURCE_CONTEXT";
  }
  if (!reason && agent) reason = permissionDecision(action, agent.permissions as Permissions);
  if (!reason && action.tool === "memory" && (action.operation === "read" || executor && action.resource === "memory/runtime-notes" && action.operation === "write")) {
    const memory = await tx.memoryVersion.findFirst({ where: { ownerId: action.actorId, ...(executor ? { key: action.resource === "memory/runtime-notes" ? "runtime-notes" : "runtime-policy" } : {}) }, orderBy: { version: "desc" } });
    if (!memory || !verifySignature(memory)) reason = "MEMORY_INTEGRITY_FAILURE";
  }
  let allowed = !reason;
  if (previous) {
    const receipt = previous.result as Omit<GatewayResult, "replayed">;
    if (reason) {
      const recorded = await tx.securityEvent.findFirst({ where: { requestId: action.requestId, kind: "REPLAY_ACCESS_DENIED", message: reason } });
      if (!recorded) {
        await recordEvent(tx, { actorId: action.actorId, sessionId: action.sessionId, requestId: action.requestId, identityVerified, module: "Gateway", kind: "REPLAY_ACCESS_DENIED", severity: "info", message: reason, details: { allowed: false, decision: reason, historicalReceiptAllowed: receipt.allowed } });
        await correlate(tx, action.actorId, action.sessionId, identityVerified, simulated);
      }
      return { ...receipt, allowed: false, reason, output: null, replayed: true };
    }
    return { ...receipt, replayed: true };
  }
  let effectiveReason = reason ?? "AUTHORIZED";
  // Only a server-held bounded dispatcher enables execution; observed content grants no authority.
  let output: string | null = allowed ? resources[action.resource].content : null;
  if (allowed && source) output = source.content;
  if (allowed && action.tool === "memory" && !executor) output = (await tx.memoryVersion.findFirst({ where: { ownerId: action.actorId }, orderBy: { version: "desc" } }))!.content;
  await tx.toolRequest.create({ data: { id: action.requestId, fingerprint, actorId: action.actorId, identityVerified, sessionId: action.sessionId, tool: action.tool, operation: action.operation, resource: action.resource, destination: action.destination, sourceId: source?.id ?? (identityVerified ? session?.sourceId : null), runId, allowed, reason: effectiveReason, simulated, result: {} } });
  await tx.policyDecision.create({ data: { id: randomUUID(), requestId: action.requestId, allowed, rule: effectiveReason, reasons: [effectiveReason] } });
  const handlerAttempted = allowed && !!executor;
  if (allowed && executor) {
    try {
      const executed = await executor(tx, action);
      output = executed.output;
      await tx.toolRequest.update({ where: { id: action.requestId }, data: { execution: { ...executed.metadata, handlerExecuted: true, completed: true, outputHash: hash(output), outputBytes: Buffer.byteLength(output) } } });
    } catch {
      // Record an operational failure without disclosing paths, payloads or arbitrary error text.
      allowed = false; output = null; effectiveReason = "TOOL_HANDLER_FAILED";
      await tx.toolRequest.update({ where: { id: action.requestId }, data: { allowed: false, reason: effectiveReason, execution: { handlerExecuted: true, completed: false, error: "BOUNDED_HANDLER_FAILURE" } } });
      await tx.policyDecision.update({ where: { requestId: action.requestId }, data: { allowed: false, rule: effectiveReason, reasons: ["AUTHORIZED", effectiveReason] } });
    }
  }
  const base = { actorId: action.actorId, sessionId: action.sessionId, requestId: action.requestId, runId, identityVerified, simulated };
  await recordEvent(tx, { ...base, module: "Gateway", kind: allowed ? "TOOL_EXECUTED" : effectiveReason === "TOOL_HANDLER_FAILED" ? "TOOL_EXECUTION_FAILED" : "TOOL_BLOCKED", severity: "info", message: `${action.tool}:${action.operation} → ${action.resource} ${allowed ? simulated ? "executed in local simulation" : "executed by bounded local handler" : `did not complete (${effectiveReason})`}.`, details: { tool: action.tool, operation: action.operation, resource: action.resource, allowed, decision: effectiveReason, handlerExecuted: handlerAttempted, ...(action.destination ? { destination: action.destination } : {}) } });
  if (reason && !["PROTECTED_MEMORY_WRITE_REQUIRES_ADMIN", "MEMORY_INTEGRITY_FAILURE"].includes(reason)) {
    await recordEvent(tx, { ...base, module: "ShadowWatch", kind: reason, severity: ["UNKNOWN_IDENTITY", "INVALID_CREDENTIAL", "SESSION_MISMATCH", "CREDENTIAL_REVOKED"].includes(reason) ? "high" : "medium", message: reason === "UNKNOWN_IDENTITY" ? "Unregistered actor denied. Unknown identity does not establish a compromised registered agent." : `Identity or permission boundary enforced: ${reason}.`, details: { claimedIdentity: action.actorId, authenticated, resource: action.resource }, finding: { rule: reason, explanation: `No sensitive operation executed: ${reason}.` } });
  }
  // A denied request can touch a decoy as an observation, without receiving its contents.
  const trap = await tx.honeypot.findUnique({ where: { resource: action.resource } });
  if (trap?.active) {
    const event = await recordEvent(tx, { ...base, module: "GhostTrap", kind: "DECOY_INTERACTION", severity: "low", message: `${action.actorId} attempted ${action.operation} on ${trap.name}. Investigative signal; not proof of intent.`, details: { trapId: trap.id, resource: trap.resource, operation: action.operation, executionAllowed: allowed }, finding: { rule: "DECOY_INTERACTION", explanation: "Synthetic decoy interaction correlates with other evidence; no production secret exists." } });
    await tx.trapInteraction.create({ data: { id: randomUUID(), trapId: trap.id, actorId: action.actorId, sessionId: action.sessionId, requestId: action.requestId, eventId: event.id, operation: action.operation } });
  }
  if (authenticated && agent?.profile) {
    const recent = await tx.toolRequest.findMany({ where: { actorId: agent.id, sessionId: action.sessionId, identityVerified: true, id: { not: action.requestId } }, orderBy: { createdAt: "desc" }, take: 5 });
    const recentCount = await tx.toolRequest.count({ where: { actorId: agent.id, identityVerified: true, createdAt: { gte: new Date(Date.now() - 60_000) } } });
    const profile = { observations: agent.profile.observations, tools: agent.profile.tools as Counts, resources: agent.profile.resources as Counts, destinations: agent.profile.destinations as Counts };
    const signals = behavioralSignals(action, profile, { untrusted: session?.sourceTrust === "untrusted", recentTools: recent.map(r => `${r.tool}:${r.operation}`), recentCount });
    for (const signal of signals) await recordEvent(tx, { ...base, module: "AgentDNA", kind: signal.rule, severity: "medium", message: signal.explanation, details: { baselineObservations: profile.observations, tool: action.tool, resource: action.resource, sourceDocumentId: session?.sourceId ?? null }, finding: signal });
    // Baseline learning only from permitted, trusted activity; freeze after the normal scenario.
    if (allowed && !agent.profile.frozen && session?.sourceTrust !== "untrusted" && !source) {
      const increment = (counts: Counts, key: string) => ({ ...counts, [key]: (counts[key] ?? 0) + 1 });
      const sequence = `${recent[0] ? `${recent[0].tool}:${recent[0].operation}` : "start"} → ${action.tool}:${action.operation}`;
      await tx.profile.update({ where: { agentId: agent.id }, data: { observations: { increment: 1 }, tools: increment(profile.tools, `${action.tool}:${action.operation}`), resources: increment(profile.resources, action.resource), destinations: action.destination ? increment(profile.destinations, action.destination) : profile.destinations, sequences: increment(agent.profile.sequences as Counts, sequence) } });
    }
  }
  if (authenticated && action.tool === "memory" && action.operation === "write" && action.resource !== "memory/runtime-notes") {
    await recordEvent(tx, { ...base, module: "MemoryGuard", kind: "PROTECTED_MEMORY_WRITE_BLOCKED", severity: "high", message: "Protected policy update rejected: agent credentials cannot authorize system policy changes.", details: { sourceDocumentId: session?.sourceId ?? null, sourceTrust: session?.sourceTrust ?? "trusted", attemptedContentHash: hash(action.content ?? ""), resource: action.resource, authorization: "denied" }, finding: { rule: "PROTECTED_MEMORY_WRITE_BLOCKED", explanation: "A persistent policy write requires independent local administrative authority. Untrusted document instructions grant no authority." } });
  }
  if (reason === "MEMORY_INTEGRITY_FAILURE") await recordEvent(tx, { ...base, module: "MemoryGuard", kind: "INTEGRITY_TAMPER", severity: "high", message: "Memory read blocked because its signed content or provenance does not verify.", finding: { rule: "INTEGRITY_TAMPER", explanation: "Stored content and signed provenance failed HMAC verification." } });
  if (allowed && !simulated && action.tool === "memory" && action.operation === "write") await recordEvent(tx, { ...base, module: "MemoryGuard", kind: "AUTHORIZED_MEMORY_APPEND", severity: "info", message: "Signed agent-owned notes appended; independently protected security policy unchanged.", details: { sourceTrust: session?.sourceTrust ?? "trusted", sourceDocumentId: session?.sourceId ?? null, contentHash: hash(action.content ?? ""), protected: false } });
  if (allowed && source) {
    await tx.session.update({ where: { id: action.sessionId }, data: { sourceId: source.id, sourceTrust: source.trust } });
    await recordEvent(tx, { ...base, module: "MemoryGuard", kind: "UNTRUSTED_DOCUMENT_INGESTED", severity: "info", message: `Ingested ${source.name} as untrusted data; document instructions grant no policy authority.`, details: { sourceDocumentId: source.id, contentHash: source.contentHash, trust: source.trust } });
  }
  const incident = await correlate(tx, action.actorId, action.sessionId, identityVerified, simulated);
  const result = { requestId: action.requestId, allowed, reason: effectiveReason, output, incidentId: incident?.id ?? null };
  // Minimized live receipts never retain full document/tool output. Exact retry returns the receipt, not payload.
  await tx.toolRequest.update({ where: { id: action.requestId }, data: { result: simulated ? result : { ...result, output: null } } });
  return { ...result, replayed: false };
}
