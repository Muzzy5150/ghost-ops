"use client";

import { useState } from "react";
import { ShieldCheck, ShieldOff, Fingerprint, Database, ArrowUpRight } from "lucide-react";
import type { SectionProps } from "../console";
import { Badge, DetailRow, Empty, shortId, time } from "../ui";
import type { Entity } from "@/lib/workspace-graph";
import type { Permissions, Counts } from "@/lib/schemas";

export function AgentInspector(props: SectionProps) {
  const agent = props.state.agents.find(a => a.id === props.focusId) ?? props.state.agents[0];
  if (!agent) return <Empty title="No registered identities" detail="Initialize the isolated demonstration using Demo Control." />;
  return <SelectedAgent key={agent.id} {...props} focusId={agent.id} />;
}
function SelectedAgent({ state, control, busy, navigate, focusId, inspectEvent }: SectionProps) {
  const agent = state.agents.find(a => a.id === focusId)!;
  const [tab, setTab] = useState("Overview");
  const permissions = agent.permissions as Permissions;
  const observed = state.events.filter(e => e.actorId === agent.id && e.identityVerified && e.simulated === agent.simulated);
  const incidents = state.incidents.filter(i => i.actorId === agent.id && i.identityVerified && i.simulated === agent.simulated);
  const memories = state.memories.filter(m => m.ownerId === agent.id);
  const latest = memories.filter((m, i) => memories.findIndex(v => v.key === m.key) === i);
  const sessions = state.sessions.filter(s => s.agentId === agent.id);
  const tools = Object.entries((agent.profile?.tools ?? {}) as Counts);
  const eventRows = (count: number) => observed.slice(0, count).map(e => <button className="inspector-event" key={e.id} onClick={() => inspectEvent?.(e.id)}><span className="mono">{time(e.createdAt)} / {e.module}</span><strong>{e.kind}</strong><small>{e.message}</small></button>);
  return <div className="agent-inspector"><div className="inspector-identity"><span className={`inspector-monogram ${agent.status}`}><Fingerprint size={25} /></span><div><span className="eyebrow">CREDENTIAL-BOUND IDENTITY</span><h3>{agent.name}</h3><code>{agent.id}</code></div><Badge value={agent.status} /></div>
    <select aria-label="Inspected agent" value={agent.id} onChange={e => navigate("Agent inspector", e.target.value)}>{state.agents.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}</select>
    <nav className="inspector-tabs" aria-label="Agent inspection sections">{["Overview", "AgentDNA", "Permissions", "Sessions", "Memory", "Events", "Investigations"].map(name => <button key={name} aria-pressed={tab === name} onClick={() => setTab(name)}>{name}</button>)}</nav>
    {tab === "Overview" && <><DetailRow label="Runtime">{agent.simulated ? "Simulated agent" : "Actual local runtime · model inference not implied"}</DetailRow><DetailRow label="Role">{agent.role}</DetailRow><DetailRow label="Trust">{agent.trust}</DetailRow><DetailRow label="Sessions">{sessions.filter(s => s.active).length} active / {sessions.length} recorded</DetailRow><DetailRow label="Memory">{latest.length} current records / {latest.filter(m => m.integrity !== "verified").length} not verified</DetailRow><DetailRow label="Investigations">{incidents.length} verified linked cases</DetailRow><div className="control-row"><button className="button danger small" disabled={busy || agent.status !== "active"} onClick={() => void control("quarantine", agent.id)}><ShieldOff size={15} />Quarantine</button><button className="button small" onClick={() => navigate("ShadowWatch", agent.id)}><ShieldCheck size={15} />Response controls</button></div><div className="inspector-section"><h4>Last verified observation</h4>{eventRows(1)}{!observed.length && <p>No authenticated observations in this bounded snapshot.</p>}</div></>}
    {tab === "Permissions" && <div className="inspector-section"><h4>Granted capabilities</h4><div className="capability-list">{permissions.tools.map(t => <code key={t}>{t}</code>)}</div><h4>Permitted resources</h4>{permissions.resources.map(r => <p className="mono" key={r}>{r}</p>)}<p>Only these integrated capabilities are enforced. Visual graph edits grant no permissions.</p></div>}
    {tab === "AgentDNA" && <div className="inspector-section"><div className="inspector-section-title"><h4>Behavioral fingerprint</h4><button className="text-button" onClick={() => navigate("AgentDNA", agent.id)}>Open full view <ArrowUpRight size={15} /></button></div><p className="muted">{agent.profile?.observations ?? 0} trusted permitted baseline observations · {agent.profile?.frozen ? "frozen" : "learning"}</p>{tools.map(([tool, count]) => <div className="fingerprint-row" key={tool}><code>{tool}</code><span>{count}</span><meter min={0} max={Math.max(1, ...tools.map(([, n]) => n))} value={count}>{count}</meter></div>)}<p>A deviation is not a compromise probability.</p></div>}
    {tab === "Sessions" && <div className="inspector-section">{sessions.map(s => <button className="inspector-record" key={s.id} onClick={() => navigate("Runtime sessions", agent.id)}><code>{shortId(s.id)}</code><span>{s.active ? "Active" : "Closed"} / {s.sourceTrust}</span></button>)}<button className="button small" onClick={() => navigate("Runtime sessions", agent.id)}>Inspect gateway receipts</button></div>}
    {tab === "Memory" && <div className="inspector-section"><h4>Latest memory integrity</h4>{latest.map(m => <button className="inspector-record" key={m.id} onClick={() => navigate("MemoryGuard", m.id)}><span><Database size={15} />{m.key} / v{m.version}</span><Badge value={m.integrity} /></button>)}</div>}
    {tab === "Investigations" && <div className="inspector-section">{incidents.length ? incidents.map(i => <button className="inspector-record" key={i.id} onClick={() => navigate("Investigations", i.id)}><span>INC-{shortId(i.id)} / {i.status}</span><Badge value={i.severity} /></button>) : <p className="muted">No verified linked investigations.</p>}</div>}
    {tab === "Events" && <div className="inspector-section"><h4>Recent verified observations</h4>{eventRows(20)}</div>}
  </div>;
}
export function EvidenceInspector({ state, focusId, navigate, entity }: Pick<SectionProps, "state" | "focusId" | "navigate"> & { entity?: Entity }) {
  const event = state.events.find(e => e.id === focusId) ?? state.incidents.flatMap(i => i.events).find(e => e.id === focusId);
  const request = state.runtimeRequests.find(r => r.id === focusId || r.id === event?.requestId);
  if (event) {
    const incidentEvent = state.incidents.flatMap(i => i.events).find(e => e.id === event.id);
    const receipt = request ?? incidentEvent?.request;
    const memoryId = (event.details as Record<string, unknown>).memoryId;
    return <div className="evidence-inspector"><div className="evidence-title"><Badge value={event.severity} /><code>EVENT / {shortId(event.id)}</code></div><h3>{event.kind}</h3><p>{event.message}</p><DetailRow label="Engine">{event.module}</DetailRow><DetailRow label="Provenance">{event.simulated ? "Isolated simulation" : "Actual local runtime"}</DetailRow><DetailRow label="Attribution">{event.identityVerified ? "Verified identity / authorized operator" : "Unverified claim — not registered-agent behavior"}</DetailRow><DetailRow label="Actor"><code>{event.actorId}</code>{event.identityVerified && <button className="text-button" onClick={() => navigate("Agent inspector", event.actorId)}>Inspect agent</button>}</DetailRow><DetailRow label="Session"><code>{event.sessionId ?? "Not recorded"}</code></DetailRow><DetailRow label="Time">{new Date(event.createdAt).toLocaleString()} / #{event.ordinal}</DetailRow>
      {receipt && <div className="evidence-policy"><span className="eyebrow">PERSISTED GATEWAY RECEIPT</span><Badge value={receipt.allowed && event.kind !== "REPLAY_ACCESS_DENIED" ? "authorized" : "blocked"} /><code>{receipt.tool}:{receipt.operation} → {receipt.resource}</code><p>{event.kind === "REPLAY_ACCESS_DENIED" ? event.message : receipt.reason}</p><small>{receipt.execution ? "Bounded handler receipt exists; inspect completion metadata below." : "No actual handler receipt recorded."}</small></div>}
      <div className="control-row">{event.incidentId && <button className="button small" onClick={() => navigate("Investigations", event.incidentId!)}>Open linked investigation</button>}{typeof memoryId === "string" && <button className="button small" onClick={() => navigate("MemoryGuard", memoryId)}>Inspect memory snapshot</button>}</div><details open><summary>Structured evidence / escaped text</summary><pre className="evidence-json">{JSON.stringify({ eventId: event.id, requestId: event.requestId, details: event.details, execution: receipt?.execution ?? null }, null, 2)}</pre></details></div>;
  }
  if (request) return <div className="evidence-inspector"><h3>Runtime request / {shortId(request.id)}</h3><Badge value={request.allowed ? "authorized" : "blocked"} /><pre className="evidence-json">{JSON.stringify(request, null, 2)}</pre></div>;
  if (entity) {
    const relatedEvents = state.events.filter(e => {
      const d = e.details as Record<string, unknown>;
      const claimed = entity.sessionId?.startsWith("claim:") === true;
      const sessionId = claimed ? entity.sessionId!.slice(6) : entity.sessionId;
      if (entity.kind === "session") return entity.sessionId ? !e.identityVerified && e.sessionId === sessionId && e.actorId === entity.actorId : e.identityVerified && e.sessionId === entity.id && e.actorId === entity.actorId;
      if (entity.kind === "claim") return !e.identityVerified && e.actorId === entity.id && e.sessionId === entity.sessionId;
      if (entity.kind === "tool") return entity.id === `${d.tool}:${d.operation}` && e.actorId === entity.actorId && e.sessionId === sessionId && e.identityVerified !== claimed;
      return entity.kind === "trap" ? d.trapId === entity.id : d.resource === entity.id;
    });
    const trap = state.traps.find(t => entity.kind === "trap" && t.id === entity.id);
    return <div className="evidence-inspector"><span className="eyebrow">SELECTED RECORDED ENTITY</span><h3>{trap?.name ?? entity.kind}</h3><code className="hash-value">{entity.id}</code>{trap && <p>{trap.description}. Synthetic local resource; no production secrets.</p>}{entity.kind === "claim" && <p className="amber-text">Authentication failed. This claim does not establish the registered agent&apos;s behavior.</p>}<div className="inspector-section"><h4>Matching recent evidence</h4>{relatedEvents.slice(0, 30).map(e => <button className="inspector-event" key={e.id} onClick={() => navigate("Evidence", e.id)}><span>{time(e.createdAt)} / {e.module}</span><strong>{e.kind}</strong><small>{e.message}</small></button>)}{!relatedEvents.length && <p>No matching event in the bounded recent snapshot.</p>}</div></div>;
  }
  return <Empty title="Select a recorded event" detail="Open a terminal entry, timeline event or network relationship to inspect its evidence, attribution and enforcement decision." />;
}
