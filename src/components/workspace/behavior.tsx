import { useState } from "react";
import type { Counts } from "@/lib/schemas";
import type { Agent, State } from "@/lib/view-types";
import { Panel, shortId } from "../ui";

export function SessionComparison({ state, agent }: { state: State; agent: Agent }) {
  const [session, setSession] = useState("all");
  const observations = state.events.filter(e => e.actorId === agent.id && e.identityVerified && e.simulated === agent.simulated && e.module === "Gateway" && e.requestId);
  const sessions = [...new Set(observations.map(e => e.sessionId).filter((id): id is string => !!id))];
  const counts = new Map<string, { allowed: number; blocked: number; resources: Set<string> }>();
  for (const event of observations.filter(e => session === "all" || e.sessionId === session)) {
    const d = event.details as Record<string, unknown>;
    const historical = state.runtimeRequests.find(r => r.id === event.requestId);
    const tool = typeof d.tool === "string" ? `${d.tool}:${d.operation}` : historical ? `${historical.tool}:${historical.operation}` : "";
    const resource = typeof d.resource === "string" ? d.resource : historical?.resource;
    if (!tool) continue;
    const row = counts.get(tool) ?? { allowed: 0, blocked: 0, resources: new Set<string>() };
    if (d.allowed === true && event.kind !== "REPLAY_ACCESS_DENIED") row.allowed++; else row.blocked++;
    if (resource) row.resources.add(resource);
    counts.set(tool, row);
  }
  const baseline = (agent.profile?.tools ?? {}) as Counts;
  return <Panel title="Session comparison" eyebrow="VERIFIED REQUESTS VS TRUSTED BASELINE" action={<select aria-label="Compare behavioral session" value={session} onChange={e => setSession(e.target.value)}><option value="all">All recent sessions</option>{sessions.map(id => <option key={id} value={id}>session {shortId(id)}</option>)}</select>}>
    <div className="inline-note">Baseline counts are historical trusted observations. Session counts are a bounded recent view, not comparable exposure windows or compromise probabilities. Replay denials are separate enforcement observations.</div>
    <div className="behavior-comparison">{[...new Set([...Object.keys(baseline), ...counts.keys()])].map(tool => {
      const observed = counts.get(tool), trusted = baseline[tool] ?? 0, allowed = observed?.allowed ?? 0, denied = observed?.blocked ?? 0;
      const baselineMax = Math.max(1, ...Object.values(baseline)), observedMax = Math.max(1, ...[...counts.values()].map(v => v.allowed + v.blocked));
      return <article className={denied ? "behavior-capability denied" : "behavior-capability"} key={tool}><header><code>{tool}</code><span>{!trusted && observed ? "NEW TO BASELINE" : "KNOWN CAPABILITY"}</span></header>
        <div className="behavior-lanes"><div><label>Trusted baseline <b>{trusted}</b></label><div className="behavior-track"><i style={{ width: `${trusted / baselineMax * 100}%` }} /></div><small>historical trusted observations</small></div><div><label>Observed requests <b>{allowed + denied}</b></label><div className="behavior-track observed"><i style={{ width: `${allowed / observedMax * 100}%` }} /><i className="denied-segment" style={{ width: `${denied / observedMax * 100}%` }} /></div><small>{allowed} permitted / {denied} denied · bounded recent sessions</small></div></div>
        <details><summary>{observed?.resources.size ?? 0} observed resource destinations</summary>{[...(observed?.resources ?? [])].map(r => <code className="behavior-resource" key={r}>{r}</code>)}</details>
      </article>;
    })}{!counts.size && <p className="terminal-empty">No authenticated request records in this session window.</p>}</div>
  </Panel>;
}
