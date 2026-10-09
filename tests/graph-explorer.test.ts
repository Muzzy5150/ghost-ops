import { beforeAll, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { command, snapshot } from "../src/server/service";
import { callRuntime, enrollRuntime } from "../src/server/runtime";
import { recordedGraph } from "../src/lib/workspace-graph";
import { automaticLayout, evidenceHighlights, exploreGraph, extendLayout, nodeFacts, nodeSize, relationshipTarget, topologyKey, type GraphFilters } from "../src/lib/graph-explorer";
import { memoryDiff } from "../src/lib/memory-diff";
import type { State } from "../src/lib/view-types";

let state: State;
const filters: GraphFilters = { mode: "operations", agent: "", origin: "all", severity: "all", query: "", expanded: false };
beforeAll(async () => {
  await command({ commandId: randomUUID(), action: "reset" });
  await command({ commandId: randomUUID(), action: "compromise" });
  const credential = "e".repeat(64);
  const ids = await enrollRuntime({ commandId: randomUUID(), actorId: "live-explorer", credential }) as { actorId: string; sessionId: string };
  await callRuntime(ids.actorId, ids.sessionId, credential, "read_document", { requestId: randomUUID(), resource: "docs/research" });
  await callRuntime(ids.actorId, ids.sessionId, "f".repeat(64), "read_document", { requestId: randomUUID(), resource: "decoy/credentials" });
  state = JSON.parse(JSON.stringify(await snapshot())) as State;
});
describe("readable evidence-backed exploration", () => {
  it("uses larger nodes and a bounded default neighborhood rather than fit-all", () => {
    const graph = recordedGraph(state), view = exploreGraph(graph, state, filters);
    expect(nodeSize).toEqual({ width: 304, height: 218 });
    expect(view.nodes.length).toBeLessThanOrEqual(15);
    expect(view.nodes.some(n => n.entity.kind === "tool")).toBe(true);
    expect(view.hidden).toBeGreaterThan(0);
    expect(view.nodes.find(n => n.id === view.anchorId)!.entity.kind).toBe("agent");
  });
  it("connects agents to actually requested tools without trusting identity claims", () => {
    const graph = recordedGraph(state);
    const claim = graph.nodes.find(n => n.entity.kind === "claim" && n.entity.id === "live-explorer")!;
    const links = graph.toolEdges.filter(e => e.source === claim.id);
    expect(links.length).toBeGreaterThan(0); expect(links.every(e => !e.verified)).toBe(true);
    expect(links.filter(e => e.label === "tool request").every(e => e.blocked)).toBe(true);
    expect(links.filter(e => e.label === "tool request").every(e => graph.nodes.find(n => n.id === e.target)!.entity.sessionId!.startsWith("claim:"))).toBe(true);
  });
  it("automatically lays out deterministically without overlapping node rectangles", () => {
    const view = exploreGraph(recordedGraph(state), state, filters);
    const positions = automaticLayout(view.nodes, view.edges);
    expect(automaticLayout(view.nodes.toReversed(), view.edges.toReversed())).toEqual(positions);
    const rects = Object.values(positions);
    for (let i = 0; i < rects.length; i++) for (let j = i + 1; j < rects.length; j++) {
      const a = rects[i], b = rects[j];
      expect(Math.abs(a.x - b.x) >= nodeSize.width || Math.abs(a.y - b.y) >= nodeSize.height).toBe(true);
    }
  });
  it("keeps existing coordinates stable when persisted metadata changes or nodes arrive", () => {
    const graph = recordedGraph(state), view = exploreGraph(graph, state, filters);
    const initial = automaticLayout(view.nodes, view.edges);
    const next = extendLayout(graph.nodes, initial);
    for (const [id, position] of Object.entries(initial)) expect(next[id]).toEqual(position);
    expect(topologyKey(view.nodes.map(n => ({ ...n, status: "updated" })), view.edges.map(e => ({ ...e, count: 99 })))).toBe(topologyKey(view.nodes, view.edges));
  });
  it("expands explicit groups and filters by recorded provenance, agent and severity", () => {
    const graph = recordedGraph(state), runtime = graph.nodes.find(n => n.entity.kind === "agent" && n.entity.id === "live-explorer")!;
    const expanded = exploreGraph(graph, state, { ...filters, expanded: true });
    expect(expanded.nodes.length).toBeGreaterThan(exploreGraph(graph, state, filters).nodes.length);
    const local = exploreGraph(graph, state, { ...filters, expanded: true, origin: "Local runtime" });
    expect(local.nodes.length).toBeGreaterThan(0); expect(local.nodes.every(n => nodeFacts(n, state, graph).origin === "Local runtime")).toBe(true);
    const focused = exploreGraph(graph, state, { ...filters, agent: runtime.id });
    expect(focused.nodes.filter(n => n.entity.kind === "agent").map(n => n.id)).toEqual([runtime.id]);
    const critical = exploreGraph(graph, state, { ...filters, expanded: true, severity: "critical" });
    expect(critical.nodes.length).toBeGreaterThan(0);
    expect(critical.edges.every(e => critical.nodes.some(n => n.id === e.source) && critical.nodes.some(n => n.id === e.target))).toBe(true);
  });
  it("focuses actual case associations and preserves unknown versus registered identities", () => {
    const incident = state.incidents.find(i => i.actorId === "research" && i.identityVerified)!;
    const graph = recordedGraph(state, incident.id), view = exploreGraph(graph, state, filters, incident.id);
    expect(view.nodes.find(n => n.id === view.anchorId)!.entity.id).toBe("research");
    expect(view.edges.every(e => e.incidentIds.includes(incident.id))).toBe(true);
    const claim = graph.nodes.find(n => n.entity.kind === "claim")!;
    expect(nodeFacts(claim, state, graph).facts.find(f => f.label === "Authority")!.value).toBe("No inferred permissions");
  });
  it("links timeline evidence through exact request IDs, not temporal proximity", () => {
    const graph = recordedGraph(state), event = state.events.find(e => e.module === "Gateway" && e.requestId)!;
    const selected = evidenceHighlights(graph, event.id, state);
    expect(selected.edgeIds.size).toBeGreaterThan(0); expect(selected.nodeIds.size).toBeGreaterThan(0);
    expect(evidenceHighlights(graph, "missing-event", state).nodeIds.size).toBe(0);
    expect([...graph.edges, ...graph.toolEdges].filter(e => selected.edgeIds.has(e.id)).every(e => e.evidenceIds.some(id => state.events.some(v => v.id === id && v.requestId === event.requestId) || state.incidents.some(i => i.events.some(v => v.id === id && v.requestId === event.requestId))))).toBe(true);
  });
  it("does not claim model inference from local tool executions", () => {
    const graph = recordedGraph(state), agent = graph.nodes.find(n => n.entity.kind === "agent" && n.entity.id === "live-explorer")!;
    const facts = nodeFacts(agent, state, graph);
    expect(facts.origin).toBe("Local runtime"); expect(JSON.stringify(facts).toLowerCase()).not.toContain("model-driven");
  });
  it("opens ownership and case edges as their stored entities, not nonexistent event IDs", () => {
    const graph = recordedGraph(state);
    const memory = graph.edges.find(e => e.label === "stored memory owner")!;
    const incident = graph.edges.find(e => e.label === "investigation attribution")!;
    const session = graph.edges.find(e => e.label === "registered session")!;
    expect(relationshipTarget(graph, state, memory)).toEqual({ kind: "memory", id: memory.evidenceIds[0] });
    expect(relationshipTarget(graph, state, incident)).toEqual({ kind: "incident", id: incident.evidenceIds[0] });
    expect(relationshipTarget(graph, state, session).kind).toBe("session");
  });
});
describe("forensic text diff", () => {
  it("preserves ordering and repeated content rather than set-membership comparisons", () => {
    expect(memoryDiff("A\nB\nA", "A\nA")).toEqual([{ text: "A", kind: "unchanged" }, { text: "B", kind: "removed" }, { text: "A", kind: "unchanged" }]);
  });
  it("handles new snapshots, unchanged policies and malicious-looking text as data", () => {
    expect(memoryDiff("", "<script>data</script>")).toEqual([{ text: "<script>data</script>", kind: "added" }]);
    expect(memoryDiff("Policy.", "Policy.")[0].kind).toBe("unchanged");
    expect(memoryDiff("Old.", "New.").map(l => l.kind)).toEqual(["removed", "added"]);
  });
});
