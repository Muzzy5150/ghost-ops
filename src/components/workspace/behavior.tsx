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
    <div className="table-scroll"><table><thead><tr><th>Capability</th><th>Baseline count</th><th>Permitted</th><th>Denied</th><th>Observed resources</th><th>Difference</th></tr></thead><tbody>{[...new Set([...Object.keys(baseline), ...counts.keys()])].map(tool => { const observed = counts.get(tool); return <tr key={tool}><td><code>{tool}</code></td><td>{baseline[tool] ?? 0}</td><td>{observed?.allowed ?? 0}</td><td className={observed?.blocked ? "red-text" : ""}>{observed?.blocked ?? 0}</td><td>{[...(observed?.resources ?? [])].map(r => <div className="mono" key={r}>{r}</div>)}</td><td className={!baseline[tool] && observed ? "amber-text" : "muted"}>{!baseline[tool] && observed ? "Not in baseline" : "Known baseline tool"}</td></tr>; })}</tbody></table></div>
  </Panel>;
}
