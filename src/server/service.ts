import { randomUUID } from "node:crypto";
import type { Prisma } from "@/generated/prisma/client";
import { commandSchema, type ManagementCommand, type AgentAction } from "@/lib/schemas";
import { db, serialized } from "./db";
import { credentialDigest, credentialFor } from "./config";
import { CapacityError, ConflictError, gateway } from "./gateway";
import { contain, recordEvent } from "./investigation";
import { hash, verifySignature } from "./memory";
import { reset, seed } from "./registry";
import { restoreMemory, simulate, verifyMemory } from "./simulation";

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
    else if (["normal", "rogue", "poisoning", "compromise"].includes(input.action)) result = await simulate(tx, input.action as "normal" | "rogue" | "poisoning" | "compromise");
    else if (input.action === "quarantine" || input.action === "revoke") {
      const incident = await tx.incident.findFirst({ where: { actorId: input.targetId }, orderBy: { createdAt: "desc" } });
      if (!await tx.agent.findUnique({ where: { id: input.targetId } }) && !incident) throw new Error("Agent or incident not found");
      const action = await contain(tx, input.targetId!, input.action, incident?.id);
      result = { actionId: action.id, action: action.action };
    } else if (input.action === "restore-agent") {
      const agent = await tx.agent.findUniqueOrThrow({ where: { id: input.targetId } });
      const latest = await tx.memoryVersion.findFirst({ where: { ownerId: agent.id }, orderBy: { version: "desc" } });
      if (latest && !verifySignature(latest)) throw new Error("Verify and restore memory before restoring this agent");
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
        await recordEvent(tx, { actorId: agent.id, module: "Response", kind: "AGENT_RESTORED", severity: "info", message: "Local administrator restored agent; prior credentials remain revoked, new credential and session created." });
        result = { restored: true, rotated: true };
      }
    } else if (input.action === "verify-memory") result = await verifyMemory(tx, input.targetId!);
    else if (input.action === "restore-memory") result = await restoreMemory(tx, input.targetId!);
    else {
      const run = await tx.simulationRun.findUniqueOrThrow({ where: { id: input.targetId } });
      const events = await tx.securityEvent.findMany({ where: { runId: run.id }, orderBy: { createdAt: "asc" }, select: { id: true, module: true, message: true, severity: true } });
      result = { runId: run.id, scenario: run.scenario, events, readOnlyReplay: true };
    }
    await tx.command.create({ data: { id: input.commandId, fingerprint, action: input.action, result } });
    return { result, replayed: false };
  }, { timeout: 60_000 }));
}
export async function snapshot() {
  return db.$transaction(async tx => {
    const [agents, events, incidents, memories, traps, interactions, runs, actions, sources, requestCount, blockedCount, anomalyCount, memoryEvents, trapCount, unknownActors, sessions, incidentCount, activeIncidentCount] = await Promise.all([
      tx.agent.findMany({ include: { profile: true }, orderBy: { id: "asc" } }),
      tx.securityEvent.findMany({ orderBy: { createdAt: "desc" }, take: 180, include: { findings: true } }),
      tx.incident.findMany({ orderBy: { updatedAt: "desc" }, take: 50, include: { events: { orderBy: { createdAt: "asc" } }, evidence: true, actions: true } }),
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
      tx.incident.count(), tx.incident.count({ where: { status: "investigating" } })
    ]);
    // Never expose credential hashes or signatures, admin secrets, or signing material.
    const safeMemories = memories.map(({ signature: _signature, ...m }) => ({ ...m, integrity: verifySignature({ ...m, signature: _signature }) ? "verified" : "tampered" }));
    return { agents, events, incidents, memories: safeMemories, traps, interactions, runs, actions, sources, sessions,
      stats: { registered: agents.length, authorized: agents.filter(a => a.status === "active").length, unknown: unknownActors.length, activeIncidents: activeIncidentCount, incidents: incidentCount, anomalies: anomalyCount, memoryEvents, trapTriggers: trapCount, quarantined: agents.filter(a => a.status === "quarantined").length, requests: requestCount, blocked: blockedCount },
      generatedAt: new Date().toISOString(), mode: "isolated-simulation" as const };
  });
}
export type Snapshot = Awaited<ReturnType<typeof snapshot>>;
