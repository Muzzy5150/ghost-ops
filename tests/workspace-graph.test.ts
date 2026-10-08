import { beforeAll, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { command, snapshot } from "../src/server/service";
import { callRuntime, enrollRuntime } from "../src/server/runtime";
import { nodeKey, recordedGraph } from "../src/lib/workspace-graph";
import type { State } from "../src/lib/view-types";
import { filterEvents } from "../src/components/workspace/event-terminal";

let state: State;
beforeAll(async () => {
  await command({ commandId: randomUUID(), action: "reset" });
  await command({ commandId: randomUUID(), action: "compromise" });
  const credential = "c".repeat(64);
  const ids = await enrollRuntime({ commandId: randomUUID(), actorId: "live-graph", credential }) as { actorId: string; sessionId: string };
  await callRuntime(ids.actorId, ids.sessionId, credential, "read_document", { requestId: randomUUID(), resource: "docs/research" });
  await callRuntime(ids.actorId, ids.sessionId, "d".repeat(64), "read_document", { requestId: randomUUID(), resource: "decoy/credentials" });
  state = JSON.parse(JSON.stringify(await snapshot())) as State;
});
describe("evidence-backed network projection", () => {
  it("separates spoofed identity and claimed session from registered runtime history", () => {
    const graph = recordedGraph(state);
    const agent = graph.nodes.find(n => n.entity.kind === "agent" && n.entity.id === "live-graph")!;
    const claim = graph.nodes.find(n => n.entity.kind === "claim" && n.entity.id === "live-graph")!;
    expect(agent.id).not.toBe(claim.id);
    const registeredSession = graph.nodes.find(n => n.entity.kind === "session" && n.entity.id === state.sessions.find(s => s.agentId === "live-graph")!.id)!;
    expect(graph.edges.some(e => e.source === claim.id && e.target === registeredSession.id)).toBe(false);
    expect(graph.edges.filter(e => e.source === claim.id).every(e => !e.verified)).toBe(true);
  });
  it("makes denied and authorized requests distinguishable with persisted references", () => {
    const graph = recordedGraph(state);
    expect(graph.edges.some(e => e.blocked)).toBe(true); expect(graph.edges.some(e => !e.blocked && e.label === "invoked")).toBe(true);
    expect(graph.edges.every(e => e.evidenceIds.length && graph.nodes.some(n => n.id === e.source) && graph.nodes.some(n => n.id === e.target))).toBe(true);
  });
  it("does not invent tool usage from permission grants", () => {
    const empty = { ...state, events: [], incidents: [], runtimeRequests: [], interactions: [] };
    expect(recordedGraph(empty).nodes.filter(n => n.entity.kind === "tool")).toEqual([]);
  });
  it("compact request projection retains actual actor/resource evidence, not inferred paths", () => {
    const graph = recordedGraph(state);
    const requests = graph.compactEdges.filter(e => e.label === "observed resource request");
    expect(requests.length).toBeGreaterThan(0);
    for (const edge of requests) {
      const source = graph.nodes.find(n => n.id === edge.source)!, target = graph.nodes.find(n => n.id === edge.target)!;
      expect(["agent", "claim"]).toContain(source.entity.kind); expect(["resource", "trap"]).toContain(target.entity.kind);
      const evidence = state.events.find(e => e.id === edge.evidenceIds[0]) ?? state.incidents.flatMap(i => i.events).find(e => e.id === edge.evidenceIds[0]);
      expect(evidence).toBeTruthy(); expect(evidence!.actorId).toBe(source.entity.id);
    }
  });
  it("links memory ownership and signed provenance without inventing session access", () => {
    const graph = recordedGraph(state);
    const memories = graph.nodes.filter(n => n.entity.kind === "memory");
    expect(memories.length).toBeGreaterThan(0);
    for (const memory of memories) {
      const ownerLink = graph.edges.find(e => e.target === memory.id && e.label === "stored memory owner")!;
      expect(graph.nodes.find(n => n.id === ownerLink.source)!.entity.id).toBe(memory.entity.actorId);
    }
  });
  it("focus highlights only recorded incident associations", () => {
    const incident = state.incidents.find(i => i.actorId === "research" && i.identityVerified)!;
    const graph = recordedGraph(state, incident.id);
    expect(graph.nodes.find(n => n.entity.kind === "incident" && n.entity.id === incident.id)!.incidentIds).toContain(incident.id);
    expect(graph.nodes.find(n => n.entity.kind === "agent" && n.entity.id === "live-graph")!.incidentIds).not.toContain(incident.id);
    expect(graph.edges.filter(e => e.incidentIds.includes(incident.id)).every(e => e.evidenceIds.length)).toBe(true);
  });
  it("keeps graph positions stable and preference identifiers opaque", () => {
    expect(recordedGraph(state)).toEqual(recordedGraph(state));
    expect(nodeKey("synthetic/resource/secret-content")).toMatch(/^n-[a-f0-9]{16}$/);
    expect(nodeKey("a")).not.toEqual(nodeKey("b"));
  });
  it("bounds large record projections and exposes truncation", () => {
    const many = { ...state, incidents: Array.from({ length: 220 }, (_, index) => ({ ...state.incidents[0], id: `oversized-${index}` })) };
    const graph = recordedGraph(many);
    expect(graph.nodes.length).toBeLessThanOrEqual(160); expect(graph.edges.length).toBeLessThanOrEqual(280); expect(graph.truncated).toBe(true);
  });
  it("filters and chronologically orders actual terminal events without mixing provenance", () => {
    const filtered = filterEvents(state.events, { query: "live-graph", engine: "Gateway", severity: "all", actor: "all", origin: "runtime" });
    expect(filtered.length).toBeGreaterThan(0); expect(filtered.every(e => !e.simulated && e.module === "Gateway")).toBe(true);
    expect(filtered.map(e => e.ordinal)).toEqual(filtered.map(e => e.ordinal).toSorted((a, b) => a - b));
    expect(filterEvents(state.events, { query: "no-match-432", engine: "all", severity: "all", actor: "all", origin: "all" })).toEqual([]);
  });
});
