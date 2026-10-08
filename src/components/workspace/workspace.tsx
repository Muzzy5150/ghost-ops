"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import { Activity, Network, Fingerprint, Radar, ShieldCheck, Ghost, Search, Terminal, Server, LayoutGrid, ScanEye, FileSearch, CircleHelp, RotateCcw, PanelsTopLeft, Play, X, FlaskConical } from "lucide-react";
import { defaultLayout, storageKey, legacyStorageKey, titles, windowIds, workspaceReducer, type WindowId } from "@/lib/workspace-model";
import type { Entity } from "@/lib/workspace-graph";
import type { Incident } from "@/lib/view-types";
import type { SectionProps } from "../console";
import { GhostMark, Badge } from "../ui";
import { AgentRegistry, AgentDNA, ShadowWatch, MemoryGuard, GhostTrap, DemoControl } from "../sections";
import { LiveSessions } from "../live-sessions";
import { WorkWindow } from "./window";
import { AgentInspector, EvidenceInspector } from "./inspectors";
import { EventTerminal } from "./event-terminal";
import { IncidentDesk } from "./incident-desk";

const AgentGraph = dynamic(() => import("./network"), { ssr: false, loading: () => <div className="terminal-empty">Loading recorded network…</div> });
const SecurityLab = dynamic(() => import("./security-lab"), { ssr: false, loading: () => <div className="terminal-empty">Loading Security Lab…</div> });
const icons = { network: Network, events: Terminal, inspector: ScanEye, evidence: FileSearch, overview: Activity, registry: Server, dna: Fingerprint, shadow: Radar, memory: ShieldCheck, traps: Ghost, investigations: Search, runtime: Server, demo: Play, lab: FlaskConical };
const routes: Record<string, WindowId> = { Overview: "overview", "Agent network": "network", "Agent Registry": "registry", AgentDNA: "dna", ShadowWatch: "shadow", MemoryGuard: "memory", GhostTrap: "traps", Investigations: "investigations", "Demo Control": "demo", "Agent inspector": "inspector", Evidence: "evidence", "Runtime sessions": "runtime" };
type Props = Omit<SectionProps, "navigate"> & { connected: boolean; result: unknown; setResult: (result: unknown) => void; csrf?: string };

export function Workspace({ state, busy, control, connected, result, setResult, csrf = "" }: Props) {
  const [layout, dispatch] = useReducer(workspaceReducer, undefined, () => defaultLayout({ width: 1280, height: 760 }));
  const [mobile, setMobile] = useState(false);
  const [active, setActive] = useState<WindowId>("network");
  const [focus, setFocus] = useState<Partial<Record<WindowId, string>>>({});
  const [entity, setEntity] = useState<Entity>();
  const [incidentId, setIncidentId] = useState<string>();
  const [eventId, setEventId] = useState<string>();
  const [labEvidence, setLabEvidence] = useState<Incident["events"][number]>();
  const [launcher, setLauncher] = useState(false);
  const [storageFailed, setStorageFailed] = useState(false);
  const [reduced, setReduced] = useState(false);
  const desktop = useRef<HTMLDivElement>(null), hydrated = useRef(false);
  const launcherElement = useRef<HTMLDivElement>(null);
  const help = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const observer = new ResizeObserver(([entry]) => {
      const bounds = { width: Math.max(1, Math.floor(entry.contentRect.width)), height: Math.max(1, Math.floor(entry.contentRect.height)) };
      const compact = window.matchMedia("(max-width: 900px)").matches;
      setMobile(compact);
      if (!hydrated.current) {
        let raw: string | null = null;
        try { raw = localStorage.getItem(storageKey) ?? localStorage.getItem(legacyStorageKey); } catch { setStorageFailed(true); }
        // Mobile panels do not rewrite desktop geometry or clamp it to a phone screen.
        dispatch({ type: "hydrate", raw, bounds: compact ? { width: 1280, height: 760 } : bounds }); hydrated.current = true;
      } else if (!compact) dispatch({ type: "bounds", bounds });
    });
    if (desktop.current) observer.observe(desktop.current);
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const change = () => setReduced(media.matches); change(); media.addEventListener("change", change);
    return () => { observer.disconnect(); media.removeEventListener("change", change); };
  }, []);
  useEffect(() => {
    if (!hydrated.current) return;
    const timer = setTimeout(() => { try { localStorage.setItem(storageKey, JSON.stringify(layout)); } catch { setStorageFailed(true); } }, 150);
    return () => clearTimeout(timer);
  }, [layout]);
  const open = useCallback((id: WindowId, target?: string) => {
    if (target) setFocus(f => ({ ...f, [id]: target }));
    setActive(id); dispatch({ type: "open", id }); setLauncher(false);
  }, []);
  const focusIncident = useCallback((id: string) => {
    setIncidentId(id); setEventId(undefined);
    const incident = state.incidents.find(i => i.id === id);
    const refs = new Set(incident?.events.map(e => (e.details as Record<string, unknown>).memoryId));
    const memory = state.memories.find(m => refs.has(m.id)) ?? state.memories.find(m => incident?.identityVerified && m.ownerId === incident.actorId);
    setFocus(f => ({ ...f, investigations: id, memory: memory?.id }));
  }, [state]);
  const navigate = useCallback((name: string, id?: string) => {
    const windowId = routes[name]; if (!windowId) return;
    if (windowId === "investigations" && id) focusIncident(id);
    if (windowId === "evidence" && id) setEventId(id);
    open(windowId, id);
  }, [open, focusIncident]);
  const inspectEvent = useCallback((id: string) => { setEntity(undefined); setEventId(id); open("evidence", id); }, [open]);
  const select = useCallback((selected: Entity) => {
    if (selected.kind === "agent") open("inspector", selected.id);
    else if (selected.kind === "incident") navigate("Investigations", selected.id);
    else if (selected.kind === "memory") navigate("MemoryGuard", selected.id);
    else if (selected.id.startsWith("evidence:")) inspectEvent(selected.id.slice(9));
    else { setEntity(selected); setFocus(f => ({ ...f, evidence: "" })); open("evidence"); }
  }, [open, navigate, inspectEvent]);
  useEffect(() => {
    if (!launcher) return;
    const previous = document.activeElement as HTMLElement | null;
    launcherElement.current?.querySelector<HTMLButtonElement>("button")?.focus();
    return () => previous?.focus();
  }, [launcher]);
  useEffect(() => {
    const keyboard = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") { event.preventDefault(); setLauncher(v => !v); }
      if (event.key === "Escape") setLauncher(false);
      if (event.altKey && ["1", "2", "3"].includes(event.key)) { event.preventDefault(); dispatch({ type: "preset", preset: event.key === "1" ? "operations" : event.key === "2" ? "incident" : "lab" }); setActive(event.key === "1" ? "network" : event.key === "2" ? "investigations" : "lab"); }
    };
    window.addEventListener("keydown", keyboard); return () => window.removeEventListener("keydown", keyboard);
  }, []);
  const visible = layout.windows.filter(w => w.open && !w.minimized);
  const top = visible.toSorted((a, b) => b.z - a.z)[0]?.id;
  const mobileActive = visible.some(w => w.id === active) ? active : top;
  const props = { state, control, busy, navigate, inspectEvent, focusIncident };
  const renderTool = (id: WindowId) => {
    const focused = { ...props, focusId: focus[id] };
    switch (id) {
      case "network": return <AgentGraph state={state} layout={reduced ? { ...layout, animations: false } : layout} dispatch={dispatch} incidentId={incidentId} eventId={eventId} select={select} />;
      case "events": return <EventTerminal state={state} inspect={inspectEvent} />;
      case "inspector": return <AgentInspector {...focused} />;
      case "evidence": return <EvidenceInspector {...focused} entity={entity} eventRecord={labEvidence} />;
      case "registry": return <AgentRegistry key={focus[id]} {...focused} />;
      case "dna": return <AgentDNA key={focus[id]} {...focused} />;
      case "shadow": return <ShadowWatch {...focused} />;
      case "memory": return <MemoryGuard key={focus[id]} {...focused} />;
      case "traps": return <GhostTrap {...focused} />;
      case "investigations": return <IncidentDesk key={focus[id]} {...focused} />;
      case "runtime": return <LiveSessions {...focused} />;
      case "demo": return <DemoControl {...props} result={result} setResult={setResult} />;
      case "lab": return <SecurityLab state={state} csrf={csrf} inspectEvent={inspectEvent} provideEvidence={setLabEvidence} navigate={navigate} />;
      case "overview": return <div className="system-brief"><span className="eyebrow">PERSISTED OPERATIONS SUMMARY</span><h3>Integrated-tool enforcement</h3><p>Only authenticated, integrated tools are enforced. Anomaly findings and decoy interest are investigative signals, not proof of compromise.</p><dl>{Object.entries(state.stats).map(([key, value]) => <div key={key}><dt>{key.replace(/([A-Z])/g, " $1")}</dt><dd>{value}</dd></div>)}</dl><p>{state.runtimeCount} actual local runtime requests recorded. Model inference is not implied by tool activity.</p><button className="button" onClick={() => open("runtime")}>Inspect actual MCP receipts</button></div>;
    }
  };
  return <div className={`ops-workbench ${layout.navigationExpanded ? "navigation-expanded" : ""}`}><a className="skip-link" href="#security-desktop">Skip to workspace</a>
    <header className="ops-header"><button className="ops-brand" onClick={() => { dispatch({ type: "preset", preset: "operations" }); setActive("network"); setIncidentId(undefined); setEventId(undefined); }}><GhostMark size={24} /><strong>GHOST<span>OPS</span></strong></button><span className="ops-header-divider" /><span className="ops-workspace-name">{layout.preset === "operations" ? "OPERATIONS" : layout.preset === "incident" ? "INCIDENT ROOM" : "SECURITY LAB"} / LOCAL</span><div className={`ops-connection ${connected ? "online" : "offline"}`}><i />{connected ? "CONNECTED" : "STALE / RECONNECTING"}</div><button className="ops-tool-button" onClick={() => setLauncher(v => !v)} aria-expanded={launcher}><PanelsTopLeft size={14} /><span>Open tool</span><kbd>⌘K</kbd></button><button className="ops-tool-button" aria-label="Trust boundaries and keyboard help" onClick={() => help.current?.showModal()}><CircleHelp size={16} /></button></header>
    <div className="ops-body"><nav className="ops-rail" aria-label="Security tools"><button aria-label="Expand tool navigation" aria-pressed={layout.navigationExpanded} title="Toggle tool names" onClick={() => dispatch({ type: "navigation" })}><PanelsTopLeft size={20} /><span>Tool navigation</span></button>{windowIds.filter(id => !["inspector", "evidence", "overview"].includes(id)).map(id => { const Icon = icons[id]; return <button key={id} aria-label={`Open ${titles[id]}`} aria-pressed={visible.some(w => w.id === id)} title={titles[id]} onClick={() => open(id)}><Icon size={21} /><span>{titles[id]}</span></button>; })}<div className="rail-spacer" /><button title="System overview" aria-label="Open System overview" onClick={() => open("overview")}><Activity size={18} /><span>System overview</span></button></nav>
      <div className="ops-stage"><div className="workspace-toolbar"><div className="workspace-presets" aria-label="Workspace presets"><button aria-pressed={layout.preset === "operations"} onClick={() => { dispatch({ type: "preset", preset: "operations" }); setActive("network"); setIncidentId(undefined); setEventId(undefined); }}><LayoutGrid size={13} />Operations</button><button aria-pressed={layout.preset === "incident"} onClick={() => { dispatch({ type: "preset", preset: "incident" }); setActive("investigations"); if (!incidentId && state.incidents[0]) focusIncident(state.incidents[0].id); }}><Search size={13} />Incident Room</button></div>
        <button className="ops-tool-button" aria-pressed={layout.preset === "lab"} onClick={() => { dispatch({ type: "preset", preset: "lab" }); setActive("lab"); }}><FlaskConical size={13} />Security Lab</button><select aria-label="Focus network investigation" value={incidentId ?? ""} onChange={e => { const id = e.target.value; if (id) focusIncident(id); else { setIncidentId(undefined); setEventId(undefined); } }}><option value="">Relevant recorded relationships</option>{state.incidents.map(i => <option key={i.id} value={i.id}>INC-{i.id.slice(0, 8)} / {i.actorId}</option>)}</select><span className="toolbar-spacer" /><button className="ops-tool-button" title="Auto-arrange current preset" onClick={() => dispatch({ type: "arrange" })}><PanelsTopLeft size={13} /><span>Arrange</span></button><button className="ops-tool-button" title="Reset layout and node positions; backend data unchanged" onClick={() => { dispatch({ type: "reset" }); setActive("network"); }}><RotateCcw size={13} /><span>Reset layout</span></button><label className="motion-toggle"><input type="checkbox" checked={layout.animations && !reduced} disabled={reduced} onChange={() => dispatch({ type: "animations" })} />Motion</label></div>
        <div className="ops-status-strip"><span><i className="online-dot" />{state.stats.registered} registered</span><span>{state.stats.authorized} active identities</span><span className={state.stats.unknown ? "amber-text" : ""}>{state.stats.unknown} unknown</span><span className={state.stats.activeIncidents ? "red-text" : ""}>{state.stats.activeIncidents} active investigations</span><span>{state.stats.quarantined} quarantined</span><span>{state.stats.anomalies} deviations</span><span>{state.stats.memoryEvents} memory alerts</span><span>{state.stats.trapTriggers} decoy interactions</span><button onClick={() => open("events")}>{state.stats.blocked} blocked / {state.stats.requests} requests</button></div>
        <div className="mobile-panel-nav"><label>Active tool<select aria-label="Mobile active tool" value={mobileActive ?? ""} onChange={e => open(e.target.value as WindowId)}><option value="" disabled>Select a tool</option>{windowIds.map(id => <option key={id} value={id}>{titles[id]}</option>)}</select></label></div>
        <div className="security-desktop" id="security-desktop" tabIndex={-1} ref={desktop}>
          {!visible.length && <div className="workspace-empty"><GhostMark size={42} /><h2>Your tools are parked.</h2><p>Open a tool from the rail, task strip or ⌘/Ctrl K.</p><button className="button" onClick={() => dispatch({ type: "reset" })}>Restore Operations layout</button></div>}
          {visible.filter(w => !mobile || w.id === mobileActive).map(win => <WorkWindow key={win.id} window={win} bounds={layout.bounds} mobile={mobile} active={win.id === top} dispatch={dispatch}>{renderTool(win.id)}</WorkWindow>)}
        </div>
        <footer className="workspace-taskbar"><div className="window-tasks" aria-label="Open and minimized tools">{layout.windows.filter(w => w.open).toSorted((a, b) => a.z - b.z).map(w => { const Icon = icons[w.id]; return <button key={w.id} className={top === w.id ? "selected" : ""} aria-label={`${w.minimized ? "Restore" : "Focus"} ${titles[w.id]}`} onClick={() => open(w.id)}><Icon size={12} />{titles[w.id]}{w.minimized && <span>—</span>}</button>; })}</div><small>{busy ? "SECURE TRANSACTION…" : storageFailed ? "Layout storage unavailable · session only" : "LOCAL LAYOUT / v2"}</small></footer>
      </div></div>
    {launcher && <div ref={launcherElement} className="tool-launcher" role="region" aria-label="Tool launcher"><div><strong>Open an operational tool</strong><button className="icon-button" aria-label="Close tool launcher" onClick={() => setLauncher(false)}><X size={16} /></button></div>{windowIds.map(id => { const Icon = icons[id]; return <button key={id} onClick={() => open(id)}><Icon size={16} />{titles[id]}<small>{layout.windows.find(w => w.id === id)?.open ? "Open" : "Hidden"}</small></button>; })}</div>}
    <dialog className="workspace-help" ref={help}><div className="panel-heading"><h2>Integrated tools. Enforced boundaries.</h2><button className="icon-button" aria-label="Close workspace help" onClick={() => help.current?.close()}><X size={18} /></button></div><p>Simulated activity and actual local MCP requests are separately labeled. Only integrated tools are monitored and enforced—not all OS, Codex or Cursor activity. Offline decisions are scripted; model inference must be explicitly configured and verified.</p><p>Permissions, quarantine, correlation and signed memory remain server-side. Layout preferences confer no authority. Local administration is trusted; this is not public-deployment authentication. A stolen signing key defeats memory signatures.</p><h3>Workspace controls</h3><p>Drag title bars; resize edges or corners. Double-click a title to maximize/restore. Focus a title bar and use Alt + arrows to move, Alt + Shift + arrows to resize. Open tools with ⌘/Ctrl K; Alt 1 / Alt 2 selects Operations / Incident Room. Mobile uses the Active tool selector. Network controls support pan, zoom and fit; the entity list offers a non-drag inspection alternative.</p><button className="button primary" onClick={() => { help.current?.close(); open("demo"); }}>Open preserved guided demo</button><Badge value="info">Loopback only / synthetic resources</Badge></dialog>
  </div>;
}
