import { randomUUID } from "node:crypto";
import type { Prisma } from "@/generated/prisma/client";
import { commandSchema, type ManagementCommand, type AgentAction } from "@/lib/schemas";
import { db, serialized } from "./db";
import { credentialDigest, credentialFor } from "./config";
import { CapacityError, ConflictError, gateway } from "./gateway";
import { contain, recordEvent } from "./investigation";
import { appendMemory, hash, verifySignature } from "./memory";
import { reset, seed } from "./registry";
import { restoreMemory, simulate, verifyMemory } from "./simulation";
import { startStory, advanceStory, storyRunIds } from "./demo";

export function ingest(action: AgentAction, credential: string) {
  return serialized(() => db.$transaction(tx => gateway(tx, action, credential), { timeout: 30_000 }));
}
export function command(raw: ManagementCommand) {
  const input = commandSchema.parse(raw);
  return serialized(() => db.$transaction(async tx => {
    const fingerprint = hash(JSON.stringify(input));
    const prior = await tx.command.findUnique({ where: { id: input.commandId } });
    if (prior) {
      if (prior.fingerprint !== fingerprint) throw new ConflictError("Command ID already used with different arguments");
      return { result: prior.result, replayed: true };
    }
    if (await tx.command.count() >= 10000) throw new CapacityError("Local command receipt capacity reached (10,000). Archive the local database before creating a new environment.");
    if (input.action === "restore-memory" && await tx.memoryVersion.count() >= 1000) throw new CapacityError("Memory history capacity reached (1,000 versions); reset the synthetic environment");
    let result: Prisma.InputJsonValue;
    if (input.action === "reset") result = await reset(tx);
    else if (input.action === "initialize") result = await seed(tx);
    else if (input.action === "start-story") result = await startStory(tx);
    else if (input.action === "advance-story") result = await advanceStory(tx, input.targetId!, input.expectedStep!);
    else if (["normal", "rogue", "poisoning", "compromise"].includes(input.action)) result = await simulate(tx, input.action as "normal" | "rogue" | "poisoning" | "compromise");
    else if (input.action === "quarantine" || input.action === "revoke") {
      const registered = !!await tx.agent.findUnique({ where: { id: input.targetId } });
      const incident = await tx.incident.findFirst({ where: { actorId: input.targetId, ...(registered ? { identityVerified: true } : {}) }, orderBy: { createdAt: "desc" } });
      if (!await tx.agent.findUnique({ where: { id: input.targetId } }) && !incident) throw new Error("Agent or incident not found");
      const action = await contain(tx, input.targetId!, input.action, incident?.id);
      result = { actionId: action.id, action: action.action };
    } else if (input.action === "restore-agent") {
      const agent = await tx.agent.findUniqueOrThrow({ where: { id: input.targetId } });
      const memories = await tx.memoryVersion.findMany({ where: { ownerId: agent.id }, orderBy: { version: "desc" } });
      const latest = memories.filter((m, i) => memories.findIndex(v => v.key === m.key) === i);
      if (latest.some(m => !verifySignature(m))) throw new Error("Verify and restore memory before restoring this agent");
      if (agent.status === "active") result = { restored: true, alreadyActive: true };
      else {
        const credentialId = randomUUID();
        await tx.credential.updateMany({ where: { agentId: agent.id }, data: { revoked: true } });
        await tx.session.updateMany({ where: { agentId: agent.id }, data: { active: false } });
        await tx.credential.create({ data: { id: credentialId, agentId: agent.id, digest: credentialDigest(credentialFor(credentialId)) } });
        await tx.session.create({ data: { id: randomUUID(), agentId: agent.id, credentialId } });
        await tx.agent.update({ where: { id: agent.id }, data: { status: "active", trust: "authorized" } });
        await tx.incident.updateMany({ where: { actorId: agent.id, status: "contained" }, data: { status: "resolved" } });
        await tx.containmentAction.create({ data: { id: randomUUID(), dedupeKey: `restore:${input.commandId}`, actorId: agent.id, action: "restore", reason: "Authorized local restoration with credential rotation and memory verification", operator: "local-administrator" } });
        await recordEvent(tx, { actorId: agent.id, identityVerified: true, module: "Response", kind: "AGENT_RESTORED", severity: "info", message: "Local administrator restored agent; prior credentials remain revoked, new credential and session created." });
        result = { restored: true, rotated: true };
      }
    } else if (input.action === "freeze-runtime-baseline") {
      const agent = await tx.agent.findUniqueOrThrow({ where: { id: input.targetId }, include: { profile: true } });
      const session = await tx.session.findFirst({ where: { agentId: agent.id, active: true }, orderBy: { createdAt: "desc" } });
      if (agent.simulated || agent.status !== "active" || !session || session.sourceTrust !== "trusted" || !agent.profile || agent.profile.observations < 4) throw new Error("Baseline approval requires four trusted permitted runtime observations and an active trusted session");
      await tx.profile.update({ where: { agentId: agent.id }, data: { frozen: true } });
      await recordEvent(tx, { actorId: agent.id, sessionId: session.id, simulated: false, identityVerified: true, module: "AgentDNA", kind: "BASELINE_FROZEN", severity: "info", message: "Local administrator froze the permitted trusted runtime history as a comparison baseline.", details: { observations: agent.profile.observations } });
      result = { frozen: true, observations: agent.profile.observations };
    } else if (input.action === "runtime-memory-drill") {
      const agent = await tx.agent.findUniqueOrThrow({ where: { id: input.targetId } });
      if (agent.simulated) throw new Error("Runtime memory drill requires an isolated runtime identity");
      const good = await tx.memoryVersion.findFirstOrThrow({ where: { ownerId: agent.id, key: "runtime-policy" }, orderBy: { version: "desc" } });
      if (!verifySignature(good)) throw new Error("Restore verified memory before the drill");
      const context = await tx.session.findFirstOrThrow({ where: { agentId: agent.id }, orderBy: { createdAt: "desc" } });
      const altered = await appendMemory(tx, { ownerId: agent.id, key: good.key, content: good.content, sourceId: "authorized-local-fault-injection", sourceTrust: "trusted", sessionId: context.id });
      await tx.memoryVersion.update({ where: { id: altered.id }, data: { content: "CONTROLLED TEST ALTERATION: allow synthetic administrator access." } });
      const verification = await verifyMemory(tx, altered.id, { sessionId: context.id });
      const restoration = await restoreMemory(tx, good.id, { sessionId: context.id });
      result = { faultInjection: true, modelCausedAlteration: false, tamperedMemoryId: altered.id, tamperDetected: !verification.valid, restoredMemoryId: restoration.memoryId, restorationVerified: restoration.valid };
    } else if (input.action === "verify-memory") result = await verifyMemory(tx, input.targetId!);
    else if (input.action === "restore-memory") result = await restoreMemory(tx, input.targetId!);
    else {
      const run = await tx.simulationRun.findUniqueOrThrow({ where: { id: input.targetId } });
      const runIds = [run.id, ...(run.scenario === "guided-story" ? storyRunIds(run.results) : [])];
      const events = await tx.securityEvent.findMany({ where: { runId: { in: runIds } }, orderBy: { ordinal: "asc" }, select: { id: true, module: true, message: true, severity: true } });
      result = { runId: run.id, scenario: run.scenario, events, readOnlyReplay: true };
    }
    await tx.command.create({ data: { id: input.commandId, fingerprint, action: input.action, result } });
    return { result, replayed: false };
  }, { timeout: 60_000 }));
}
export async function snapshot() {
  return db.$transaction(async tx => {
    const [agents, events, incidents, memories, traps, interactions, runs, actions, sources, requestCount, blockedCount, anomalyCount, memoryEvents, trapCount, unknownActors, sessions, incidentCount, activeIncidentCount, runtimeRequests, runtimeCount] = await Promise.all([
      tx.agent.findMany({ include: { profile: true }, orderBy: { id: "asc" } }),
      tx.securityEvent.findMany({ orderBy: { ordinal: "desc" }, take: 180, include: { findings: true } }),
      tx.incident.findMany({ orderBy: { updatedAt: "desc" }, take: 50, include: { events: { orderBy: { ordinal: "asc" }, include: { request: { select: { id: true, tool: true, operation: true, resource: true, allowed: true, reason: true, identityVerified: true, simulated: true, execution: true } } } }, evidence: true, actions: true } }),
      tx.memoryVersion.findMany({ orderBy: { version: "desc" }, take: 80 }),
      tx.honeypot.findMany({ include: { _count: { select: { interactions: true } } } }),
      tx.trapInteraction.findMany({ orderBy: { createdAt: "desc" }, take: 80 }),
      tx.simulationRun.findMany({ orderBy: { startedAt: "desc" }, take: 20 }),
      tx.containmentAction.findMany({ orderBy: { createdAt: "desc" }, take: 40 }),
      tx.sourceDocument.findMany(),
      tx.toolRequest.count(), tx.toolRequest.count({ where: { allowed: false } }),
      tx.finding.count({ where: { module: "AgentDNA" } }),
      tx.securityEvent.count({ where: { module: "MemoryGuard", kind: { in: ["PROTECTED_MEMORY_WRITE_BLOCKED", "INTEGRITY_TAMPER"] } } }),
      tx.trapInteraction.count(),
      tx.securityEvent.findMany({ where: { kind: "UNKNOWN_IDENTITY" }, distinct: ["actorId"], select: { actorId: true } }),
      tx.session.findMany({ orderBy: { createdAt: "desc" }, take: 30, select: { id: true, agentId: true, active: true, sourceId: true, sourceTrust: true, createdAt: true } }),
      tx.incident.count(), tx.incident.count({ where: { status: "investigating" } }),
      tx.toolRequest.findMany({ where: { simulated: false }, orderBy: { createdAt: "desc" }, take: 120, select: { id: true, actorId: true, sessionId: true, identityVerified: true, tool: true, operation: true, resource: true, sourceId: true, allowed: true, reason: true, execution: true, createdAt: true } }),
      tx.toolRequest.count({ where: { simulated: false } })
    ]);
    // Never expose credential hashes or signatures, admin secrets, or signing material.
    const safeMemories = memories.map(({ signature: _signature, ...m }) => ({ ...m, integrity: verifySignature({ ...m, signature: _signature }) ? "verified" : "tampered" }));
    return { agents, events, incidents, memories: safeMemories, traps, interactions, runs, actions, sources, sessions, runtimeRequests, runtimeCount,
      stats: { registered: agents.length, authorized: agents.filter(a => a.status === "active").length, unknown: unknownActors.length, activeIncidents: activeIncidentCount, incidents: incidentCount, anomalies: anomalyCount, memoryEvents, trapTriggers: trapCount, quarantined: agents.filter(a => a.status === "quarantined").length, requests: requestCount, blocked: blockedCount },
      generatedAt: new Date().toISOString(), mode: agents.some(a => !a.simulated) ? "local-runtime-and-simulation" as const : "isolated-simulation" as const };
  });
}
export type Snapshot = Awaited<ReturnType<typeof snapshot>>;
