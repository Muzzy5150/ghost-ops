import { useState } from "react";
import { ArrowRight, Fingerprint, ShieldOff, ShieldCheck } from "lucide-react";
import type { SectionProps } from "./console";
import type { Incident } from "@/lib/view-types";
import { Badge, Empty, Panel, SectionLink, shortId, time } from "./ui";

function IncidentDetail({ incident, state, control, busy, navigate, inspectEvent }: SectionProps & { incident: Incident }) {
  const [expanded, expand] = useState<string | null>(null);
  const [engine, setEngine] = useState("all");
  const modules = [...new Set(incident.events.map(e => e.module))];
  const agent = state.agents.find(a => a.id === incident.actorId);
  const memoryIds = new Set(incident.events.flatMap(e => { const details = e.details as { memoryId?: string }; return details.memoryId ? [details.memoryId] : []; }));
  const memories = state.memories.filter(m => m.ownerId === incident.actorId && (m.sessionId === incident.sessionId || memoryIds.has(m.id)));
  const blocked = incident.events.filter(e => e.kind === "TOOL_BLOCKED");
  const stages = [
    { label: "Observe", match: (kind: string) => kind === "TOOL_EXECUTED" },
    { label: "Detect", match: (kind: string) => (incident.reasons as string[]).includes(kind) },
    { label: "Correlate", match: (kind: string) => kind.startsWith("CORRELATION_") },
    { label: "Contain", match: (kind: string) => ["QUARANTINE", "REVOKE"].includes(kind) },
    { label: "Verify", match: (kind: string) => ["MEMORY_RESTORED", "INTEGRITY_VERIFIED", "AGENT_QUARANTINED"].includes(kind) }
  ];
  return <Panel title={incident.title} eyebrow={`INCIDENT / ${incident.id}`} action={<Badge value={incident.status} />}>
    <div className="incident-meta"><Badge value={incident.severity} /><strong>{agent?.name ?? incident.actorId}</strong><span>{incident.simulated ? "SIMULATED ACTIVITY" : "LOCAL RUNTIME · MCP"}</span><span>{incident.evidence.length} evidence references</span><time dateTime={incident.createdAt}>First {time(incident.createdAt)} · last {time(incident.updatedAt)}</time></div>
    <div className="incident-journey">{stages.map(({ label, match }, i) => {
      const event = incident.events.find(e => match(e.kind));
      return <div key={label} className={event ? "recorded" : ""}><span>{String(i + 1).padStart(2, "0")}</span><strong>{label}</strong><small>{event ? time(event.createdAt) : "Not recorded"}</small></div>;
    })}</div>
    <div className="investigation-facts"><div><span className="eyebrow">CONFIRMED OBSERVATIONS</span><p>{blocked.length} blocked gateway requests in this investigation. {modules.filter(m => !["Gateway", "Response"].includes(m)).join(", ")} supplied recorded evidence.</p><p>Identity attribution: <strong>{incident.identityVerified ? "credential + session verified" : "unverified claim / legacy evidence"}</strong>.</p><code>session / {incident.sessionId ?? "not recorded"}</code></div><div><span className="eyebrow">RULE-BASED INTERPRETATION</span><p>{incident.explanation}</p><small>Severity is categorical. Neither an anomaly nor decoy interest alone proves malicious intent.</small></div></div>
    <div className="tag-list incident-reasons">{(incident.reasons as string[]).map(reason => <code key={reason}>{reason}</code>)}</div>
    <div className="recommendation"><ShieldCheck size={18} /><div><strong>Recommended response</strong><p>{incident.recommendation}</p></div></div>
    <div className="control-row"><button className="button danger" disabled={busy || incident.status !== "investigating" || !!agent && !incident.identityVerified} onClick={() => void control("quarantine", incident.actorId)}><ShieldOff size={15} />Contain actor</button><SectionLink onClick={() => navigate("AgentDNA", incident.actorId)}><Fingerprint size={15} />Behavioral history</SectionLink>{agent && <SectionLink onClick={() => navigate("Agent Registry", agent.id)}>Identity & permissions</SectionLink>}</div>
    <div className="timeline-heading"><h3>Evidence chain</h3><label className="inline-select">Engine<select aria-label="Filter timeline by engine" value={engine} onChange={e => setEngine(e.target.value)}><option value="all">All engines</option>{modules.map(m => <option key={m}>{m}</option>)}</select></label></div>
    <ol className="timeline">{incident.events.filter(e => engine === "all" || e.module === engine).map(e => <li key={e.id} className={`timeline-${e.severity}`}>
      <span className="timeline-marker" /><button className="timeline-event" aria-expanded={expanded === e.id} onClick={() => { expand(expanded === e.id ? null : e.id); inspectEvent?.(e.id); }}><div><span className="mono">#{e.ordinal} · {time(e.createdAt)}</span><span className={`module-label module-${e.module.toLowerCase()}`}>{e.module}</span><Badge value={e.severity} /></div><p>{e.message}</p><small className="mono">{e.kind} · evidence {shortId(e.id)} · {expanded === e.id ? "collapse" : "inspect"}</small></button>
      {expanded === e.id && <div className="expanded-evidence"><p>{e.identityVerified ? "Verified binding / authorized operator attribution" : "Unverified identity claim / legacy event"} · {e.simulated ? "isolated simulation" : "actual local runtime"}</p>
        {e.request && <div className="policy-receipt"><Badge value={e.request.allowed && e.kind !== "REPLAY_ACCESS_DENIED" ? "authorized" : "blocked"} /><code>{e.request.tool}:{e.request.operation} → {e.request.resource}</code><strong>{e.kind === "REPLAY_ACCESS_DENIED" ? e.message : e.request.reason}</strong></div>}
        <pre className="evidence-json">{JSON.stringify({ eventId: e.id, ordinal: e.ordinal, sessionId: e.sessionId, requestId: e.requestId, simulated: e.simulated, execution: e.request?.execution ?? null, details: e.details }, null, 2)}</pre>
      </div>}
    </li>)}</ol>
    {memories.length > 0 && <div className="response-history"><span className="eyebrow">RELATED MEMORY SNAPSHOTS</span>{memories.map(m => <div className="linked-memory" key={m.id}><span>Version {m.version} <Badge value={m.integrity} /></span><SectionLink onClick={() => navigate("MemoryGuard", m.id)}>Inspect provenance & diff<ArrowRight size={14} /></SectionLink></div>)}</div>}
    {incident.actions.length > 0 && <div className="response-history"><span className="eyebrow">AUDITABLE RESPONSE HISTORY</span>{incident.actions.map(a => <p key={a.id}><Badge value={a.action} />{a.reason}<small>{time(a.createdAt)} · {a.operator} · {a.id}</small></p>)}</div>}
  </Panel>;
}

export function Investigations(props: SectionProps) {
  const { state, focusId } = props;
  const [severity, setSeverity] = useState("all");
  const [status, setStatus] = useState("all");
  const [selected, select] = useState<string | null>(null);
  const incidents = state.incidents.filter(i => (severity === "all" || i.severity === severity) && (status === "all" || i.status === status));
  const incident = incidents.find(i => i.id === (selected ?? focusId)) ?? incidents[0];
  return <><div className="investigation-toolbar"><div className="tabs">{["all", "critical", "high", "medium"].map(f => <button key={f} className={severity === f ? "active" : ""} aria-pressed={severity === f} onClick={() => setSeverity(f)}>{f === "all" ? "All investigations" : f}<span>{state.incidents.filter(i => f === "all" || i.severity === f).length}</span></button>)}</div><label className="inline-select">Status<select aria-label="Filter investigations by status" value={status} onChange={e => setStatus(e.target.value)}>{["all", "investigating", "contained", "resolved"].map(v => <option key={v}>{v}</option>)}</select></label></div>
    {!incident ? <Panel title="Investigations"><Empty title="No matching investigations" detail="Run a threat scenario or change the filters to inspect persisted evidence." /></Panel> : <div className="investigation-grid"><div className="incident-list">{incidents.map(i => <button className={`incident-list-item ${incident.id === i.id ? "selected" : ""}`} aria-pressed={incident.id === i.id} key={i.id} onClick={() => { select(i.id); props.focusIncident?.(i.id); }}><div><Badge value={i.severity} /><small className="mono">{time(i.createdAt)}</small></div><h3>{i.title}</h3><p>{i.actorId} · {i.evidence.length} evidence references</p><div><Badge value={i.status} /><span className="mono">INC-{shortId(i.id).toUpperCase()}</span></div></button>)}</div><IncidentDetail key={incident.id} {...props} incident={incident} /></div>}
  </>;
}
