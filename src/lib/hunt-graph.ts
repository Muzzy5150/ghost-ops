import { nodeKey } from "./workspace-graph";
export type HuntRelationship = { id: string; caseId: string; source: string; target: string; relation: string; category: string; eventId: string; details: unknown };
/** No timestamp proximity links: every edge carries the persisted evidence ID. */
export function huntGraph(links: HuntRelationship[], caseId: string, focus = "", category = "all") {
  const eligible = links.filter(l => l.caseId === caseId && (category === "all" || l.category === category));
  const adjacent = new Set(focus ? eligible.filter(l => l.source === focus || l.target === focus).flatMap(l => [l.source, l.target]) : []);
  const selected = eligible.filter(l => !focus || adjacent.has(l.source) && adjacent.has(l.target));
  const nodes = [...new Set(selected.flatMap(l => [l.source, l.target]))].slice(0, 44);
  const allowed = new Set(nodes);
  const edges = selected.filter(l => allowed.has(l.source) && allowed.has(l.target)).slice(0, 100);
  return { nodes: nodes.map(entity => ({ id: nodeKey(`hunt:${entity}`), entity, kind: entity.split(":")[0], label: entity.slice(entity.indexOf(":") + 1) })), edges: edges.map(l => ({ ...l, source: nodeKey(`hunt:${l.source}`), target: nodeKey(`hunt:${l.target}`) })), truncated: nodes.length < new Set(selected.flatMap(l => [l.source, l.target])).size || edges.length < selected.length };
}
