import { expect, it } from "vitest";
import { huntGraph, type HuntRelationship } from "../src/lib/hunt-graph";
import { defaultLayout, parsePreferences, workspaceReducer } from "../src/lib/workspace-model";
const edge = (id: string, source: string, target: string, category = "observed", caseId = "one"): HuntRelationship => ({ id, source, target, category, caseId, relation: "recorded-submission", eventId: `e-${id}`, details: {} });
it("graph edges carry original evidence and do not fabricate proximity relationships", () => {
  const links = [edge("1", "agent:a", "agent:b"), edge("2", "agent:b", "source:paper"), edge("3", "agent:c", "resource:secret", "confirmed-violation", "other")]; const graph = huntGraph(links, "one"); expect(graph.edges.map(e => e.eventId)).toEqual(["e-1", "e-2"]); expect(graph.nodes).toHaveLength(3); expect(graph.nodes.every(n => /^n-[a-f0-9]{16}$/.test(n.id))).toBe(true);
});
it("neighborhood and evidence-category selection use only eligible real links", () => {
  const links = [edge("1", "agent:a", "agent:b"), edge("2", "agent:b", "resource:x", "confirmed-violation"), edge("3", "agent:z", "resource:y")]; expect(huntGraph(links, "one", "agent:a").edges.map(e => e.id)).toEqual(["1"]); expect(huntGraph(links, "one", "", "confirmed-violation").edges.map(e => e.id)).toEqual(["2"]); expect(huntGraph(links, "absent").nodes).toEqual([]);
});
it("large graphs stay bounded and expose truncation, instead of shrinking all entities", () => { const graph = huntGraph(Array.from({ length: 200 }, (_, i) => edge(String(i), "agent:a", `resource:${i}`)), "one"); expect(graph.nodes).toHaveLength(44); expect(graph.edges.length).toBeLessThanOrEqual(100); expect(graph.truncated).toBe(true); });
it("valid legacy workspace layouts gain a parked Hunt tool while keeping geometry", () => {
  const bounds = { width: 1400, height: 800 }; const layout = defaultLayout(bounds); const old = { ...layout, windows: layout.windows.filter(w => w.id !== "hunt") }; const restored = parsePreferences(JSON.stringify(old), bounds); expect(restored.windows.find(w => w.id === "hunt")).toMatchObject({ open: false }); expect(restored.windows.find(w => w.id === "network")).toEqual(old.windows.find(w => w.id === "network")); const opened = workspaceReducer(restored, { type: "open", id: "hunt" }); const id = huntGraph([edge("1", "agent:a", "agent:b")], "one").nodes[0].id; const moved = workspaceReducer(opened, { type: "position", id, position: { x: 12, y: 24 } }); expect(parsePreferences(JSON.stringify(moved), bounds).positions[id]).toEqual({ x: 12, y: 24 });
});
