import { randomUUID } from "node:crypto";
import type { Prisma } from "@/generated/prisma/client";
import { db, serialized } from "./db";
import { hash, verifySignature } from "./memory";
import { contain, recordEvent } from "./investigation";
import { ConflictError, CapacityError } from "./gateway";
import { deceptionCatalog, huntCommandSchema } from "@/lib/hunt-contract";
type Tx = Prisma.TransactionClient;
type Counts = Record<string, number>;
const violations = ["TOOL_NOT_PERMITTED", "RESOURCE_NOT_PERMITTED", "PROTECTED_MEMORY_WRITE_REQUIRES_ADMIN", "DELEGATION_NOT_AUTHORIZED", "MESSAGE_NOT_AUTHORIZED"];
const count = (values: string[]) => values.reduce<Counts>((c, v) => ({ ...c, [v]: (c[v] ?? 0) + 1 }), {});
export async function scopedAgents(tx: Tx, sender: string, receiver: string) {
  const scopes = await tx.huntScope.findMany({ take: 21 });
  return scopes.find(s => (s.agentIds as string[]).includes(sender) && (s.agentIds as string[]).includes(receiver));
}
/** Independent permission check BEFORE the bounded communication handler. */
export async function delegationDecision(tx: Tx, action: { actorId: string; sessionId: string; resource: string; targetId?: string; referenceRequestId?: string; messageId?: string }) {
  if (action.resource === "agents/inbox") {
    const m = action.messageId ? await tx.agentMessage.findUnique({ where: { id: action.messageId } }) : null;
    if (!m || m.receiverId !== action.actorId || m.contentHash !== hash(m.content) || !await scopedAgents(tx, m.senderId, action.actorId)) return "MESSAGE_NOT_AUTHORIZED";
    return null;
  }
  const target = action.targetId ? await tx.agent.findUnique({ where: { id: action.targetId } }) : null;
  const reference = action.referenceRequestId ? await tx.toolRequest.findUnique({ where: { id: action.referenceRequestId } }) : null;
  const sentinelSource=reference?.tool==="sentinel"&&["sentinel/advisories","sentinel/repository"].includes(reference.resource)&&(reference.execution as Prisma.JsonObject|null)?.completed===true;
  if (!target || target.simulated || target.status !== "active" || target.id === action.actorId || !await scopedAgents(tx, action.actorId, target.id) || !reference || !reference.identityVerified || reference.simulated || !reference.allowed || reference.actorId !== action.actorId || reference.sessionId !== action.sessionId || !(["documents", "delegation"].includes(reference.tool)||sentinelSource)) return "DELEGATION_NOT_AUTHORIZED";
  return null;
}
async function caseFor(tx: Tx, scopeId: string) {
  return tx.huntCase.upsert({ where: { scopeId }, create: { id: randomUUID(), scopeId, summary: "Operator-scoped synthetic investigation. Links require actual evidence; membership alone is not a causal relationship." }, update: {} });
}
async function link(tx: Tx, caseId: string, event: { id: string; requestId: string | null }, source: string, target: string, relation: string, category: string, details: Prisma.InputJsonObject = {}) {
  const dedupeKey = hash(JSON.stringify([caseId, event.id, source, target, relation]));
  await tx.huntLink.upsert({ where: { dedupeKey }, create: { id: randomUUID(), dedupeKey, caseId, eventId: event.id, requestId: event.requestId, source, target, relation, category, details }, update: {} });
}
async function qualifying(tx: Tx, actorId: string, scopeId: string) {
  const scope = await tx.huntScope.findUniqueOrThrow({ where: { id: scopeId } });
  if (!(scope.agentIds as string[]).includes(actorId)) throw new ConflictError("Actor is outside the explicit lab scope");
  const agent = await tx.agent.findUnique({ where: { id: actorId } });
  const session = await tx.session.findFirst({ where: { agentId: actorId, active: true }, orderBy: { createdAt: "desc" } });
  const credential = session ? await tx.credential.findUnique({ where: { id: session.credentialId } }) : null;
  if (!agent || agent.simulated || agent.status !== "active" || !session || !credential || credential.revoked || credential.agentId !== actorId) return null;
  const requests = await tx.toolRequest.findMany({ where: { actorId, sessionId: session.id, identityVerified: true, simulated: false, allowed: false, events: { some: { identityVerified: true, module: "Gateway", kind: "TOOL_BLOCKED", ordinal: { gt: scope.activationOrdinal } } }, reason: { in: violations } }, orderBy: { createdAt: "desc" }, take: 20 });
  const traps = await tx.trapInteraction.findMany({ where: { actorId, sessionId: session.id, requestId: { in: requests.map(r => r.id) }, trap: { active: true } }, take: 20 });
  if (!traps.length) return null;
  const events = await tx.securityEvent.findMany({ where: { identityVerified: true, actorId, sessionId: session.id, requestId: { in: requests.map(r => r.id) } }, orderBy: { ordinal: "asc" }, take: 400 });
  if (!events.some(e => e.module === "GhostTrap" && e.kind === "DECOY_INTERACTION" && traps.some(t => t.eventId === e.id && t.requestId === e.requestId))) return null;
  return { scope, session, credential, events, incidentId: events.find(e => e.incidentId)?.incidentId ?? undefined };
}
async function preview(tx: Tx, scopeId: string, actorId: string, action: "quarantine" | "revoke") {
  const q = await qualifying(tx, actorId, scopeId);
  if (!q) throw new ConflictError("Preview requires a current verified session, confirmed policy violation and registered active decoy evidence");
  const investigation = await caseFor(tx, scopeId);
  const dedupeKey = `${scopeId}:${actorId}:${q.session.id}:${q.scope.revision}:${action}`;
  return tx.responsePlan.upsert({ where: { dedupeKey }, create: { id: randomUUID(), dedupeKey, caseId: investigation.id, scopeId, actorId, sessionId: q.session.id, credentialId: q.credential.id, revision: q.scope.revision, mode: q.scope.mode, action, evidenceIds: q.events.map(e => e.id), status: q.scope.mode === "OBSERVE" ? "observed" : "pending", expiresAt: new Date(Date.now() + 10 * 60_000), result: { policy: "current authenticated session + confirmed denial + registered decoy; anomaly alone is insufficient", expectedEffect: "Future gateway requests denied before handlers", reversibility: "Authorized restore/rotation issues new credential after verified memory checks", verification: "Await actual credential-bound denied follow-up request with null handler receipt", proposedAction: action, requiredAuthorization: q.scope.mode } }, update: {} });
}
async function executePlan(tx: Tx, id: string, automatic: boolean) {
  const plan = await tx.responsePlan.findUniqueOrThrow({ where: { id } });
  if (plan.status === "executed" || plan.status === "verified") return plan;
  if (plan.status !== "pending" || (automatic ? plan.mode !== "AUTOMATIC" || plan.action !== "quarantine" : plan.mode !== "APPROVAL_REQUIRED")) throw new ConflictError("Response mode does not authorize execution");
  const q = await qualifying(tx, plan.actorId, plan.scopeId);
  if (!q || q.session.id !== plan.sessionId || q.credential.id !== plan.credentialId || q.scope.revision !== plan.revision || q.scope.mode !== plan.mode || plan.expiresAt < new Date() || !(plan.evidenceIds as string[]).every(e => q.events.some(v => v.id === e))) return tx.responsePlan.update({ where: { id }, data: { status: "stale", result: { ...(plan.result as Prisma.InputJsonObject), stale: true } } });
  if (await tx.responsePlan.count({ where: { scopeId: plan.scopeId, executedAt: { gte: new Date(Date.now() - 3600_000) } } }) >= q.scope.maxActionsPerHour) throw new CapacityError("Explicit response rate limit reached");
  const action = await contain(tx, plan.actorId, plan.action as "quarantine" | "revoke", q.incidentId, "Ghost Response: approved current-session violation + decoy evidence", automatic ? "safe-lab-playbook" : "local-operator-approved-plan");
  const event = await recordEvent(tx, { actorId: plan.actorId, sessionId: plan.sessionId, identityVerified: true, simulated: false, module: "Response", kind: "PLAYBOOK_EXECUTED", severity: "info", message: "Bounded playbook invoked existing containment. Enforcement verification awaits a real subsequent gateway request.", details: { planId: id, actionId: action.id, incidentId: q.incidentId ?? null, mode: plan.mode } });
  await link(tx, plan.caseId, event, `agent:${plan.actorId}`, `response:${id}`, "contained-by", "observed", { actionId: action.id });
  return tx.responsePlan.update({ where: { id }, data: { status: "executed", executedAt: new Date(), result: { ...(plan.result as Prisma.InputJsonObject), actionId: action.id, enforcementVerified: false, incidentId: q.incidentId ?? null } } });
}
export async function huntCommand(raw: unknown) {
  const input = huntCommandSchema.parse(raw);
  return serialized(() => db.$transaction(async tx => {
    const fingerprint = hash(JSON.stringify(input));
    const prior = await tx.command.findUnique({ where: { id: input.commandId } });
    if (prior) { if (prior.fingerprint !== fingerprint) throw new ConflictError("Changed hunt command replay"); return prior.result; }
    if (await tx.command.count() >= 10000) throw new CapacityError("Command capacity reached");
    let result: unknown;
    if (input.action === "scope") {
      if (new Set(input.agentIds).size !== input.agentIds.length || await tx.huntScope.count() >= 20) throw new ConflictError("Scope capacity/duplicate identity");
      const existing = await tx.huntScope.findMany();
      for (const id of input.agentIds) {
        const agent = await tx.agent.findUnique({ where: { id } });
        if (!agent || agent.simulated || agent.status !== "active" || existing.some(s => (s.agentIds as string[]).includes(id))) throw new ConflictError("Only active unassigned local runtime identities enter a synthetic hunt scope");
      }
      const latestEvent = await tx.securityEvent.findFirst({ orderBy: { ordinal: "desc" }, select: { ordinal: true } });
      const scope = await tx.huntScope.create({ data: { id: randomUUID(), name: input.name, agentIds: input.agentIds, activationOrdinal: latestEvent?.ordinal ?? 0, createdAt: new Date() } });
      await caseFor(tx, scope.id); result = scope;
    } else if (input.action === "configure") {
      result = await tx.huntScope.update({ where: { id: input.scopeId }, data: { mode: input.mode, learningWindow: input.learningWindow, evaluationWindow: input.evaluationWindow, maxActionsPerHour: input.maxActionsPerHour, revision: { increment: 1 } } });
    } else if (input.action === "baseline") {
      const scope = await tx.huntScope.findUniqueOrThrow({ where: { id: input.scopeId } });
      if (!(scope.agentIds as string[]).includes(input.actorId)) throw new ConflictError("Baseline actor outside scope");
      const dirty = await tx.securityEvent.findMany({ where: { actorId: input.actorId, identityVerified: true, severity: { in: ["low", "medium", "high", "critical"] } }, select: { sessionId: true } });
      const observations = await tx.securityEvent.findMany({ where: { actorId: input.actorId, identityVerified: true, simulated: false, module: "Gateway", kind: "TOOL_EXECUTED", request: { is: { identityVerified: true, simulated: false, allowed: true, sourceId: null, sessionId: { notIn: dirty.flatMap(e => e.sessionId ? [e.sessionId] : []) } } } }, orderBy: { ordinal: "desc" }, take: scope.learningWindow, include: { request: true } });
      const trusted = observations.reverse().flatMap(e => e.request ? [e.request] : []); if (trusted.length < 4) throw new ConflictError("At least four permitted, authenticated, untainted observations required");
      const latest = await tx.behaviorBaseline.findFirst({ where: { agentId: input.actorId }, orderBy: { version: "desc" } });
      result = await tx.behaviorBaseline.create({ data: { id: randomUUID(), agentId: input.actorId, version: (latest?.version ?? 0) + 1, requestIds: trusted.map(r => r.id), learningWindow: scope.learningWindow, evaluationWindow: scope.evaluationWindow, profile: { tools: count(trusted.map(r => `${r.tool}:${r.operation}`)), resources: count(trusted.map(r => r.resource)), sequences: count(trusted.slice(1).filter((r, i) => r.sessionId === trusted[i].sessionId).map(r => { const i = trusted.indexOf(r); return `${trusted[i - 1].tool}:${trusted[i - 1].operation}->${r.tool}:${r.operation}`; })) } } });
    } else if (input.action === "deploy") {
      const scope = await tx.huntScope.findUniqueOrThrow({ where: { id: input.scopeId } });
      const event = await tx.securityEvent.findUniqueOrThrow({ where: { id: input.reasonEventId } });
      if (!event.identityVerified || event.simulated || !(scope.agentIds as string[]).includes(event.actorId) || !event.requestId) throw new ConflictError("Deployment needs scoped verified request evidence");
      if (await tx.deceptionDeployment.count({ where: { scopeId: scope.id, active: true } }) >= 3) throw new CapacityError("Three active approved templates per scope maximum");
      const request = await tx.toolRequest.findUniqueOrThrow({ where: { id: event.requestId } });
      if (!request.identityVerified || request.simulated || request.actorId !== event.actorId || request.sessionId !== event.sessionId) throw new ConflictError("Deployment request binding is not verified");
      const selected = input.template === "adaptive" ? request.tool === "memory" ? "memory" : request.tool === "credentials" ? "credentials" : "admin" : input.template;
      const template = deceptionCatalog[selected];
      const trap = await tx.honeypot.upsert({ where: { resource: template.resource }, create: { id: randomUUID(), ...template, active: true }, update: { active: true } });
      result = await tx.deceptionDeployment.create({ data: { id: randomUUID(), scopeId: scope.id, template: selected, trapId: trap.id, selectionReason: `${input.template === "adaptive" ? "Deterministic approved-catalog selection" : "Operator selection"}: ${selected} from verified ${request.tool} / ${event.kind} / event ${event.id}`, operator: "local-operator", active: true } });
    } else if (input.action === "cleanup") {
      // Templates remain in the original shared catalog; cleanup retires ONLY this
      // scope's overlay, never disables pre-existing traps belonging to other workflows.
      result = await tx.deceptionDeployment.update({ where: { id: input.deploymentId }, data: { active: false, cleanedAt: new Date() } });
    } else if (input.action === "preview") result = await preview(tx, input.scopeId, input.actorId, input.response);
    else if (input.action === "reject") result = await tx.responsePlan.updateMany({ where: { id: input.planId, status: "pending" }, data: { status: "rejected" } });
    else result = await executePlan(tx, input.planId, false);
    const safe = JSON.parse(JSON.stringify(result)) as Prisma.InputJsonValue;
    await tx.command.create({ data: { id: input.commandId, fingerprint, action: `hunt:${input.action}`, result: safe } });
    return safe;
  }, { timeout: 30000 }));
}
/** One bounded transaction; ordinal checkpoint and derived links commit together. */
export async function processHunt(tx: Tx, limit = 64) {
  const started = performance.now();
  const cursor = await tx.huntCursor.upsert({ where: { id: "events-v1" }, create: { id: "events-v1" }, update: {} });
  const events = await tx.securityEvent.findMany({ where: { ordinal: { gt: cursor.ordinal } }, orderBy: { ordinal: "asc" }, take: Math.max(1, Math.min(128, limit)) });
  const scopes = await tx.huntScope.findMany({ take: 20 });
  for (const event of events) {
    if (!event.identityVerified || event.simulated || !event.sessionId) continue;
    const details = event.details && typeof event.details === "object" && !Array.isArray(event.details) ? event.details as Prisma.JsonObject : {};
    const boundSession = await tx.session.findUnique({ where: { id: event.sessionId } });
    const boundCredential = boundSession ? await tx.credential.findUnique({ where: { id: boundSession.credentialId } }) : null;
    if (!boundSession || boundSession.agentId !== event.actorId || boundCredential?.agentId !== event.actorId) continue;
    const scope = scopes.find(s => (s.agentIds as string[]).includes(event.actorId)); if (!scope) continue;
    const investigation = await caseFor(tx, scope.id);
    const base = { ...event, requestId: event.requestId };
    await link(tx, investigation.id, base, `agent:${event.actorId}`, `session:${event.sessionId}`, "authenticated-session-context", "observed");
    const request = event.requestId ? await tx.toolRequest.findUnique({ where: { id: event.requestId } }) : null;
    if (request?.identityVerified && !request.simulated && request.actorId === event.actorId && request.sessionId === event.sessionId) {
      const category = !request.allowed && violations.includes(request.reason) ? "confirmed-violation" : "observed";
      await link(tx, investigation.id, base, `session:${event.sessionId}`, `resource:${request.resource}`, request.allowed ? "executed-tool" : "blocked-request", category, { tool: request.tool, decision: request.reason, allowed: request.allowed });
      await link(tx, investigation.id, base, `session:${event.sessionId}`, `tool:${request.tool}:${request.operation}`, request.allowed ? "executed-capability" : "requested-capability", category);
      await link(tx, investigation.id, base, `tool:${request.tool}:${request.operation}`, `resource:${request.resource}`, "recorded-operation-target", category);
      if (request.sourceId) await link(tx, investigation.id, base, `source:${request.sourceId}`, `session:${event.sessionId}`, "recorded-source-context-not-proof-of-influence", "observed");
      if (request.tool === "memory") {
        const memory = await tx.memoryVersion.findFirst({ where: { ownerId: request.actorId, key: request.resource.slice(7) }, orderBy: { version: "desc" } });
        if (memory) await link(tx, investigation.id, base, `resource:${request.resource}`, `memory:${memory.id}`, "owner-snapshot-at-analysis", "observed", { ownerId: memory.ownerId, version: memory.version, contentHash: memory.contentHash, sourceTrust: memory.sourceTrust, attemptedWrite: request.operation === "write", integrityAtAnalysis: verifySignature(memory), attemptedContentHash: details.attemptedContentHash ?? null, proposedContentRetained: false });
      }
      if (event.module === "Gateway" && ["TOOL_EXECUTED", "TOOL_BLOCKED"].includes(event.kind)) {
        const baseline = await tx.behaviorBaseline.findFirst({ where: { agentId: event.actorId }, orderBy: { version: "desc" } });
        if (baseline) {
          const p = baseline.profile as { tools: Counts; resources: Counts; sequences: Counts };
          const priorEvents = await tx.securityEvent.findMany({ where: { actorId: event.actorId, sessionId: event.sessionId, identityVerified: true, module: "Gateway", requestId: { not: null }, ordinal: { lt: event.ordinal } }, orderBy: { ordinal: "desc" }, take: baseline.evaluationWindow, include: { request: true } });
          const recent = priorEvents.flatMap(e => e.request && e.request.id !== request.id ? [e.request] : []);
          const privileged = [request, ...recent].filter(r => !r.allowed && violations.includes(r.reason) && (["admin", "credentials", "deploy"].includes(r.tool) || r.tool === "memory" && r.operation === "write"));
          const signals = [!p.tools[`${request.tool}:${request.operation}`] ? "UNSEEN_TOOL_V2" : null, !p.resources[request.resource] ? "UNSEEN_RESOURCE_V2" : null, recent[0] && !p.sequences[`${recent[0].tool}:${recent[0].operation}->${request.tool}:${request.operation}`] ? "SEQUENCE_DRIFT_V2" : null, request.sourceId && !request.allowed && violations.includes(request.reason) ? "POST_SOURCE_POLICY_VIOLATION_V2" : null, privileged.length >= 3 && privileged[0].id === request.id ? "PRIVILEGED_DENIAL_BURST_V2" : null].filter(Boolean) as string[];
          for (const rule of signals) {
            if (!await tx.securityEvent.findFirst({ where: { requestId: request.id, kind: rule } })) {
              const finding = await recordEvent(tx, { actorId: event.actorId, sessionId: event.sessionId, requestId: request.id, identityVerified: true, simulated: false, module: "AgentDNA", kind: rule, severity: request.allowed ? "low" : "medium", message: `${rule}: baseline v${baseline.version}; ${request.tool}:${request.operation} / ${request.resource}; ${request.reason}. Novelty is not proof of compromise.`, details: { baselineId: baseline.id, baselineVersion: baseline.version, sourceId: request.sourceId, allowed: request.allowed, previousRequestId: recent[0]?.id ?? null, evaluationWindow: baseline.evaluationWindow, ...(rule === "PRIVILEGED_DENIAL_BURST_V2" ? { privilegedDenials: privileged.length, windowRequestIds: privileged.map(r => r.id) } : {}) }, finding: { rule, explanation: "Explicit tool/resource/sequence comparison against operator-frozen, permitted untainted observations. No probability or hidden intention inferred." } });
              await link(tx, investigation.id, finding, `agent:${event.actorId}`, `finding:${finding.id}`, rule, rule === "POST_SOURCE_POLICY_VIOLATION_V2" ? "suspected-manipulation" : "observed", { baselineId: baseline.id, baselineVersion: baseline.version, ...(rule === "PRIVILEGED_DENIAL_BURST_V2" ? { privilegedDenials: privileged.length, evaluationWindow: baseline.evaluationWindow, windowRequestIds: privileged.map(r => r.id) } : {}) });
            }
          }
        }
      }
      if (["AGENT_QUARANTINED", "CREDENTIAL_REVOKED"].includes(request.reason) && request.execution === null) {
        const plans = await tx.responsePlan.findMany({ where: { actorId: request.actorId, sessionId: request.sessionId, status: "executed", executedAt: { lte: request.createdAt } } });
        for (const plan of plans) {
          const current = await tx.agent.findUnique({ where: { id: request.actorId } });
          const epoch = await tx.credential.findFirst({ where: { agentId: request.actorId }, orderBy: { createdAt: "desc" } });
          if (epoch?.id !== plan.credentialId || current?.status !== (plan.action === "quarantine" ? "quarantined" : "revoked") || request.reason !== (plan.action === "quarantine" ? "AGENT_QUARANTINED" : "CREDENTIAL_REVOKED")) continue;
          await tx.responsePlan.update({ where: { id: plan.id }, data: { status: "verified", result: { ...(plan.result as Prisma.InputJsonObject), enforcementVerified: true, verificationRequestId: request.id, handlerNeverExecuted: true } } });
          await link(tx, investigation.id, base, `response:${plan.id}`, `resource:${request.resource}`, "verified-denied-follow-up", "observed", { handlerNeverExecuted: true });
        }
      }
    }
    if (["CROSS_AGENT_SUBMITTED", "CROSS_AGENT_RECEIVED"].includes(event.kind)) {
      const messageId = details.messageId;
      const message = typeof messageId === "string" ? await tx.agentMessage.findUnique({ where: { id: messageId } }) : null;
      const boundMessage = message && message.scopeId === scope.id && message.contentHash === hash(message.content) && (event.kind === "CROSS_AGENT_SUBMITTED" ? message.senderId === event.actorId && message.requestId === event.requestId : message.receiverId === event.actorId && request?.identityVerified && request.actorId === event.actorId && (request.execution as Prisma.JsonObject | null)?.messageId === message.id);
      if (boundMessage) await link(tx, investigation.id, base, `agent:${message.senderId}`, `agent:${message.receiverId}`, "verified-message-submission-not-proof-of-influence", "observed", { messageId: message.id, referenceRequestId: message.referenceRequestId, rootRequestId: message.rootRequestId, sourceId: message.sourceId, sourceTrust: message.sourceTrust, contentHash: message.contentHash });
    }
    if (event.module === "GhostTrap") { const interaction = await tx.trapInteraction.findFirst({ where: { eventId: event.id, actorId: event.actorId, sessionId: event.sessionId, requestId: event.requestId ?? "" } }); if (interaction) await link(tx, investigation.id, base, `agent:${event.actorId}`, `trap:${interaction.trapId}`, "decoy-interest-not-intent", "observed", { interactionId: interaction.id }); }
    const violationsInCase = await tx.huntLink.findMany({ where: { caseId: investigation.id, category: "confirmed-violation" }, select: { requestId: true } });
    const active = new Set(violationsInCase.flatMap(l => l.requestId ? [l.requestId] : [])).size;
    const linked = await tx.huntLink.count({ where: { caseId: investigation.id, relation: "verified-message-submission-not-proof-of-influence" } });
    await tx.huntCase.update({ where: { id: investigation.id }, data: { lastOrdinal: event.ordinal, status: active ? "investigating" : "observing", summary: `${active} evidence-linked policy violations; ${linked} verified message observations. Explicit synthetic scope; only message references establish cross-agent links. Source context suggests, but does not prove, influence. No hidden reasoning or real-model decision claimed.` } });
  }
  if (events.length) await tx.huntCursor.update({ where: { id: cursor.id }, data: { ordinal: events.at(-1)!.ordinal } });
  for (const scope of scopes.filter(s => s.mode === "AUTOMATIC")) for (const actor of scope.agentIds as string[]) {
    const q = await qualifying(tx, actor, scope.id); if (!q) continue;
    const plan = await preview(tx, scope.id, actor, "quarantine");
    if (plan.status === "pending") { try { await executePlan(tx, plan.id, true); } catch (error) { if (!(error instanceof CapacityError)) throw error; } }
  }
  return { processed: events.length, ordinal: events.at(-1)?.ordinal ?? cursor.ordinal, elapsedMs: performance.now() - started };
}
export const runHuntBatch = () => serialized(() => db.$transaction(tx => processHunt(tx), { timeout: 30000 }));
export async function huntSnapshot() {
  return db.$transaction(async tx => {
    const cases = await tx.huntCase.findMany({ orderBy: { updatedAt: "desc" }, take: 20 });
    const links = await tx.huntLink.findMany({ where: { caseId: { in: cases.map(c => c.id) } }, orderBy: { createdAt: "desc" }, take: 1000 });
    const totalLinks = await tx.huntLink.count({ where: { caseId: { in: cases.map(c => c.id) } } });
    return { cases, links, coverage: { displayedLinks: links.length, totalLinks, truncated: totalLinks > links.length, planLimit: 100, baselineLimit: 100, messageLimit: 100 }, scopes: await tx.huntScope.findMany({ take: 20 }), plans: await tx.responsePlan.findMany({ orderBy: { createdAt: "desc" }, take: 100 }), deployments: await tx.deceptionDeployment.findMany({ orderBy: { createdAt: "desc" }, take: 60 }), baselines: await tx.behaviorBaseline.findMany({ orderBy: { createdAt: "desc" }, take: 100 }), events: await tx.securityEvent.findMany({ where: { id: { in: links.map(l => l.eventId) } }, orderBy: { ordinal: "asc" }, take: 1000 }), messages: (await tx.agentMessage.findMany({ take: 100, orderBy: { createdAt: "desc" } })).map(m => ({ id: m.id, senderId: m.senderId, receiverId: m.receiverId, scopeId: m.scopeId, sourceTrust: m.sourceTrust, sourceId: m.sourceId, contentHash: m.contentHash, rootRequestId: m.rootRequestId, referenceRequestId: m.referenceRequestId, contentOmitted: true })), cursor: await tx.huntCursor.findUnique({ where: { id: "events-v1" } }), limitations: "Operator grouping is not causality. Inference not implied. Legacy correlation containment remains independent. Integrated tools only." };
  });
}
