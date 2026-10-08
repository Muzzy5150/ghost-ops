import { Fragment, useState } from "react";
import { Activity, ArrowUpRight, CheckCheck, ChevronRight, Fingerprint, Ghost, Layers, Network, Radar, Shield, ShieldCheck, ShieldOff } from "lucide-react";
import type { Event, State } from "@/lib/view-types";
import type { SectionProps } from "./console";
import { Badge, Empty, GhostMark, Panel, SectionLink, time } from "./ui";

export function Metrics({ state }: { state: State }) {
  const metrics = [
    { label: "Monitored agents", value: state.stats.registered + state.stats.unknown, icon: Network, detail: `${state.stats.authorized} authorized · ${state.stats.unknown} unknown`, color: "green" },
    { label: "Authorized identities", value: state.stats.authorized, icon: ShieldCheck, detail: "Registered and currently active", color: "green" },
    { label: "Unknown identities", value: state.stats.unknown, icon: Radar, detail: "Denied · not registered", color: "amber" },
    { label: "Active incidents", value: state.stats.activeIncidents, icon: ShieldOff, detail: `${state.stats.incidents} investigations recorded`, color: "red" },
    { label: "Behavioral anomalies", value: state.stats.anomalies, icon: Fingerprint, detail: "Explainable rule findings", color: "cyan" },
    { label: "Memory events", value: state.stats.memoryEvents, icon: Layers, detail: "Blocked writes & integrity alerts", color: "amber" },
    { label: "Honeypot triggers", value: state.stats.trapTriggers, icon: Ghost, detail: `${state.traps.filter(t => t.active).length} active deception resources`, color: "green" },
    { label: "Quarantined agents", value: state.stats.quarantined, icon: Shield, detail: `${state.stats.blocked} operations blocked`, color: "red" }
  ];
  return <div className="metrics">{metrics.map(({ label, value, icon: Icon, detail, color }) => <div className="metric" key={label}><div className="metric-label">{label}<Icon size={15} /></div><div className={`metric-value ${value && color === "red" ? "red-text" : ""}`}>{String(value).padStart(2, "0")}<span className={`metric-mini ${color}`}><Activity size={22} strokeWidth={1} /></span></div><small>{detail}</small></div>)}</div>;
}
export function AgentNetwork({ state, deception = false }: { state: State; deception?: boolean }) {
  const actors = state.agents;
  return <div className={`network-view ${deception ? "deception" : ""}`}>
    <div className="network-grid" /><svg className="network-lines" viewBox="0 0 640 315" preserveAspectRatio="none" aria-hidden="true"><path d="M150 75 C220 75 230 158 320 158 M150 158 L320 158 M150 242 C220 242 230 158 320 158 M320 158 C410 158 420 75 505 75 M320 158 L505 158 M320 158 C410 158 420 242 505 242" /></svg>
    <span className="network-label">{deception ? "MONITORED IDENTITIES" : "AUTHORIZED IDENTITIES"}</span><span className="network-label right">{deception ? "DECEPTION RESOURCES" : "SECURITY BOUNDARIES"}</span>
    <div className="network-actors">{actors.map(a => <div className={`network-node ${a.status !== "active" ? "node-alert" : ""}`} key={a.id}><span className="node-icon">{a.id === "research" ? <Fingerprint size={18} /> : a.id === "operations" ? <Network size={18} /> : <Radar size={18} />}</span><div><strong>{a.name}</strong><small><i className={a.status === "active" ? "online-dot" : "alert-dot"} />{a.status === "active" ? "Registered · active" : a.status}</small></div></div>)}</div>
    <div className="gateway-node"><div className="gateway-ring"><GhostMark size={34} /></div><strong>GHOST OPS</strong><small>Enforcing gateway</small><span>{state.stats.requests} requests evaluated</span></div>
    <div className="network-boundaries">{(deception ? state.traps.map(t => ({ name: t.name, count: t._count.interactions, status: t._count.interactions ? "Interaction recorded" : "Armed · synthetic" })) : [{ name: "Identity & permissions", count: state.stats.blocked, status: `${state.stats.blocked} requests denied` }, { name: "Memory integrity", count: state.stats.memoryEvents, status: "Signed version history" }, { name: "Deception network", count: state.stats.trapTriggers, status: `${state.stats.trapTriggers} interactions recorded` }]).map((b, i) => <div className={`boundary-node ${deception && b.count ? "node-alert" : ""}`} key={b.name}><span className="node-icon">{i === 0 ? <Shield size={17} /> : i === 1 ? <Layers size={17} /> : <Ghost size={17} />}</span><div><strong>{b.name}</strong><small>{b.status}</small></div></div>)}</div>
    <div className="network-bottom"><span><i className="online-dot" />Local trust boundary</span><span>All paths pass through policy enforcement</span></div>
  </div>;
}
export function ActivityTable({ events, limit = 12, navigate }: { events: Event[]; limit?: number; navigate?: SectionProps["navigate"] }) {
  const [expanded, expand] = useState<string | null>(null);
  if (!events.length) return <Empty title="Awaiting agent activity" detail="Run Normal Operation to establish behavioral baselines." />;
  return <div className="table-scroll"><table className="activity-table"><thead><tr><th>Sequence / time</th><th>Identity attribution</th><th>Engine</th><th>Observation · click to inspect</th><th>Level</th></tr></thead><tbody>{events.slice(0, limit).map(e => <Fragment key={e.id}><tr><td className="mono muted">#{e.ordinal}<small className="cell-sub">{time(e.createdAt)}</small></td><td><span className={`identity-dot ${e.identityVerified ? "green" : "red"}`} />{e.actorId}<small className="cell-sub">{e.identityVerified ? "Verified / authorized attribution" : "Unverified claim / legacy"}</small></td><td><span className={`module-label module-${e.module.toLowerCase()}`}>{e.module}</span></td><td className="event-message"><button className="event-inspect" aria-expanded={expanded === e.id} onClick={() => expand(expanded === e.id ? null : e.id)}>{e.message}</button></td><td><Badge value={e.severity} /></td></tr>{expanded === e.id && <tr className="event-detail"><td colSpan={5}><div className="evidence-header"><code>{e.kind} · {e.id}</code>{e.incidentId && navigate && <SectionLink onClick={() => navigate("Investigations", e.incidentId!)}>Open linked investigation</SectionLink>}</div><pre className="evidence-json">{JSON.stringify({ sessionId: e.sessionId, requestId: e.requestId, identityVerified: e.identityVerified, simulated: e.simulated, details: e.details }, null, 2)}</pre></td></tr>}</Fragment>)}</tbody></table></div>;
}
export function Overview({ state, navigate }: SectionProps) {
  const latest = state.incidents[0];
  const engines = [
    { name: "AgentDNA", icon: Fingerprint, color: "green", stat: `${state.stats.anomalies} findings`, description: "Behavioral fingerprinting" },
    { name: "ShadowWatch", icon: Radar, color: "cyan", stat: `${state.stats.unknown} unknown`, description: "Identity & access control" },
    { name: "MemoryGuard", icon: ShieldCheck, color: "amber", stat: `${state.stats.memoryEvents} alerts`, description: "Memory integrity protection" },
    { name: "GhostTrap", icon: Ghost, color: "red", stat: `${state.stats.trapTriggers} triggers`, description: "Deception & investigation" }
  ];
  return <>
    <Metrics state={state} />
    <div className="overview-grid"><Panel title="Agent network" eyebrow="OBSERVE → VERIFY → ENFORCE" action={<span className="live-pill"><i />Persisted topology</span>}><AgentNetwork state={state} /></Panel>
      <Panel title="Investigation posture" action={<Shield size={17} className="muted" />} className="posture-panel"><div className={`posture-summary ${latest?.severity === "critical" ? "danger" : ""}`}><div className="posture-icon">{latest ? <Shield size={28} /> : <ShieldCheck size={28} />}</div><div><span className="eyebrow">CURRENT POSTURE</span><h3>{latest?.status === "contained" ? "Threat contained" : latest?.status === "resolved" ? "Investigation resolved" : latest ? "Investigation open" : "Boundaries enforced"}</h3><p>{latest ? `${state.stats.blocked} operations blocked. ${state.actions.filter(a => a.action !== "restore").length} containment actions recorded.` : "Authorized activity is observed. Sensitive operations fail closed."}</p></div></div>
        {latest ? <button className="latest-incident" onClick={() => navigate("Investigations", latest.id)}><div><Badge value={latest.severity} /><span className="mono">INC-{latest.id.slice(0, 6).toUpperCase()}</span></div><h4>{latest.title}</h4><p>{latest.actorId} · {latest.evidence.length} evidence references</p><div className="incident-status"><Badge value={latest.status} /><ArrowUpRight size={16} /></div></button> : <div className="quiet-state"><CheckCheck size={20} /><div>No open investigations<small>Ready to observe authorized agents</small></div></div>}
        <div className="posture-footer"><span><i className="online-dot" />Deterministic response policies</span><SectionLink onClick={() => navigate("Investigations")}>Investigate</SectionLink></div>
      </Panel></div>
    <div className="engine-cards">{engines.map(({ name, icon: Icon, color, stat, description }) => <button className="engine-card" key={name} onClick={() => navigate(name)}><span className={`engine-icon ${color}`}><Icon size={21} strokeWidth={1.6} /></span><div><h3>{name}<ChevronRight size={14} /></h3><p>{description}</p><span><i className="online-dot" />Active <b>{stat}</b></span></div></button>)}</div>
    <Panel title="Recent enforcement decisions" eyebrow="GENUINE GATEWAY RECEIPTS"><ActivityTable events={state.events.filter(e => e.module === "Gateway")} limit={5} navigate={navigate} /></Panel>
    <Panel title="Live activity" eyebrow="RECENT OBSERVATIONS" action={<SectionLink onClick={() => navigate("AgentDNA")}>View behavior</SectionLink>}><ActivityTable events={state.events} navigate={navigate} /><div className="table-footer"><span><i className="online-dot" />Every observation is a persisted backend record</span><span>{state.stats.requests} requests · {state.stats.blocked} blocked</span></div></Panel>
  </>;
}
