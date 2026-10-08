"use client";

import { useEffect, useRef, useState } from "react";
import { Pause, Play, Search } from "lucide-react";
import type { Event, State } from "@/lib/view-types";
import { time } from "../ui";

export type EventFilters = { query: string; engine: string; severity: string; actor: string; origin: string };
export function filterEvents(events: Event[], filters: EventFilters) {
  return events.filter(e => (filters.engine === "all" || e.module === filters.engine) && (filters.severity === "all" || e.severity === filters.severity) && (filters.actor === "all" || e.actorId === filters.actor) && (filters.origin === "all" || e.simulated === (filters.origin === "simulated")) && `${e.id} ${e.actorId} ${e.kind} ${e.message}`.toLowerCase().includes(filters.query.toLowerCase())).toSorted((a, b) => a.ordinal - b.ordinal);
}
export function EventTerminal({ state, inspect }: { state: State; inspect: (id: string) => void }) {
  const [filters, setFilters] = useState<EventFilters>({ query: "", engine: "all", severity: "all", actor: "all", origin: "all" });
  const [frozen, freeze] = useState<Event[] | null>(null);
  const [auto, setAuto] = useState(true);
  const [expanded, expand] = useState<string>();
  const log = useRef<HTMLDivElement>(null);
  const events = filterEvents(frozen ?? state.events, filters);
  const latest = events.at(-1)?.ordinal;
  useEffect(() => { if (auto && !frozen && log.current) log.current.scrollTop = log.current.scrollHeight; }, [latest, auto, frozen]);
  const set = (key: keyof EventFilters, value: string) => setFilters(f => ({ ...f, [key]: value }));
  const source = frozen ?? state.events;
  return <div className="event-terminal"><div className="tool-bar terminal-filters"><Search size={13} /><input aria-label="Search event terminal" placeholder="Search recorded events…" value={filters.query} onChange={e => set("query", e.target.value)} />
    <select aria-label="Event engine" value={filters.engine} onChange={e => set("engine", e.target.value)}><option value="all">All engines</option>{[...new Set(source.map(e => e.module))].map(m => <option key={m}>{m}</option>)}</select>
    <select aria-label="Event severity" value={filters.severity} onChange={e => set("severity", e.target.value)}><option value="all">Severity</option>{["info", "low", "medium", "high", "critical"].map(v => <option key={v}>{v}</option>)}</select>
    <select aria-label="Event agent" value={filters.actor} onChange={e => set("actor", e.target.value)}><option value="all">All identities</option>{[...new Set(source.map(e => e.actorId))].map(a => <option key={a}>{a}</option>)}</select>
    <select aria-label="Event provenance" value={filters.origin} onChange={e => set("origin", e.target.value)}><option value="all">All origins</option><option value="simulated">Simulated</option><option value="runtime">Local runtime</option></select>
    <button aria-label={frozen ? "Resume event display" : "Pause event display"} aria-pressed={!!frozen} title={frozen ? "Resume" : "Pause display only"} onClick={() => freeze(frozen ? null : state.events)}>{frozen ? <Play size={14} /> : <Pause size={14} />}</button><label className="auto-scroll"><input type="checkbox" checked={auto} onChange={e => setAuto(e.target.checked)} />Follow</label></div>
    <div className="terminal-log" ref={log} aria-label="Persisted security event log">{events.length ? events.map(e => <div key={e.id} className={`log-record severity-${e.severity}`}><button className="log-line" aria-expanded={expanded === e.id} onClick={() => expand(expanded === e.id ? undefined : e.id)}><time>{time(e.createdAt)}</time><span className="log-origin">{e.simulated ? "SIM" : "LOCAL"}</span><span className="log-engine">{e.module}</span><span className="log-actor">{e.actorId}{!e.identityVerified && " [claim]"}</span><span className="log-message">{e.message}</span><span className="log-severity">{e.severity}</span></button>{expanded === e.id && <div className="log-expanded"><code>#{e.ordinal} / {e.kind}</code><p>{e.identityVerified ? "Verified attribution" : "Unverified identity claim"} · session {e.sessionId ?? "not recorded"}</p><button className="button small" onClick={() => inspect(e.id)}>Inspect persisted evidence{e.incidentId ? " / linked case" : ""}</button></div>}</div>) : <div className="terminal-empty">No recorded events match these filters.</div>}</div>
    <div className="terminal-status"><span>{frozen ? "DISPLAY PAUSED · backend polling continues" : "POLLING / 2.5s"}</span><span>{events.length} / {source.length} recent events · chronological</span></div></div>;
}
