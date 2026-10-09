import { useState } from "react";
import { Fingerprint, ShieldOff, Database, ArrowUpRight } from "lucide-react";
import type { SectionProps } from "../console";
import { Badge, Empty, shortId, time } from "../ui";
import { Investigations } from "../investigations";
import { downloadEvidence } from "./lab-benchmarks";

export function IncidentDesk(props: SectionProps) {
  const { state, focusId, navigate, inspectEvent, focusIncident, busy, control } = props;
  const [selected, setSelected] = useState(focusId ?? "");
  const [severity, setSeverity] = useState("all");
  const [selectedEvent, setSelectedEvent] = useState<string>();
  const [exportStatus, setExportStatus] = useState("");
  const [exporting, setExporting] = useState(false);
  const exportCase = async (id: string) => { setExporting(true); try { await downloadEvidence("incident", id); setExportStatus("Downloaded locally authenticated evidence. Verify with evidence:verify; not external attestation."); } catch { setExportStatus("Export failed; no verified success claimed."); } finally { setExporting(false); } };
  const cases = state.incidents.filter(i => severity === "all" || i.severity === severity);
  const incident = cases.find(i => i.id === selected) ?? cases[0];
  if (!incident) return <div className="incident-desk"><div className="tool-bar"><select aria-label="Case severity" value={severity} onChange={e => setSeverity(e.target.value)}><option value="all">All severities</option>{["critical", "high", "medium"].map(v => <option key={v}>{v}</option>)}</select></div><Empty title="No matching investigations" detail="Open Demo Control to execute a recorded local scenario, or change the severity filter." /></div>;
  const agent = incident.identityVerified ? state.agents.find(a => a.id === incident.actorId) : undefined;
  const blocked = incident.events.filter(e => e.kind === "TOOL_BLOCKED" || e.kind === "REPLAY_ACCESS_DENIED");
  const memoryIds = new Set(incident.events.map(e => (e.details as Record<string, unknown>).memoryId).filter((id): id is string => typeof id === "string"));
  const memories = state.memories.filter(m => memoryIds.has(m.id) || incident.identityVerified && m.ownerId === incident.actorId && !!incident.sessionId && m.sessionId === incident.sessionId);
  return <div className="incident-desk"><div className="tool-bar"><select aria-label="Select investigation" value={incident.id} onChange={e => { setSelected(e.target.value); focusIncident?.(e.target.value); }}><option value={incident.id} hidden>INC-{shortId(incident.id)}</option>{cases.map(i => <option key={i.id} value={i.id}>{i.severity.toUpperCase()} / {i.actorId} / {shortId(i.id)}</option>)}</select><select aria-label="Case severity" value={severity} onChange={e => setSeverity(e.target.value)}><option value="all">All severities</option>{["critical", "high", "medium"].map(v => <option key={v}>{v}</option>)}</select><button title="Focus related network" onClick={() => { focusIncident?.(incident.id); navigate("Agent network"); }}><Fingerprint size={14} />Focus network</button></div>
    <div className="case-header"><div><span className="eyebrow">CASE FILE / {incident.id}</span><h3>{incident.title}</h3><p>{incident.identityVerified ? "Verified attribution" : "Unverified claim — not victim history"} · {incident.simulated ? "SIMULATED" : "LOCAL RUNTIME"} · session <code>{shortId(incident.sessionId ?? "not recorded")}</code></p></div><div><Badge value={incident.severity} /><Badge value={incident.status} /></div></div>
    <div className="case-facts"><span><small>AFFECTED IDENTITY</small>{agent ? <button className="text-button" onClick={() => navigate("Agent inspector", agent.id)}>{agent.name}<ArrowUpRight size={12} /></button> : <code>{incident.actorId} [claim]</code>}</span><span><small>OBSERVED RANGE</small>{time(incident.events[0]?.createdAt ?? incident.createdAt)} → {time(incident.events.at(-1)?.createdAt ?? incident.updatedAt)}</span><span><small>ENFORCEMENT</small>{blocked.length} denial observations</span><span><small>CONTAINMENT</small>{agent?.status ?? incident.status}</span></div>
    <div className="case-response"><button className="button small danger" disabled={busy || !incident.identityVerified && !!state.agents.find(a => a.id === incident.actorId) || incident.status !== "investigating"} onClick={() => void control("quarantine", incident.actorId)}><ShieldOff size={12} />Contain actor</button><button className="button small" disabled={!agent} onClick={() => navigate("AgentDNA", incident.actorId)}><Fingerprint size={12} />Behavioral history</button>{memories.length > 0 && <button className="button small" onClick={() => navigate("MemoryGuard", memories[0].id)}><Database size={12} />Memory / restoration</button>}<span>{incident.events.length} persisted timeline events</span></div>
    <button className="button" disabled={exporting || props.recorded} title={props.recorded ? "Authenticated forensic exports require the local backend; see Docs." : undefined} onClick={() => void exportCase(incident.id)}>Download investigation report</button><p role="status">{exportStatus}</p>
    <ol className="case-timeline">{incident.events.map(event => {
      const receipt = event.request;
      const denied = receipt && (!receipt.allowed || event.kind === "REPLAY_ACCESS_DENIED");
      return <li key={event.id}><button className={`case-event severity-${event.severity}`} aria-pressed={selectedEvent === event.id} onClick={() => { setSelectedEvent(event.id); inspectEvent?.(event.id); }}><span className="case-event-time"><b>#{event.ordinal}</b>{time(event.createdAt)}</span><span className="case-event-track"><i /></span><span className="case-event-body"><span className="case-event-heading"><strong>{event.module}</strong><code>{event.kind}</code><Badge value={event.severity} /></span><span>{event.message}</span>{receipt && <span className={`case-tool-receipt ${denied ? "denied" : ""}`}><b>{denied ? "DENIED" : "PERMITTED"}</b><code>{receipt.tool}:{receipt.operation} → {receipt.resource}</code></span>}<small>{event.identityVerified ? "Verified binding" : "Unverified claim"} · {shortId(event.id)} · inspect evidence ↗</small></span></button></li>;
    })}</ol>
    <details className="case-interpretation"><summary>Correlation rule / facts versus interpretation</summary><p>{incident.explanation}</p><p>Recommendation: {incident.recommendation}</p><p>Severity is categorical. Anomaly findings and decoy interest alone do not establish malicious intent.</p><div className="capability-list">{(incident.reasons as string[]).map(reason => <code key={reason}>{reason}</code>)}</div></details>
    <details className="case-interpretation"><summary>Auditable response history / {incident.actions.length} records</summary>{incident.actions.map(a => <p key={a.id}><Badge value={a.action} />{a.reason}<small className="cell-sub">{time(a.createdAt)} / {a.operator} / {a.id}</small></p>)}</details>
    <details className="case-interpretation"><summary>Full case file / filters, linked memory and expanded receipts</summary><Investigations key={incident.id} {...props} focusId={incident.id} /></details>
  </div>;
}
