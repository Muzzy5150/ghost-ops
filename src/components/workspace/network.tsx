"use client";

import { memo, useCallback, useMemo, useState, type Dispatch } from "react";
import { ReactFlow, ReactFlowProvider, Background, Controls, Handle, Position, useReactFlow, type Node, type NodeProps, type Edge, type NodeChange } from "@xyflow/react";
import { Fingerprint, Ghost, Database, Server, ShieldAlert, Terminal, FileText, Network, Crosshair, RotateCcw } from "lucide-react";
import { recordedGraph, type Entity, type GraphNode } from "@/lib/workspace-graph";
import type { State } from "@/lib/view-types";
import type { Preferences, WorkspaceAction } from "@/lib/workspace-model";

type SecurityNode = Node<{ record: GraphNode; dimmed: boolean }, "security">;
const icons = { agent: Fingerprint, claim: Ghost, memory: Database, session: Server, incident: ShieldAlert, tool: Terminal, resource: FileText, trap: Crosshair };
const SecurityNodeView = memo(function SecurityNodeView({ data, selected }: NodeProps<SecurityNode>) {
  const { record, dimmed } = data, Icon = icons[record.entity.kind];
  return <div className={`security-node ${record.entity.kind} state-${record.status} ${selected ? "selected" : ""} ${dimmed ? "dimmed" : ""}`}>
    <Handle type="target" position={Position.Left} isConnectable={false} /><div className="node-kind"><Icon size={13} /><span>{record.entity.kind === "claim" ? "UNVERIFIED CLAIM" : record.entity.kind}</span><i /></div>
    <strong>{record.label}</strong><small>{record.detail}</small><div className="node-state">{record.status}</div><Handle type="source" position={Position.Right} isConnectable={false} />
  </div>;
});
const nodeTypes = { security: SecurityNodeView };
type Props = { state: State; layout: Preferences; dispatch: Dispatch<WorkspaceAction>; incidentId?: string; select: (entity: Entity) => void };
function NetworkCanvas({ state, layout, dispatch, incidentId, select }: Props) {
  const graph = useMemo(() => recordedGraph(state, incidentId), [state, incidentId]);
  const [draft, setDraft] = useState<Record<string, { x: number; y: number }>>({});
  const [mode, setMode] = useState("operations");
  const [filter, setFilter] = useState("");
  const [selected, setSelected] = useState<string>();
  const flow = useReactFlow();
  const visible = useMemo(() => {
    const records = graph.nodes.filter(n => (mode !== "operations" || !["session", "tool"].includes(n.entity.kind)) && (mode !== "agents" || ["agent", "claim", "incident"].includes(n.entity.kind)) && (mode !== "deception" || ["agent", "claim", "trap", "incident"].includes(n.entity.kind)) && (!filter || `${n.label} ${n.detail}`.toLowerCase().includes(filter.toLowerCase())));
    if (mode === "all") return records;
    // Compact projection: ownership and direct recorded requests, not inferred paths.
    const rows = [0, 0, 0, 0]; let resourceIndex = 0;
    return records.map(n => {
      const column = ["agent", "claim"].includes(n.entity.kind) ? 0 : n.entity.kind === "incident" ? 3 : 1 + resourceIndex++ % 2;
      return { ...n, position: { x: column * 265, y: rows[column]++ * 123 } };
    });
  }, [graph, mode, filter]);
  const nodes = useMemo<SecurityNode[]>(() => visible.map(n => ({ id: n.id, type: "security", data: { record: n, dimmed: !!incidentId && !n.incidentIds.includes(incidentId) }, position: draft[n.id] ?? layout.positions[n.id] ?? n.position, selected: selected === n.id, ariaLabel: `${n.entity.kind}: ${n.label}. ${n.detail}. ${n.status}`, deletable: false })), [visible, draft, layout.positions, incidentId, selected]);
  const visibleIds = useMemo(() => new Set(visible.map(n => n.id)), [visible]);
  const projectedEdges = mode === "all" ? graph.edges : graph.compactEdges;
  const edges = useMemo<Edge[]>(() => projectedEdges.filter(e => visibleIds.has(e.source) && visibleIds.has(e.target)).map(e => ({
    id: e.id, source: e.source, target: e.target, label: `${e.label}${e.count > 1 ? ` ×${e.count}` : ""}`, type: "smoothstep", animated: layout.animations && !e.blocked,
    style: { stroke: e.blocked ? "#e18b83" : e.verified ? "#57747b" : "#c5a06a", strokeDasharray: e.verified ? undefined : "5 4", opacity: incidentId && !e.incidentIds.includes(incidentId) ? .12 : .75 },
    labelStyle: { fill: "#b4c1c6", fontSize: 9 }, labelBgStyle: { fill: "#131a1e", fillOpacity: .9 }, deletable: false,
    data: { record: e }, ariaLabel: `${e.label}: ${e.blocked ? "blocked" : "recorded"}; ${e.verified ? "verified binding" : "unverified claim"}`
  })), [projectedEdges, visibleIds, layout.animations, incidentId]);
  const onNodesChange = useCallback((changes: NodeChange<SecurityNode>[]) => {
    for (const change of changes) {
      if (change.type === "position" && change.position) {
        const position = change.position;
        if (change.dragging === true) setDraft(previous => ({ ...previous, [change.id]: position }));
        else {
          dispatch({ type: "position", id: change.id, position });
          setDraft(previous => { const next = { ...previous }; delete next[change.id]; return next; });
        }
      }
      if (change.type === "select" && change.selected) setSelected(change.id);
    }
  }, [dispatch]);
  const reset = () => { dispatch({ type: "reset-nodes" }); setDraft({}); requestAnimationFrame(() => void flow.fitView({ padding: .16 })); };
  return <div className="network-tool">
    <div className="tool-bar"><Network size={14} /><select aria-label="Network entity filter" value={mode} onChange={e => setMode(e.target.value)}><option value="operations">Operations map</option><option value="all">Sessions & tools</option><option value="agents">Identities & cases</option><option value="deception">Deception resources</option></select><input aria-label="Find network entity" placeholder="Find entity…" value={filter} onChange={e => setFilter(e.target.value)} /><button onClick={() => void flow.fitView({ padding: .16 })} title="Fit network" aria-label="Fit network"><Crosshair size={14} /></button><button onClick={reset} title="Reset node positions" aria-label="Reset network positions"><RotateCcw size={13} /></button></div>
    {incidentId && <div className="network-focus">CASE FOCUS · {incidentId.slice(0, 8)} · unrelated records dimmed</div>}
    <div className="flow-surface"><ReactFlow<SecurityNode> nodes={nodes} edges={edges} nodeTypes={nodeTypes} onNodesChange={onNodesChange} onNodeClick={(_, node) => { setSelected(node.id); select(node.data.record.entity); }} onNodeDragStop={(_, node) => { dispatch({ type: "position", id: node.id, position: node.position }); setDraft(previous => { const next = { ...previous }; delete next[node.id]; return next; }); }} onEdgeClick={(_, edge) => { const record = projectedEdges.find(e => e.id === edge.id); if (record) select({ kind: "resource", id: `evidence:${record.evidenceIds[0]}` }); }} fitView fitViewOptions={{ padding: .16 }} minZoom={.15} maxZoom={1.8} nodesConnectable={false} edgesReconnectable={false} deleteKeyCode={null} colorMode="dark" onlyRenderVisibleElements><Background gap={24} size={1} color="#293238" /><Controls showInteractive={false} /></ReactFlow></div>
    <div className="network-legend"><span><i className="allowed-line" />Recorded link</span><span><i className="blocked-line" />Denied request</span><span><i className="claimed-line" />Unverified claim</span><small>{visible.length} / {graph.nodes.length} nodes{graph.truncated ? " · bounded subset" : ""} · {mode === "all" ? "session detail" : "direct request projection"}</small></div>
    <details className="network-directory"><summary>Accessible entity list / inspect without dragging</summary><div>{visible.map(n => <button key={n.id} onClick={() => select(n.entity)}>{n.entity.kind} / {n.label}<small>{n.status}</small></button>)}</div></details>
  </div>;
}
export default function AgentGraph(props: Props) { return <ReactFlowProvider><NetworkCanvas {...props} /></ReactFlowProvider>; }
