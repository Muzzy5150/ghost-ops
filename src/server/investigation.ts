import { randomUUID } from "node:crypto";
import type { Prisma } from "@/generated/prisma/client";
import type { Module, Severity } from "@/lib/schemas";

type Tx = Prisma.TransactionClient;
type EventInput = { actorId: string; sessionId?: string; requestId?: string; runId?: string; module: Module; kind: string; severity: Severity; message: string; details?: Prisma.InputJsonObject; finding?: { rule: string; explanation: string } };
export async function recordEvent(tx: Tx, input: EventInput) {
  const { finding, ...data } = input;
  const event = await tx.securityEvent.create({ data: { id: randomUUID(), ...data, details: data.details ?? {} } });
  if (finding) await tx.finding.create({ data: { id: randomUUID(), eventId: event.id, module: input.module, ...finding } });
  return event;
}
export async function correlate(tx: Tx, actorId: string, sessionId: string) {
  const suspicious = await tx.securityEvent.findMany({ where: { actorId, sessionId, severity: { in: ["low", "medium", "high", "critical"] } }, orderBy: { createdAt: "asc" } });
  if (!suspicious.length) return null;
  const modules = [...new Set(suspicious.map(e => e.module).filter(m => !["Gateway", "Response"].includes(m)))];
  const unknown = suspicious.some(e => e.kind === "UNKNOWN_IDENTITY");
  const severeIdentity = suspicious.some(e => ["INVALID_CREDENTIAL", "SESSION_MISMATCH", "CREDENTIAL_REVOKED"].includes(e.kind));
  const memory = modules.includes("MemoryGuard"), behavior = modules.includes("AgentDNA"), trap = modules.includes("GhostTrap");
  const critical = memory && behavior && trap;
  const high = unknown || severeIdentity || memory && behavior || suspicious.some(e => e.severity === "high");
  const severity: Severity = critical ? "critical" : high ? "high" : "medium";
  const reasons = [...new Set(suspicious.map(e => e.kind))];
  const explanation = critical
    ? "Critical correlation rule matched: behavioral deviation + memory manipulation + decoy interaction in the same actor session. Identity is still registered; compromise is suspected from linked behavior. Decoy interest alone does not prove malicious intent."
    : unknown
      ? "An unknown actor attempted an internal operation. The identity gate denied execution. Decoy interaction, when present, supplies investigative context; this does not identify a compromised registered agent."
      : `Linked ${modules.join(", ")} findings share one actor and session. Severity follows explicit rule combinations, not a probability or machine-learning confidence score.`;
  const correlationKey = `${actorId}:${sessionId}`;
  const existing = await tx.incident.findUnique({ where: { correlationKey } });
  const ranks: Record<string, number> = { info: 0, low: 1, medium: 2, high: 3, critical: 4 };
  const effectiveSeverity = existing && ranks[existing.severity] > ranks[severity] ? existing.severity : severity;
  const incident = await tx.incident.upsert({
    where: { correlationKey },
    create: { id: randomUUID(), correlationKey, actorId, sessionId, title: critical ? "Correlated agent compromise" : unknown ? "Unregistered actor intrusion" : "Agent trust boundary violation", severity, reasons, explanation, recommendation: critical ? "Quarantine the agent, revoke credentials, verify memory, and restore a verified snapshot before authorized restoration." : "Review evidence, verify memory integrity, and contain the actor if linked policy violations continue." },
    update: { severity: effectiveSeverity, reasons, explanation, ...(critical ? { title: "Correlated agent compromise", recommendation: "Quarantine the agent, revoke credentials, verify memory, and restore a verified snapshot before authorized restoration." } : {}) }
  });
  // Include prior normal actions and ingested-source events in the evidence timeline.
  const timeline = await tx.securityEvent.findMany({ where: { actorId, sessionId } });
  for (const event of timeline) {
    await tx.securityEvent.update({ where: { id: event.id }, data: { incidentId: incident.id } });
    await tx.evidence.upsert({ where: { eventId: event.id }, create: { id: randomUUID(), eventId: event.id, incidentId: incident.id, summary: event.message }, update: {} });
  }
  await tx.trapInteraction.updateMany({ where: { actorId, sessionId }, data: { incidentId: incident.id } });
  if (critical) await contain(tx, actorId, "quarantine", incident.id, "Automatic deterministic correlation: behavior + memory + decoy", "correlation-engine");
  return incident;
}
export async function contain(tx: Tx, actorId: string, action: "quarantine" | "revoke", incidentId?: string, reason = "Local administrator response", operator = "local-administrator") {
  const agent = await tx.agent.findUnique({ where: { id: actorId } });
  const epoch = agent ? await tx.credential.findFirst({ where: { agentId: actorId }, orderBy: { createdAt: "desc" } }) : null;
  const dedupeKey = `${actorId}:${action}:${incidentId ?? "manual"}:${epoch?.id ?? "unknown"}`;
  const previous = await tx.containmentAction.findFirst({ where: { actorId, action }, orderBy: { createdAt: "desc" } });
  if (previous && (!agent || action === "quarantine" && agent.status === "quarantined" || action === "revoke" && agent.status === "revoked")) {
    if (incidentId) await tx.incident.update({ where: { id: incidentId }, data: { status: "contained" } });
    return previous;
  }
  if (agent) {
    await tx.agent.update({ where: { id: actorId }, data: { status: action === "quarantine" ? "quarantined" : "revoked", trust: "suspected-compromise" } });
    await tx.credential.updateMany({ where: { agentId: actorId }, data: { revoked: true } });
    await tx.session.updateMany({ where: { agentId: actorId }, data: { active: false } });
  }
  const response = await tx.containmentAction.upsert({ where: { dedupeKey }, create: { id: randomUUID(), dedupeKey, actorId, action, incidentId, reason, operator }, update: {} });
  if (incidentId) await tx.incident.update({ where: { id: incidentId }, data: { status: "contained" } });
  const event = await recordEvent(tx, { actorId, module: "Response", kind: action.toUpperCase(), severity: "info", message: agent ? `${actorId} ${action === "quarantine" ? "quarantined" : "credentials revoked"}; all credentials revoked and sessions disabled.` : `Unknown actor ${actorId} remains denied by the identity gate.`, details: { actionId: response.id, reason, operator } });
  if (incidentId) {
    await tx.securityEvent.update({ where: { id: event.id }, data: { incidentId } });
    await tx.evidence.create({ data: { id: randomUUID(), incidentId, eventId: event.id, summary: event.message } });
  }
  return response;
}
