import { randomUUID } from "node:crypto";
import type { Prisma } from "@/generated/prisma/client";
import type { Module, Severity } from "@/lib/schemas";

type Tx = Prisma.TransactionClient;
type EventInput = { actorId: string; simulated?: boolean; identityVerified?: boolean; sessionId?: string; requestId?: string; runId?: string; module: Module; kind: string; severity: Severity; message: string; details?: Prisma.InputJsonObject; finding?: { rule: string; explanation: string } };
export async function recordEvent(tx: Tx, input: EventInput) {
  const { finding, ...data } = input;
  const simulated = input.simulated ?? (input.requestId ? (await tx.toolRequest.findUnique({ where: { id: input.requestId } }))?.simulated : (await tx.agent.findUnique({ where: { id: input.actorId } }))?.simulated) ?? true;
  const last = await tx.securityEvent.aggregate({ _max: { ordinal: true } });
  const event = await tx.securityEvent.create({ data: { id: randomUUID(), ...data, simulated, ordinal: (last._max.ordinal ?? 0) + 1, details: data.details ?? {} } });
  if (finding) await tx.finding.create({ data: { id: randomUUID(), eventId: event.id, module: input.module, ...finding } });
  return event;
}
export async function correlate(tx: Tx, actorId: string, sessionId: string, identityVerified: boolean, simulated = true) {
  const suspicious = await tx.securityEvent.findMany({ where: { actorId, sessionId, identityVerified, simulated, severity: { in: ["low", "medium", "high", "critical"] } }, orderBy: { ordinal: "asc" } });
  if (!suspicious.length) return null;
  const modules = [...new Set(suspicious.map(e => e.module).filter(m => !["Gateway", "Response"].includes(m)))];
  const unknown = suspicious.some(e => e.kind === "UNKNOWN_IDENTITY");
  const severeIdentity = suspicious.some(e => ["INVALID_CREDENTIAL", "SESSION_MISMATCH", "CREDENTIAL_REVOKED"].includes(e.kind));
  const memory = modules.includes("MemoryGuard"), behavior = modules.includes("AgentDNA"), trap = modules.includes("GhostTrap");
  const critical = identityVerified && memory && behavior && trap;
  const high = unknown || severeIdentity || memory && behavior || suspicious.some(e => e.severity === "high");
  const severity: Severity = critical ? "critical" : high ? "high" : "medium";
  const reasons = [...new Set(suspicious.map(e => e.kind))];
  const explanation = critical
    ? "Critical correlation rule matched: behavioral deviation + memory manipulation + decoy interaction in the same actor session. Identity is still registered; compromise is suspected from linked behavior. Decoy interest alone does not prove malicious intent."
    : unknown
      ? "An unknown actor attempted an internal operation. The identity gate denied execution. Decoy interaction, when present, supplies investigative context; this does not identify a compromised registered agent."
      : !identityVerified
        ? `Rejected identity claims produced ${modules.join(", ")} observations. The claimed actor/session is not authenticated attribution; these records cannot authorize containment of a registered agent.`
        : `Linked ${modules.join(", ")} findings share one verified actor and session. Severity follows explicit rule combinations, not a probability or machine-learning confidence score.`;
  const correlationKey = JSON.stringify([identityVerified ? "verified" : "claimed", actorId, sessionId, ...(!simulated ? ["local-runtime"] : [])]);
  const existing = await tx.incident.findUnique({ where: { correlationKey } });
  const ranks: Record<string, number> = { info: 0, low: 1, medium: 2, high: 3, critical: 4 };
  const effectiveSeverity = existing && ranks[existing.severity] > ranks[severity] ? existing.severity : severity;
  const incident = await tx.incident.upsert({
    where: { correlationKey },
    create: { id: randomUUID(), correlationKey, actorId, sessionId, identityVerified, title: critical ? "Suspected agent compromise" : unknown ? "Unregistered actor intrusion" : identityVerified ? "Agent trust boundary violation" : "Unverified identity claim", severity, reasons, explanation, recommendation: critical ? "Quarantine the agent, revoke credentials, verify memory, and restore a verified snapshot before authorized restoration." : "Review verified evidence. Unverified claims must not be attributed to a registered agent." },
    update: { severity: effectiveSeverity, reasons, explanation, ...(critical ? { title: "Suspected agent compromise", recommendation: "Quarantine the agent, revoke credentials, verify memory, and restore a verified snapshot before authorized restoration." } : {}) }
  });
  if (incident.simulated !== simulated) await tx.incident.update({ where: { id: incident.id }, data: { simulated } });
  if (!existing || existing.severity !== effectiveSeverity) await recordEvent(tx, { actorId, sessionId, identityVerified, simulated, runId: suspicious.at(-1)?.runId ?? undefined, module: "Response", kind: existing ? "CORRELATION_ESCALATED" : "CORRELATION_CREATED", severity: "info", message: `Deterministic correlation ${existing ? "escalated" : "created"}: ${effectiveSeverity}; ${modules.join(" + ")}.`, details: { incidentId: incident.id, modules, reasons, identityVerified, rule: critical ? "verified behavior + memory + decoy" : "same attributed actor/session findings" } });
  // Include context only from this attribution namespace, never forged claims.
  const timeline = await tx.securityEvent.findMany({ where: { actorId, sessionId, identityVerified, simulated } });
  for (const event of timeline) {
    await tx.securityEvent.update({ where: { id: event.id }, data: { incidentId: incident.id } });
    await tx.evidence.upsert({ where: { eventId: event.id }, create: { id: randomUUID(), eventId: event.id, incidentId: incident.id, summary: event.message }, update: {} });
  }
  await tx.trapInteraction.updateMany({ where: { eventId: { in: timeline.map(e => e.id) } }, data: { incidentId: incident.id } });
  if (critical) await contain(tx, actorId, "quarantine", incident.id, "Automatic deterministic correlation: behavior + memory + decoy", "correlation-engine");
  return incident;
}
export async function contain(tx: Tx, actorId: string, action: "quarantine" | "revoke", incidentId?: string, reason = "Local administrator response", operator = "local-administrator") {
  const agent = await tx.agent.findUnique({ where: { id: actorId } });
  if (agent && incidentId && !(await tx.incident.findUniqueOrThrow({ where: { id: incidentId } })).identityVerified) throw new Error("Unverified identity claims cannot authorize containment of a registered agent");
  const context = incidentId ? await tx.securityEvent.findFirst({ where: { incidentId }, orderBy: { ordinal: "desc" } }) : agent && !agent.simulated ? await tx.securityEvent.findFirst({ where: { actorId, identityVerified: true, simulated: false, sessionId: { not: null } }, orderBy: { ordinal: "desc" } }) : null;
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
  const event = await recordEvent(tx, { actorId, identityVerified: !!agent, simulated: context?.simulated ?? agent?.simulated ?? true, sessionId: context?.sessionId ?? undefined, runId: context?.runId ?? undefined, module: "Response", kind: action.toUpperCase(), severity: "info", message: agent ? `${actorId} ${action === "quarantine" ? "quarantined" : "credentials revoked"}; all credentials revoked and sessions disabled.` : `Unknown actor ${actorId} remains denied by the identity gate.`, details: { actionId: response.id, reason, operator } });
  if (incidentId) {
    await tx.securityEvent.update({ where: { id: event.id }, data: { incidentId } });
    await tx.evidence.create({ data: { id: randomUUID(), incidentId, eventId: event.id, summary: event.message } });
  }
  return response;
}
