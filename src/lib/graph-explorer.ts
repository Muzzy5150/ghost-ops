import { graphlib, layout } from "@dagrejs/dagre";
import type { Entity, GraphNode, GraphLink, RecordedGraph } from "./workspace-graph";
import type { State } from "./view-types";

export const nodeSize = { width: 304, height: 218 };
export type GraphFilters = { mode: "operations" | "all" | "agents" | "deception"; agent: string; origin: string; severity: string; query: string; expanded: boolean };
export type NodeFacts = { origin: string; subtitle: string; facts: { label: string; value: string }[]; footer: string; lastOrdinal: number };
export function nodeFacts(node: GraphNode, state: State, graph: RecordedGraph): NodeFacts {
  const e = node.entity;
  const evidence = new Set([...graph.edges, ...graph.compactEdges, ...graph.toolEdges].filter(link => link.source === node.id || link.target === node.id).flatMap(link => link.evidenceIds));
  const events = [...state.events, ...state.incidents.flatMap(i => i.events)].filter(event => evidence.has(event.id));
  const latest = events.toSorted((a, b) => b.ordinal - a.ordinal)[0];
  const origins = new Set(events.map(event => event.simulated ? "Simulated" : "Local runtime"));
  let origin = origins.size > 1 ? "Mixed records" : [...origins][0] ?? "Stored record";
  const agent = e.kind === "agent" ? state.agents.find(a => a.id === e.id) : undefined;
  if (agent) {
    origin = agent.simulated ? "Simulated" : "Local runtime";
    const own = state.events.find(event => event.actorId === agent.id && event.identityVerified && event.simulated === agent.simulated);
    const sessions = state.sessions.filter(s => s.agentId === agent.id && s.active);
    const incidents = state.incidents.filter(i => i.actorId === agent.id && i.identityVerified && i.simulated === agent.simulated);
    return { origin, subtitle: agent.role, facts: [{ label: "Identity", value: "Registered / credential-bound" }, { label: "Security", value: agent.status }, { label: "Activity", value: own?.kind.replaceAll("_", " ") ?? "No verified observations" }], footer: `${sessions.length} active sessions · ${incidents.length} linked cases`, lastOrdinal: own?.ordinal ?? 0 };
  }
  if (e.kind === "claim") return { origin, subtitle: "Unverified actor / not registry history", facts: [{ label: "Identity", value: "Authentication not verified" }, { label: "Authority", value: "No inferred permissions" }, { label: "Session", value: e.sessionId?.slice(0, 12) ?? "Not recorded" }], footer: "A claim does not identify a compromised agent", lastOrdinal: latest?.ordinal ?? 0 };
  if (e.kind === "memory") {
    const m = state.memories.find(m => m.id === e.id);
    return { origin: "Signed store", subtitle: m?.ownerId ?? "Stored memory", facts: [{ label: "Integrity", value: m?.integrity ?? "Not available" }, { label: "Source", value: m?.sourceTrust ?? "Not recorded" }, { label: "Boundary", value: m?.protected ? "Protected policy" : "Agent-owned notes" }], footer: m?.restoredFromId ? "Verified historical restoration appended" : `Version ${m?.version ?? "—"} · signed provenance`, lastOrdinal: latest?.ordinal ?? 0 };
  }
  if (e.kind === "incident") {
    const i = state.incidents.find(i => i.id === e.id);
    return { origin: i?.simulated ? "Simulated" : "Local runtime", subtitle: i?.title ?? node.detail, facts: [{ label: "Severity", value: i?.severity ?? node.status }, { label: "Actor", value: i?.actorId ?? "Not recorded" }, { label: "Response", value: i?.status ?? "Not recorded" }], footer: `${i?.evidence.length ?? 0} evidence refs · ${i?.events.length ?? 0} timeline events`, lastOrdinal: i?.events.at(-1)?.ordinal ?? 0 };
  }
  if (e.kind === "trap") {
    const trap = state.traps.find(t => t.id === e.id);
    return { origin: "Synthetic decoy", subtitle: trap?.category ?? "Isolated deception resource", facts: [{ label: "Resource", value: trap?.resource ?? "Not recorded" }, { label: "State", value: trap?.active ? "Armed / local only" : "Inactive" }, { label: "Attempts", value: String(trap?._count.interactions ?? 0) }], footer: "Interest is evidence, not proof of intent", lastOrdinal: latest?.ordinal ?? 0 };
  }
  const links = graph.edges.filter(link => link.source === node.id && link.label === "requested");
  return { origin, subtitle: e.kind === "tool" ? "Session-scoped gateway capability" : node.detail, facts: [{ label: "Context", value: e.actorId ?? (e.kind === "session" ? "Stored session" : "Observed resource") }, { label: "Recorded", value: `${links.reduce((n, link) => n + link.count, 0)} resource requests` }, { label: "Denied", value: String(links.filter(link => link.blocked).reduce((n, link) => n + link.count, 0)) }], footer: latest?.kind.replaceAll("_", " ") ?? "No matching recent event", lastOrdinal: latest?.ordinal ?? 0 };
}

export function exploreGraph(graph: RecordedGraph, state: State, filters: GraphFilters, incidentId?: string) {
  const facts = new Map(graph.nodes.map(n => [n.id, nodeFacts(n, state, graph)]));
  const baseEdges = filters.mode === "all" ? graph.edges : filters.mode === "operations" ? graph.toolEdges : graph.compactEdges;
  const eligible = graph.nodes.filter(n => filters.mode === "all" || filters.mode === "operations" ? filters.mode === "all" || n.entity.kind !== "session" : filters.mode === "agents" ? ["agent", "claim", "incident"].includes(n.entity.kind) : ["agent", "claim", "trap", "incident"].includes(n.entity.kind));
  const roots = eligible.filter(n => ["agent", "claim"].includes(n.entity.kind));
  const preferred = roots.filter(n => !incidentId || n.incidentIds.includes(incidentId)).toSorted((a, b) => (!incidentId ? Number(b.entity.kind === "agent") - Number(a.entity.kind === "agent") : 0) || (facts.get(b.id)?.lastOrdinal ?? 0) - (facts.get(a.id)?.lastOrdinal ?? 0))[0] ?? roots[0];
  const anchor = roots.find(n => n.id === filters.agent) ?? preferred;
  const selected = new Set<string>(anchor ? [anchor.id] : []);
  // Bounded, explicit exploration. Only follow recorded graph edges, not temporal proximity.
  for (let depth = 0; depth < (filters.mode === "all" ? 3 : 2); depth++) {
    const next = baseEdges.filter(e => selected.has(e.source) && (!incidentId || e.incidentIds.includes(incidentId))).toSorted((a, b) => Number(b.blocked) - Number(a.blocked));
    for (const e of next) if (filters.expanded || selected.size < 9) selected.add(e.target);
  }
  const rootIds = new Set(roots.slice(0, 6).map(n => n.id));
  const nodes = eligible.filter(n => (filters.expanded || selected.has(n.id) || rootIds.has(n.id) && !filters.agent && !incidentId) && (filters.origin === "all" || facts.get(n.id)?.origin === filters.origin) && (filters.severity === "all" || n.entity.kind === "incident" && n.status === filters.severity || baseEdges.some(e => (e.source === n.id || e.target === n.id) && e.incidentIds.some(id => state.incidents.some(i => i.id === id && i.severity === filters.severity)))) && (!filters.query || `${n.label} ${n.detail} ${n.entity.id}`.toLowerCase().includes(filters.query.toLowerCase())));
  const ids = new Set(nodes.map(n => n.id));
  return { nodes, edges: baseEdges.filter(e => ids.has(e.source) && ids.has(e.target)), anchorId: anchor?.id, facts, hidden: eligible.length - nodes.length };
}
export function topologyKey(nodes: GraphNode[], edges: GraphLink[]) { return JSON.stringify([nodes.map(n => n.id).toSorted(), edges.map(e => `${e.source}/${e.target}`).toSorted()]); }
export function automaticLayout(nodes: GraphNode[], edges: GraphLink[]): Record<string, { x: number; y: number }> {
  const graph = new graphlib.Graph({ multigraph: true });
  graph.setGraph({ rankdir: "LR", nodesep: 54, ranksep: 100, marginx: 40, marginy: 40 }); graph.setDefaultEdgeLabel(() => ({}));
  nodes.toSorted((a, b) => a.id.localeCompare(b.id)).forEach(n => graph.setNode(n.id, { ...nodeSize }));
  edges.toSorted((a, b) => a.id.localeCompare(b.id)).forEach(e => graph.setEdge(e.source, e.target, {}, e.id));
  layout(graph);
  return Object.fromEntries(nodes.map(n => { const p = graph.node(n.id); return [n.id, { x: p.x - nodeSize.width / 2, y: p.y - nodeSize.height / 2 }]; }));
}
export function extendLayout(nodes: GraphNode[], previous: Record<string, { x: number; y: number }>) {
  const result = Object.fromEntries(Object.entries(previous).slice(-200)), occupied = Object.values(result);
  let bottom = Math.max(40, ...occupied.map(p => p.y + nodeSize.height + 54));
  for (const n of nodes) if (!result[n.id]) { result[n.id] = { x: 40, y: bottom }; bottom += nodeSize.height + 54; }
  return result;
}
export function evidenceHighlights(graph: RecordedGraph, eventId?: string, state?: State) {
  const edgeIds = new Set<string>(), nodeIds = new Set<string>();
  const ids = new Set(eventId ? [eventId] : []);
  const events = state ? [...state.events, ...state.incidents.flatMap(i => i.events)] : [];
  const event = events.find(e => e.id === eventId);
  if (event?.requestId) events.filter(e => e.requestId === event.requestId && e.actorId === event.actorId && e.sessionId === event.sessionId && e.identityVerified === event.identityVerified && e.simulated === event.simulated).forEach(e => ids.add(e.id));
  if (eventId) for (const edge of [...graph.edges, ...graph.compactEdges, ...graph.toolEdges]) if (edge.evidenceIds.some(id => ids.has(id))) { edgeIds.add(edge.id); nodeIds.add(edge.source); nodeIds.add(edge.target); }
  return { edgeIds, nodeIds };
}
export function relationshipTarget(graph: RecordedGraph, state: State, link: GraphLink): Entity {
  const ref = link.evidenceIds[0];
  if (state.memories.some(m => m.id === ref)) return { kind: "memory", id: ref };
  if (state.incidents.some(i => i.id === ref)) return { kind: "incident", id: ref };
  const session = state.sessions.find(s => s.id === ref);
  if (session) return graph.nodes.find(n => n.entity.kind === "session" && n.entity.id === session.id && n.entity.actorId === session.agentId)?.entity ?? { kind: "session", id: session.id, actorId: session.agentId };
  return { kind: "resource", id: `evidence:${ref}` };
}
