'use client';
import { useCallback, useState } from 'react';
import { Background, Controls, Handle, Position, ReactFlow, useNodesState, type Node, type NodeProps, type Edge } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import record from '../data/recorded-case.json';
type EvidenceNode = Node<{ name: string; category: string; status: string; detail: string; eventOrdinals: number[] }, 'evidence'>;
const initialNodes: EvidenceNode[] = [
  { id: 'research', type: 'evidence', position: { x: 0, y: 120 }, data: { name: 'ResearchAgent', category: 'AUTHENTICATED AGENT', status: 'Contained in recorded case', detail: 'Scripted actor · real guarded requests', eventOrdinals: [5,7,9,28,30,34,38,39] } },
  { id: 'source', type: 'evidence', position: { x: 340, y: 0 }, data: { name: 'Untrusted source', category: 'DOCUMENT PROVENANCE', status: 'Synthetic advisory fixture', detail: 'Retrieved content cannot grant privileges', eventOrdinals: [7,9,11] } },
  { id: 'coordinator', type: 'evidence', position: { x: 690, y: 0 }, data: { name: 'CoordinatorAgent', category: 'AUTHENTICATED AGENT', status: 'Received bounded delegation', detail: 'Provenance retained across handoff', eventOrdinals: [9,11] } },
  { id: 'memory', type: 'evidence', position: { x: 340, y: 260 }, data: { name: 'Protected policy', category: 'MEMORYGUARD', status: 'Write denied before execution', detail: 'memory/runtime-policy', eventOrdinals: [28,30] } },
  { id: 'decoy', type: 'evidence', position: { x: 690, y: 260 }, data: { name: 'Administrative decoy', category: 'GHOSTTRAP', status: 'Interaction recorded · denied', detail: 'Synthetic resource · no real privilege', eventOrdinals: [34] } },
  { id: 'containment', type: 'evidence', position: { x: 340, y: 520 }, data: { name: 'Containment verified', category: 'GHOST RESPONSE', status: 'Subsequent handler did not execute', detail: 'Current quarantine checked by gateway', eventOrdinals: [38,39] } },
];
const initialEdges: Edge[] = [
  { id: 'read', source: 'research', target: 'source', label: 'retrieved · #7', data: { ordinal: 7 }, style: { stroke: '#5cc9bd', strokeWidth: 2 } },
  { id: 'handoff', source: 'source', target: 'coordinator', label: 'untrusted handoff · #9 / #11', data: { ordinal: 11 }, style: { stroke: '#a4adb7', strokeWidth: 2, strokeDasharray: '6 5' } },
  { id: 'write', source: 'research', target: 'memory', label: 'write blocked · #28', data: { ordinal: 28 }, style: { stroke: '#ef7c77', strokeWidth: 2.5 } },
  { id: 'trap', source: 'research', target: 'decoy', label: 'decoy attempt · #34', data: { ordinal: 34 }, style: { stroke: '#e9b774', strokeWidth: 2 } },
  { id: 'contain', source: 'research', target: 'containment', label: 'quarantine · #38 / #39', data: { ordinal: 39 }, style: { stroke: '#ef7c77', strokeWidth: 2.5 } },
];
function EvidenceCard({ data, selected }: NodeProps<EvidenceNode>) { return <div className={`evidence-node${selected ? ' is-selected' : ''}`}><Handle type="target" position={Position.Left} /><div className="node-label">{data.category}</div><h3>{data.name}</h3><p className="node-status">{data.status}</p><div className="node-detail">{data.detail}</div><Handle type="source" position={Position.Right} /></div>; }
const nodeTypes = { evidence: EvidenceCard };
const defaultEdgeOptions = { type: 'smoothstep', labelStyle: { fill: '#d7dee7', fontSize: 13 }, labelBgStyle: { fill: '#10151c', fillOpacity: 0.95 }, labelBgPadding: [8,5] as [number,number], labelBgBorderRadius: 4 };
export default function RecordedNetwork() {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [selected, setSelected] = useState<number>(28);
  const [filter, setFilter] = useState('');
  const event = record.events.find(e => e.ordinal === selected) ?? record.events[0];
  const selectEvidence = useCallback((ordinal: number) => {
    setSelected(ordinal);
    setNodes(previous => previous.map(n => ({ ...n, selected: n.data.eventOrdinals.includes(ordinal) })));
  }, [setNodes]);
  const visibleEvents = record.events.filter(e => `${e.kind} ${e.module} ${e.resource ?? ''}`.toLowerCase().includes(filter.toLowerCase()));
return <div className="workbench"><div className="workspace-bar"><span><span className="status-dot" /> FROZEN CASE / 09 OCT 2026</span><button onClick={() => setNodes(initialNodes)}>Reset arrangement</button></div><div className="workbench-grid"><div className="canvas"><ReactFlow nodes={nodes} edges={initialEdges} onNodesChange={onNodesChange} nodeTypes={nodeTypes} onNodeClick={(_, node) => selectEvidence(node.data.eventOrdinals[0])} onEdgeClick={(_, edge) => selectEvidence(Number(edge.data?.ordinal))} nodesConnectable={false} deleteKeyCode={null} fitView fitViewOptions={{ padding: 0.12, maxZoom: 0.9 }} minZoom={0.45} maxZoom={1.4} defaultEdgeOptions={defaultEdgeOptions} colorMode="dark"><Background gap={24} size={1} color="#2a3442" /><Controls showInteractive={false} /></ReactFlow><span className="canvas-caption">VIEW ONLY · MOVING NODES DOES NOT ALTER EVIDENCE</span></div><aside className="inspector" aria-label="Selected evidence"><p className="eyebrow">EVIDENCE INSPECTOR</p><h2>{event.module}</h2><p className="event-kind">{event.kind.replaceAll('_',' ')}</p><dl><dt>Policy outcome</dt><dd>{event.decision ?? 'Observed event—not a policy verdict'}</dd><dt>Underlying handler</dt><dd>{event.handlerExecuted === false ? 'Did not execute' : event.handlerExecuted === true ? 'Executed' : 'Not applicable to this event'}</dd><dt>Recorded timestamp</dt><dd><time dateTime={event.at}>{event.at}</time></dd><dt>Evidence reference</dt><dd className="mono">{event.id}</dd>{event.resource ? <><dt>Resource</dt><dd className="mono">{event.resource}</dd></> : null}</dl><div className="notice small"><strong>What this establishes</strong><p>A persisted observation in an isolated synthetic run. Scripted probes are not model decisions. Access attempts and behavioral anomalies do not prove malicious intent.</p></div></aside></div><section className="timeline" aria-label="Recorded event timeline"><div className="timeline-heading"><h2>Recorded sequence</h2><label>Find evidence <input type="search" value={filter} onChange={e => setFilter(e.target.value)} placeholder="Engine, event, resource…" /></label></div><div className="event-list">{visibleEvents.map(e => <button aria-pressed={selected === e.ordinal} onClick={() => selectEvidence(e.ordinal)} key={e.id}><span className="event-number">{String(e.ordinal).padStart(2,'0')}</span><time dateTime={e.at}>{e.at.slice(11,23)}</time><span>{e.kind.replaceAll('_',' ')}</span><small>{e.module}</small><span className={e.handlerExecuted === false ? 'denied' : 'observed'}>{e.decision ?? (e.handlerExecuted ? 'EXECUTED' : 'OBSERVED')}</span></button>)}{visibleEvents.length === 0 ? <p>No recorded events match that filter.</p> : null}</div><p className="provenance">Run <code>{record.runId}</code> · Selected, minimized projection of a recorded local synthetic case. Full forensic packages and signing material are not downloadable here.</p></section></div>;
}
