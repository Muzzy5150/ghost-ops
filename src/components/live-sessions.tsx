import { Fragment, useState } from "react";
import type { SectionProps } from "./console";
import { Badge, Empty, Panel, SectionLink, shortId, time } from "./ui";

export function LiveSessions({ state, navigate, focusId }: Pick<SectionProps, "state" | "navigate" | "focusId">) {
  const [session, select] = useState("all");
  const [expanded, expand] = useState<string | null>(null);
  const requests = state.runtimeRequests.filter(r => (!focusId || r.actorId === focusId) && (session === "all" || r.sessionId === session)).toReversed();
  const sessions = [...new Set(state.runtimeRequests.filter(r => !focusId || r.actorId === focusId).map(r => r.sessionId))];
  return <Panel title="Local runtime sessions" eyebrow="ACTUAL MCP REQUESTS · STRUCTURED RECEIPTS" action={<label className="inline-select">Session<select aria-label="Filter live runtime session" value={session} onChange={e => select(e.target.value)}><option value="all">All sessions</option>{sessions.map(id => <option key={id} value={id}>{shortId(id)}</option>)}</select></label>}>
    <div className="inline-note">Actual local tool execution is distinct from model inference. Offline clients use scripted decisions; model calls require explicit configuration. Showing up to 120 recent runtime requests.</div>
    {!requests.length ? <Empty title="No local runtime requests yet" detail="Start the server, provision an isolated identity with npm run agent:provision, then run npm run agent:run. Simulation records do not appear here." /> : <div className="table-scroll"><table><thead><tr><th>Time / request</th><th>Bound identity</th><th>Tool / resource</th><th>Enforcement</th><th>Handler receipt</th></tr></thead><tbody>{requests.map(r => {
      const event = state.events.find(e => e.requestId === r.id && e.incidentId);
      return <Fragment key={r.id}><tr><td className="mono">{time(r.createdAt)}<small className="cell-sub">{shortId(r.id)}</small></td><td><button className="text-button" onClick={() => navigate("Agent Registry", r.actorId)}>{r.actorId}</button><small className="cell-sub">{r.identityVerified ? "Credential + session verified" : "Unverified identity claim"}</small></td><td><code>{r.tool}:{r.operation}</code><small className="cell-sub mono">{r.resource}</small></td><td><Badge value={r.allowed ? "authorized" : "blocked"} /><small className="cell-sub">{r.reason}</small></td><td><button className="text-button" aria-expanded={expanded === r.id} onClick={() => expand(expanded === r.id ? null : r.id)}>{r.execution ? "Handler executed · inspect" : "Handler not executed"}</button></td></tr>{expanded === r.id && <tr className="event-detail"><td colSpan={5}><div className="evidence-header"><code>{r.sessionId}</code>{event?.incidentId && <SectionLink onClick={() => navigate("Investigations", event.incidentId!)}>Linked investigation</SectionLink>}</div><pre className="evidence-json">{JSON.stringify({ requestId: r.id, resource: r.resource, sourceDocumentId: r.sourceId, allowed: r.allowed, rule: r.reason, execution: r.execution }, null, 2)}</pre></td></tr>}</Fragment>;
    })}</tbody></table></div>}
  </Panel>;
}
