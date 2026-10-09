"use client";

import { memo } from "react";
import { Handle, Position, type Node, type NodeProps } from "@xyflow/react";
import { Fingerprint, Ghost, Database, Server, ShieldAlert, Terminal, FileText, Crosshair } from "lucide-react";
import type { GraphNode } from "@/lib/workspace-graph";
import type { NodeFacts } from "@/lib/graph-explorer";

export type SecurityNode = Node<{ record: GraphNode; facts: NodeFacts; dimmed: boolean; evidence: boolean }, "security">;
const icons = { agent: Fingerprint, claim: Ghost, memory: Database, session: Server, incident: ShieldAlert, tool: Terminal, resource: FileText, trap: Crosshair };
const kinds = { agent: "AI AGENT", claim: "IDENTITY CLAIM", memory: "MEMORY STORE", session: "AUTHENTICATED SESSION", incident: "INVESTIGATION", tool: "MCP CAPABILITY", resource: "OBSERVED RESOURCE", trap: "SYNTHETIC HONEYPOT" };
export const SecurityNodeView = memo(function SecurityNodeView({ data, selected }: NodeProps<SecurityNode>) {
  const { record, facts, dimmed, evidence } = data, Icon = icons[record.entity.kind];
  return <div data-node-id={record.id} data-ordinal={facts.lastOrdinal} className={`security-node ${record.entity.kind} state-${record.status} ${selected ? "selected" : ""} ${dimmed ? "dimmed" : ""} ${evidence ? "evidence-linked" : ""}`}>
    <Handle type="target" position={Position.Left} isConnectable={false} />
    <div className="node-heading"><span className="node-symbol"><Icon size={22} /></span><div><span className="node-kind">{kinds[record.entity.kind]}</span><strong title={record.label}>{record.label}</strong></div><i className="node-indicator" /></div>
    <div className="node-subtitle" title={facts.subtitle}>{facts.subtitle}</div>
    <dl className="node-facts">{facts.facts.map(f => <div key={f.label}><dt>{f.label}</dt><dd title={f.value}>{f.value}</dd></div>)}</dl>
    <footer><span>{facts.origin}</span><span className="node-status">{record.status}</span></footer>
    <Handle type="source" position={Position.Right} isConnectable={false} />
  </div>;
});
