import type { State } from "./view-types";

export type Entity = { kind: "agent" | "claim" | "session" | "tool" | "resource" | "memory" | "trap" | "incident"; id: string; actorId?: string; sessionId?: string };
export type GraphNode = { id: string; entity: Entity; label: string; detail: string; status: string; position: { x: number; y: number }; incidentIds: string[] };
export type GraphLink = { id: string; source: string; target: string; label: string; blocked: boolean; verified: boolean; count: number; evidenceIds: string[]; incidentIds: string[] };
export type RecordedGraph = { nodes: GraphNode[]; edges: GraphLink[]; compactEdges: GraphLink[]; truncated: boolean };
// Opaque preference keys: labels/resource text never enter localStorage. Two independent 32-bit hashes.
export function nodeKey(value: string): string {
  let a = 2166136261, b = 3339675911;
  for (let i = 0; i < value.length; i++) { a = Math.imul(a ^ value.charCodeAt(i), 16777619); b = Math.imul(b ^ value.charCodeAt(i), 2246822519); }
  return `n-${(a >>> 0).toString(16).padStart(8, "0")}${(b >>> 0).toString(16).padStart(8, "0")}`;
}
const text = (value: unknown) => typeof value === "string" ? value : "";
export function recordedGraph(state: State, incidentId?: string): RecordedGraph {
  const nodes = new Map<string, GraphNode>(), edges = new Map<string, GraphLink>(), compactEdges = new Map<string, GraphLink>();
  const columns: Record<Entity["kind"], number> = { agent: 0, claim: 0, session: 1, tool: 2, resource: 3, memory: 3, trap: 3, incident: 4 };
  const rows: Record<number, number> = {};
  let truncated = false;
  const addNode = (entity: Entity, label: string, detail: string, status: string, incidents: string[] = []) => {
    const id = nodeKey(JSON.stringify(entity));
    const prior = nodes.get(id);
    if (prior) { prior.incidentIds = [...new Set([...prior.incidentIds, ...incidents])]; return id; }
    if (nodes.size >= 160) { truncated = true; return null; }
    const column = columns[entity.kind], row = rows[column] ?? 0; rows[column] = row + 1;
    nodes.set(id, { id, entity, label, detail, status, position: { x: column * 280, y: row * 128 }, incidentIds: incidents });
    return id;
  };
  const link = (source: string | null, target: string | null, label: string, evidenceId: string, blocked = false, verified = true, incidents: string[] = [], compact = false) => {
    if (!source || !target) return;
    const collection = compact ? compactEdges : edges;
    const id = nodeKey(JSON.stringify([source, target, label, blocked, verified]));
    const prior = collection.get(id);
    if (prior) { prior.count++; prior.evidenceIds = [...new Set([...prior.evidenceIds, evidenceId])]; prior.incidentIds = [...new Set([...prior.incidentIds, ...incidents])]; }
    else if (collection.size < 280) collection.set(id, { id, source, target, label, blocked, verified, count: 1, evidenceIds: [evidenceId], incidentIds: incidents });
    else truncated = true;
  };
  const registered = (actorId: string) => {
    const agent = state.agents.find(a => a.id === actorId);
    return agent ? addNode({ kind: "agent", id: actorId }, agent.name, agent.simulated ? "Registered · simulated" : "Registered · local runtime", agent.status) : null;
  };
  const actor = (actorId: string, sessionId: string, verified: boolean) => verified ? registered(actorId) : addNode({ kind: "claim", id: actorId, sessionId }, actorId, "Unverified identity claim · not registry history", "unverified");
  // Process selected investigation first so evidence relevant to the focus survives graph limits.
  const incidents = [...state.incidents].sort((a, b) => Number(b.id === incidentId) - Number(a.id === incidentId));
  for (const incident of incidents) {
    const target = addNode({ kind: "incident", id: incident.id }, `INC-${incident.id.slice(0, 8)}`, incident.title, incident.severity, [incident.id]);
    const source = actor(incident.actorId, incident.sessionId ?? "", incident.identityVerified);
    if (source) nodes.get(source)!.incidentIds.push(incident.id);
    link(source, target, "investigation attribution", incident.id, false, incident.identityVerified, [incident.id]);
  }
  for (const a of state.agents) registered(a.id);
  for (const session of state.sessions) {
    const target = addNode({ kind: "session", id: session.id, actorId: session.agentId }, session.id.slice(0, 8), `Registered session · ${session.sourceTrust} provenance`, session.active ? "active" : "inactive");
    link(registered(session.agentId), target, "registered session", session.id);
  }
  const requests = new Map<string, { id: string; actorId: string; sessionId: string; verified: boolean; tool: string; resource: string; allowed: boolean; simulated: boolean; incidents: string[]; evidenceId: string }>();
  for (const incident of incidents) for (const event of incident.events) if (event.request && event.requestId) {
    const r = event.request;
    requests.set(r.id, { id: r.id, actorId: event.actorId, sessionId: event.sessionId ?? "", verified: event.identityVerified, tool: `${r.tool}:${r.operation}`, resource: r.resource, allowed: r.allowed, simulated: event.simulated, incidents: [incident.id], evidenceId: event.id });
  }
  for (const r of state.runtimeRequests) if (!requests.has(r.id)) requests.set(r.id, { id: r.id, actorId: r.actorId, sessionId: r.sessionId, verified: r.identityVerified, tool: `${r.tool}:${r.operation}`, resource: r.resource, allowed: r.allowed, simulated: false, incidents: [], evidenceId: state.events.find(e => e.requestId === r.id)?.id ?? r.id });
  for (const e of state.events.toReversed()) if (e.module === "Gateway" && e.requestId) {
    const d = e.details as Record<string, unknown>;
    const prior = requests.get(e.requestId);
    // A replay denial is a new enforcement observation, not permission to show historical output as allowed.
    if (e.kind === "REPLAY_ACCESS_DENIED" && prior) { prior.allowed = false; prior.evidenceId = e.id; }
    else if (!prior && text(d.tool) && text(d.resource)) requests.set(e.requestId, { id: e.requestId, actorId: e.actorId, sessionId: e.sessionId ?? "", verified: e.identityVerified, tool: `${text(d.tool)}:${text(d.operation)}`, resource: text(d.resource), allowed: d.allowed === true, simulated: e.simulated, incidents: e.incidentId ? [e.incidentId] : [], evidenceId: e.id });
  }
  for (const request of requests.values()) {
    const source = actor(request.actorId, request.sessionId, request.verified);
    const knownSession = state.sessions.find(s => s.id === request.sessionId && s.agentId === request.actorId);
    // Never connect a forged claim to the victim's registered session, even if its string ID matches.
    const session = addNode({ kind: "session", id: request.verified && knownSession ? request.sessionId : `observed:${request.id}`, actorId: request.actorId, ...(request.verified ? {} : { sessionId: `claim:${request.sessionId}` }) }, request.sessionId.slice(0, 8) || "No session", request.verified ? `${request.simulated ? "Simulated" : "Local runtime"} · verified binding` : "Claimed session · authentication failed", request.verified ? "verified" : "unverified", request.incidents);
    const tool = addNode({ kind: "tool", id: request.tool, actorId: request.actorId, sessionId: request.verified ? request.sessionId : `claim:${request.sessionId}` }, request.tool, "Observed gateway capability · session scoped", "observed", request.incidents);
    const trap = state.traps.find(t => t.resource === request.resource);
    const resource = addNode({ kind: trap ? "trap" : "resource", id: trap?.id ?? request.resource }, trap?.name ?? request.resource, trap ? "Synthetic decoy · local only" : "Observed requested resource", trap ? "decoy" : "observed", request.incidents);
    link(source, session, "observed session request", request.evidenceId, !request.allowed, request.verified, request.incidents);
    link(session, tool, "invoked", request.evidenceId, !request.allowed, request.verified, request.incidents);
    link(tool, resource, "requested", request.evidenceId, !request.allowed, request.verified, request.incidents);
    link(source, resource, "observed resource request", request.evidenceId, !request.allowed, request.verified, request.incidents, true);
  }
  // Ownership comes from stored memory metadata, not an agent's claim. One node per chain, latest snapshot.
  const chains = new Set<string>();
  for (const memory of state.memories) {
    const chain = JSON.stringify([memory.ownerId, memory.key]);
    if (chains.has(chain)) continue; chains.add(chain);
    const related = incidents.filter(i => i.identityVerified && i.actorId === memory.ownerId && (i.sessionId === memory.sessionId && !!memory.sessionId || i.events.some(e => (e.details as Record<string, unknown>).memoryId === memory.id))).map(i => i.id);
    const target = addNode({ kind: "memory", id: memory.id, actorId: memory.ownerId }, `${memory.key} · v${memory.version}`, `${memory.sourceTrust} source · ${memory.integrity}`, memory.integrity, related);
    link(registered(memory.ownerId), target, "stored memory owner", memory.id, memory.integrity !== "verified", true, related);
  }
  for (const trap of state.traps) addNode({ kind: "trap", id: trap.id }, trap.name, `${trap.category} · ${trap._count.interactions} recorded interactions`, trap.active ? "armed" : "inactive");
  return { nodes: [...nodes.values()], edges: [...edges.values()], compactEdges: [...compactEdges.values(), ...edges.values()].filter(e => nodes.get(e.source)?.entity.kind !== "session" && nodes.get(e.target)?.entity.kind !== "session" && nodes.get(e.source)?.entity.kind !== "tool" && nodes.get(e.target)?.entity.kind !== "tool"), truncated };
}
