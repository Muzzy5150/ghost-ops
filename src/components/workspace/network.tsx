"use client";

import { memo, useCallback, useEffect, useEffectEvent, useMemo, useRef, useState, type Dispatch } from "react";
import { ReactFlow, ReactFlowProvider, Background, Controls, useReactFlow, MarkerType, type Edge, type NodeChange } from "@xyflow/react";
import { Network, Crosshair, RotateCcw, LocateFixed, Search, ChevronDown, ChevronUp } from "lucide-react";
import { recordedGraph, type Entity } from "@/lib/workspace-graph";
import { automaticLayout, evidenceHighlights, exploreGraph, extendLayout, topologyKey, nodeSize, relationshipTarget, type GraphFilters } from "@/lib/graph-explorer";
import type { State } from "@/lib/view-types";
import type { Preferences, WorkspaceAction } from "@/lib/workspace-model";
import { SecurityNodeView, type SecurityNode } from "./security-node";

const nodeTypes = { security: SecurityNodeView };
type Props = { state: State; layout: Preferences; dispatch: Dispatch<WorkspaceAction>; incidentId?: string; eventId?: string; select: (entity: Entity) => void };
function NetworkCanvas({ state, layout, dispatch, incidentId, eventId, select }: Props) {
  const graph = useMemo(() => recordedGraph(state, incidentId), [state, incidentId]);
  const [filters, setFilters] = useState<GraphFilters>({ mode: "operations", agent: "", origin: "all", severity: "all", query: "", expanded: false });
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<string>();
  const [draft, setDraft] = useState<Record<string, { x: number; y: number }>>({});
  const highlight = useMemo(() => evidenceHighlights(graph, eventId, state), [graph, eventId, state]);
  const view = useMemo(() => {
    const result = exploreGraph(graph, state, filters, incidentId);
    if (eventId && highlight.nodeIds.size) {
      const ids = new Set(result.nodes.map(n => n.id));
      graph.nodes.filter(n => highlight.nodeIds.has(n.id) && (filters.mode === "all" || n.entity.kind !== "session")).forEach(n => ids.add(n.id));
      result.nodes = graph.nodes.filter(n => ids.has(n.id));
      result.edges = (filters.mode === "all" ? graph.edges : graph.toolEdges).filter(e => ids.has(e.source) && ids.has(e.target));
    }
    return result;
  }, [graph, state, filters, incidentId, highlight, eventId]);
  const key = topologyKey(view.nodes, view.edges);
  const scope = JSON.stringify([filters, incidentId, eventId]);
  const [automatic, setAutomatic] = useState(() => ({ key, scope, positions: automaticLayout(view.nodes, view.edges) }));
  // Polling updates evidence, not the arrangement. New entities append until explicitly arranged.
  if (automatic.key !== key || automatic.scope !== scope) setAutomatic({ key, scope, positions: automatic.scope !== scope ? automaticLayout(view.nodes, view.edges) : extendLayout(view.nodes, automatic.positions) });
  const flow = useReactFlow<SecurityNode>();
  const surface = useRef<HTMLDivElement>(null), dragUntil = useRef(0), previousOrdinals = useRef(new Map<string, number>());
  const nodes = useMemo<SecurityNode[]>(() => view.nodes.map(n => ({
    id: n.id, type: "security", width: nodeSize.width, height: nodeSize.height,
    data: { record: n, facts: view.facts.get(n.id)!, evidence: highlight.nodeIds.has(n.id), dimmed: !!eventId && highlight.nodeIds.size > 0 && !highlight.nodeIds.has(n.id) || !!incidentId && !n.incidentIds.includes(incidentId) },
    position: draft[n.id] ?? layout.positions[n.id] ?? automatic.positions[n.id] ?? { x: 40, y: 40 },
    selected: selected === n.id, ariaLabel: `${n.entity.kind}: ${n.label}. ${n.detail}. ${n.status}`, deletable: false
  })), [view, highlight, eventId, incidentId, draft, layout.positions, automatic.positions, selected]);
  const edges = useMemo<Edge[]>(() => view.edges.map(e => {
    const focused = highlight.edgeIds.has(e.id);
    const color = e.blocked ? "#d68178" : e.verified ? "#718f99" : "#c2a16f";
    return {
      id: e.id, source: e.source, target: e.target, label: focused || selected === e.source || selected === e.target ? `${e.label}${e.count > 1 ? ` ×${e.count}` : ""}` : undefined,
      type: "default", markerEnd: { type: MarkerType.ArrowClosed, color, width: 18, height: 18 },
      style: { stroke: color, strokeWidth: focused ? 3.5 : 2, strokeDasharray: e.verified ? undefined : "6 5", opacity: eventId && highlight.edgeIds.size && !focused ? .18 : incidentId && !e.incidentIds.includes(incidentId) ? .16 : .8 },
      labelStyle: { fill: "#d4dce0", fontSize: 13 }, labelBgStyle: { fill: "#151c21", fillOpacity: 1 }, deletable: false,
      ariaLabel: `${e.label}: ${e.blocked ? "blocked" : "recorded"}; ${e.verified ? "verified binding" : "unverified claim"}`
    };
  }), [view.edges, highlight, eventId, incidentId, selected]);
  const onNodesChange = useCallback((changes: NodeChange<SecurityNode>[]) => {
    for (const change of changes) {
      if (change.type === "position" && change.position && change.dragging) setDraft(previous => ({ ...previous, [change.id]: change.position! }));
      else if (change.type === "position" && change.position) dispatch({ type: "position", id: change.id, position: change.position });
      if (change.type === "select" && change.selected) setSelected(change.id);
    }
  }, [dispatch]);
  const focusNodes = (ids: string[]) => {
    const targets = nodes.filter(n => ids.includes(n.id));
    if (targets.length) void flow.fitView({ nodes: targets, padding: .2, minZoom: .75, maxZoom: 1, duration: layout.animations ? 220 : 0 });
  };
  const focusNode = (id: string) => {
    const n = nodes.find(n => n.id === id);
    if (n) void flow.setCenter(n.position.x + nodeSize.width / 2, n.position.y + nodeSize.height / 2, { zoom: 1, duration: layout.animations ? 220 : 0 });
  };
  const reset = () => { dispatch({ type: "reset-nodes" }); setDraft({}); setAutomatic({ key, scope, positions: automaticLayout(view.nodes, view.edges) }); requestAnimationFrame(() => { const current = flow.getNodes(); const anchor = current.find(n => n.id === (selected ?? view.anchorId)) ?? current[0]; if (anchor) void flow.setCenter(anchor.position.x + nodeSize.width / 2, anchor.position.y + nodeSize.height / 2, { zoom: 1 }); }); };
  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];
    const changed: HTMLElement[] = [];
    for (const node of nodes) {
      const ordinal = node.data.facts.lastOrdinal, previous = previousOrdinals.current.get(node.id);
      if (layout.animations && previous !== undefined && ordinal > previous) {
        const element = surface.current?.querySelector<HTMLElement>(`[data-node-id="${node.id}"]`);
        element?.classList.add("observed-change");
        if (element) changed.push(element);
        timers.push(setTimeout(() => element?.classList.remove("observed-change"), 1600));
      }
      previousOrdinals.current.set(node.id, ordinal);
    }
    if (previousOrdinals.current.size > 400) previousOrdinals.current = new Map([...previousOrdinals.current].slice(-200));
    return () => { timers.forEach(clearTimeout); changed.forEach(element => element.classList.remove("observed-change")); };
  }, [nodes, layout.animations]);
  // First-load focus is one readable actor, never fit-all at a tiny zoom.
  const initialFocus = useRef(false);
  const centerContext = useEffectEvent(() => {
    const ids = filters.query && selected ? [selected] : eventId && highlight.nodeIds.size ? [...highlight.nodeIds] : filters.agent ? [filters.agent, ...view.edges.filter(e => e.source === filters.agent).map(e => e.target).slice(0, 2)] : view.anchorId ? [view.anchorId, ...view.edges.filter(e => e.source === view.anchorId).map(e => e.target).slice(0, 2)] : [];
    focusNodes(ids);
  });
  useEffect(() => { const frame = requestAnimationFrame(() => centerContext()); return () => cancelAnimationFrame(frame); }, [incidentId, eventId, filters.agent, filters.query, filters.mode]);
  const enterSearch = () => {
    const match = graph.nodes.find(n => `${n.label} ${n.entity.id}`.toLowerCase().includes(search.toLowerCase()));
    if (match) { setSelected(match.id); if (nodes.some(n => n.id === match.id)) focusNode(match.id); else setFilters(f => ({ ...f, expanded: true, agent: "", origin: "all", severity: "all", mode: "all", query: search })); }
    else { setFilters(f => ({ ...f, expanded: true, query: search })); }
  };
  return <div className="network-tool">
    <div className="network-commandbar"><Network size={18} /><select aria-label="Network entity filter" value={filters.mode} onChange={e => setFilters(f => ({ ...f, mode: e.target.value as GraphFilters["mode"] }))}><option value="operations">Tool network</option><option value="all">Session detail</option><option value="agents">Identities & cases</option><option value="deception">Deception resources</option></select>
      <div className="network-search"><Search size={15} /><input aria-label="Find network entity" placeholder="Search and focus…" value={search} onChange={e => { setSearch(e.target.value); if (filters.query) setFilters(f => ({ ...f, query: "" })); }} onKeyDown={e => { if (e.key === "Enter") enterSearch(); }} /><button aria-label="Focus search result" onClick={enterSearch}><LocateFixed size={17} /></button></div>
      <button title="Center selected node" aria-label="Center selected node" onClick={() => focusNode(selected ?? view.anchorId ?? nodes[0]?.id)}><LocateFixed size={17} /></button><button title="Fit visible network at readable zoom" aria-label="Fit network" onClick={() => focusNodes(nodes.map(n => n.id))}><Crosshair size={17} /></button><button title="Automatically arrange visible nodes" aria-label="Reset network positions" onClick={reset}><RotateCcw size={17} /></button>
    </div>
    <div className="network-filters"><select aria-label="Network agent filter" value={filters.agent} onChange={e => setFilters(f => ({ ...f, agent: e.target.value, query: "" }))}><option value="">Relevant agent neighborhood</option>{graph.nodes.filter(n => ["agent", "claim"].includes(n.entity.kind)).map(n => <option key={n.id} value={n.id}>{n.label}{n.entity.kind === "claim" ? " (claim)" : ""}</option>)}</select>
      <select aria-label="Network provenance filter" value={filters.origin} onChange={e => setFilters(f => ({ ...f, origin: e.target.value }))}>{["all", "Local runtime", "Simulated", "Synthetic decoy", "Signed store", "Mixed records"].map(o => <option key={o} value={o}>{o === "all" ? "All origins" : o}</option>)}</select>
      <select aria-label="Network severity filter" value={filters.severity} onChange={e => setFilters(f => ({ ...f, severity: e.target.value }))}>{["all", "critical", "high", "medium", "low"].map(s => <option key={s} value={s}>{s === "all" ? "All severities" : s}</option>)}</select>
      <button onClick={() => setFilters(f => ({ ...f, expanded: !f.expanded, query: "" }))}>{filters.expanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}{filters.expanded ? "Collapse detail" : `Expand ${view.hidden} records`}</button>
      {selected && <button onClick={() => focusNodes([selected, ...view.edges.filter(e => e.source === selected || e.target === selected).flatMap(e => [e.source, e.target])])}>Fit selection</button>}
    </div>
    {incidentId && <div className="network-focus">INC-{incidentId.slice(0, 8)} · recorded case relationships{eventId ? " / evidence selection" : ""}</div>}
    <div className="flow-surface" ref={surface}><ReactFlow<SecurityNode> nodes={nodes} edges={edges} nodeTypes={nodeTypes} onInit={() => { if (!initialFocus.current) { initialFocus.current = true; requestAnimationFrame(() => focusNodes([view.anchorId ?? nodes[0]?.id, ...view.edges.filter(e => e.source === view.anchorId).map(e => e.target).slice(0, 2)])); } }} onNodesChange={onNodesChange} onNodeClick={(_, node) => { if (Date.now() < dragUntil.current) return; setSelected(node.id); select(node.data.record.entity); }} onNodeDragStart={() => { dragUntil.current = Infinity; }} onNodeDragStop={(_, node) => { dragUntil.current = Date.now() + 250; dispatch({ type: "position", id: node.id, position: node.position }); setDraft(previous => { const next = { ...previous }; delete next[node.id]; return next; }); }} onEdgeClick={(_, edge) => { const record = view.edges.find(e => e.id === edge.id); if (record) select(relationshipTarget(graph, state, record)); }} defaultViewport={{ x: 40, y: 40, zoom: 1 }} minZoom={.5} maxZoom={1.8} nodesConnectable={false} edgesReconnectable={false} deleteKeyCode={null} colorMode="dark" onlyRenderVisibleElements><Background gap={28} size={1} color="#35414a" /><Controls showInteractive={false} onFitView={() => focusNodes(nodes.map(n => n.id))} /></ReactFlow>{!nodes.length && <div className="network-empty">No records match these filters.<button onClick={() => setFilters({ mode: "operations", agent: "", origin: "all", severity: "all", query: "", expanded: false })}>Clear filters</button></div>}</div>
    <div className="network-legend"><span><i className="allowed-line" />Recorded / verified</span><span><i className="blocked-line" />Denied</span><span><i className="claimed-line" />Unverified claim</span><small>{view.nodes.length} visible · {view.hidden} expandable{graph.truncated ? " · bounded snapshot" : ""} · arrange changes presentation only</small></div>
    <details className="network-directory"><summary>Entity directory / keyboard inspection</summary><div>{view.nodes.map(n => <button key={n.id} onClick={() => { setSelected(n.id); focusNode(n.id); select(n.entity); }}>{n.label}<small>{n.entity.kind} / {n.status}</small></button>)}</div></details>
  </div>;
}
export default memo(function AgentGraph(props: Props) { return <ReactFlowProvider><NetworkCanvas {...props} /></ReactFlowProvider>; });
