"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Activity, ArrowRight, BookOpen, Check, ChevronRight, CircleHelp, Fingerprint, Ghost, LayoutDashboard, Menu, Network, Play, Radar, Search, Shield, ShieldCheck, Terminal, X, Zap } from "lucide-react";
import type { ManagementCommand } from "@/lib/schemas";
import type { State } from "@/lib/view-types";
import { GhostMark } from "./ui";
import { Overview, ActivityTable } from "./overview";
import { AgentRegistry, AgentDNA, ShadowWatch, MemoryGuard, GhostTrap, Investigations, DemoControl } from "./sections";

const sections = [
  { name: "Overview", icon: LayoutDashboard, group: "WORKSPACE" },
  { name: "Agent Registry", icon: Network },
  { name: "AgentDNA", icon: Fingerprint, group: "DETECTION ENGINES", dot: "green" },
  { name: "ShadowWatch", icon: Radar, dot: "cyan" },
  { name: "MemoryGuard", icon: ShieldCheck, dot: "amber" },
  { name: "GhostTrap", icon: Ghost, dot: "red" },
  { name: "Investigations", icon: Search, group: "OPERATIONS" },
  { name: "Demo Control", icon: Terminal }
];
const descriptions: Record<string, string> = {
  Overview: "A clear view of your agents. Every action, every trust boundary.",
  "Agent Registry": "Known identities, explicit permissions, observable sessions.",
  AgentDNA: "Learn the routine. Investigate the deviation.",
  ShadowWatch: "Verify identity. Enforce access. Contain suspicious behavior.",
  MemoryGuard: "Signed provenance and version history for persistent agent memory.",
  GhostTrap: "Synthetic deception resources. Real investigative evidence.",
  Investigations: "Follow the evidence across identity, behavior, memory, and deception.",
  "Demo Control": "An isolated proving ground for agent security. No external actions."
};
export type RunControl = (action: ManagementCommand["action"], targetId?: string, expectedStep?: number) => Promise<unknown>;
export type SectionProps = { state: State; control: RunControl; busy: boolean; focusId?: string; navigate: (name: string, focusId?: string) => void };

export function Console() {
  const [section, setSection] = useState("Overview");
  const [focusId, setFocusId] = useState<string | undefined>();
  const [state, setState] = useState<State | null>(null);
  const [busy, setBusy] = useState(false);
  const [connected, setConnected] = useState(false);
  const [notice, setNotice] = useState<{ message: string; error: boolean } | null>(null);
  const [menu, setMenu] = useState(false);
  const [help, setHelp] = useState(false);
  const [search, setSearch] = useState("");
  const [result, setResult] = useState<unknown>(null);
  const [csrf, setCsrf] = useState("");
  const refreshVersion = useRef(0);
  const mutationLock = useRef(false);
  const retryCommand = useRef<{ commandId: string; action: string; targetId?: string; expectedStep?: number } | null>(null);
  const refresh = useCallback(async () => {
    const version = ++refreshVersion.current;
    const response = await fetch("/api/state", { cache: "no-store", signal: AbortSignal.timeout(8000) });
    if (!response.ok) throw new Error("Local backend unavailable. Run npm run setup if the database is not initialized.");
    const snapshot = await response.json();
    if (version === refreshVersion.current) { setState(snapshot); setConnected(true); }
  }, []);
  useEffect(() => {
    let active = true;
    let ready = false;
    async function connect() {
      try {
        const response = await fetch("/api/bootstrap", { cache: "no-store" });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error);
        setCsrf(data.csrf);
        ready = true;
        if (active) await refresh();
      } catch (error) { if (active) { setConnected(false); setNotice({ message: (error as Error).message, error: true }); } }
    }
    void connect();
    let timer: ReturnType<typeof setTimeout>;
    const poll = async () => {
      if (active && ready) try { await refresh(); } catch { if (active) setConnected(false); }
      if (active) timer = setTimeout(() => void poll(), 2500);
    };
    timer = setTimeout(() => void poll(), 2500);
    return () => { active = false; clearTimeout(timer); };
  }, [refresh]);
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(null), notice.error ? 9000 : 4500);
    return () => clearTimeout(timer);
  }, [notice]);
  useEffect(() => {
    if (!help && !menu) return;
    const escape = (event: KeyboardEvent) => { if (event.key === "Escape") { setHelp(false); setMenu(false); } };
    window.addEventListener("keydown", escape);
    return () => window.removeEventListener("keydown", escape);
  }, [help, menu]);
  useEffect(() => {
    if (!help) return;
    const previous = document.activeElement as HTMLElement | null;
    const dialog = document.querySelector<HTMLElement>('[role="dialog"][aria-label="Trust boundaries"]');
    const buttons = dialog?.querySelectorAll<HTMLButtonElement>("button:not(:disabled)");
    const first = buttons?.[0], last = buttons?.[buttons.length - 1];
    first?.focus();
    const trap = (event: KeyboardEvent) => {
      if (event.key !== "Tab") return;
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    };
    dialog?.addEventListener("keydown", trap);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { dialog?.removeEventListener("keydown", trap); document.body.style.overflow = previousOverflow; previous?.focus(); };
  }, [help]);
  const navigate = (name: string, id?: string) => { setSection(name); setFocusId(id); setMenu(false); setSearch(""); };
  const control = useCallback<RunControl>(async (action, targetId, expectedStep) => {
    if (mutationLock.current) return null;
    mutationLock.current = true;
    setBusy(true);
    try {
      const prior = retryCommand.current;
      const payload = prior?.action === action && prior.targetId === targetId && prior.expectedStep === expectedStep ? prior : { commandId: crypto.randomUUID(), action, ...(targetId ? { targetId } : {}), ...(expectedStep !== undefined ? { expectedStep } : {}) };
      retryCommand.current = payload;
      const response = await fetch("/api/control", { method: "POST", headers: { "Content-Type": "application/json", "X-Ghostops-CSRF": csrf }, body: JSON.stringify(payload), signal: AbortSignal.timeout(30000) });
      const data = await response.json();
      retryCommand.current = null;
      if (!response.ok) throw new Error(data.error ?? "Operation failed");
      setResult(data.result);
      await refresh();
      const failedIntegrity = action === "verify-memory" && data.result?.valid === false;
      setNotice({ message: failedIntegrity ? "Integrity verification failed · tamper evidence recorded" : `${action.replaceAll("-", " ")} completed · persisted receipt recorded`, error: failedIntegrity });
      return data.result;
    } catch (error) { setNotice({ message: (error as Error).message, error: true }); return null; }
    finally { mutationLock.current = false; setBusy(false); }
  }, [csrf, refresh]);
  const props = { state: state!, busy, control, navigate, focusId };
  const searchResults = state && search.trim() ? state.events.filter(e => `${e.actorId} ${e.module} ${e.kind} ${e.message}`.toLowerCase().includes(search.toLowerCase())).slice(0, 30) : null;
  return <div className="app-shell">
    <a className="skip-link" href="#main">Skip to content</a>
    {menu && <button className="sidebar-overlay" aria-label="Close navigation" onClick={() => setMenu(false)} />}
    <aside className={`sidebar ${menu ? "open" : ""}`}>
      <button className="brand" onClick={() => navigate("Overview")}><GhostMark size={30} /><span>GHOST<span className="brand-ops">OPS</span><small>AGENT COUNTERINTELLIGENCE</small></span></button>
      <div className="workspace-select"><span className="workspace-icon"><Shield size={16} /></span><div>Local workspace<small>Isolated environment</small></div><ChevronRight size={15} /></div>
      <nav aria-label="Main navigation">{sections.map(({ name, icon: Icon, group, dot }) => <div key={name}>{group && <p className="nav-group">{group}</p>}<button className={`nav-item ${section === name ? "selected" : ""}`} aria-current={section === name ? "page" : undefined} onClick={() => navigate(name)}><Icon size={18} /><span>{name}</span>{dot && <i className={`engine-dot ${dot}`} />}{name === "Investigations" && !!state?.stats.activeIncidents && <b className="nav-count">{state.stats.activeIncidents}</b>}</button></div>)}</nav>
      <div className="sidebar-bottom"><div className="boundary-note"><ShieldCheck size={17} /><div>Contained by design<small>Synthetic resources only</small></div></div><button className="sidebar-help" onClick={() => setHelp(true)}><BookOpen size={16} />Trust boundaries<ArrowRight size={14} /></button><div className="operator"><span>LO</span><div>Local operator<small>Administrator · loopback only</small></div><span className="online-dot" /></div></div>
    </aside>
    <div className="main-shell"><header className="topbar"><div className="breadcrumb"><button className="icon-button mobile-menu" aria-label="Open navigation" onClick={() => setMenu(true)}><Menu size={20} /></button><span>Workspace</span><ChevronRight size={13} /><strong>{section}</strong></div><div className="topbar-right"><span className={`connection ${connected ? "" : "offline"}`}><i />{connected ? "System online" : "Connecting"}</span><span className="env-pill">{state?.mode === "local-runtime-and-simulation" ? "LOCAL MCP + DEMO" : "LOCAL SIMULATION"}</span><button className="icon-button" aria-label="About trust boundaries" onClick={() => setHelp(true)}><CircleHelp size={18} /></button></div></header>
      <main id="main"><div className="page-heading"><div><div className="eyebrow page-eyebrow"><span className="tiny-line" />AUTONOMOUS AGENT SECURITY</div><h1>{section === "Overview" ? "Operations overview" : section === "GhostTrap" ? "Deception network" : section}</h1><p>{descriptions[section]}</p></div><button className="button primary" onClick={() => navigate("Demo Control")}><Play size={14} fill="currentColor" />Run simulation</button></div>
        <div className="context-strip"><span><ShieldCheck size={14} />Policy enforcement active</span><span><i className="online-dot" />4 detection engines</span><span className="context-end">{busy ? <><Activity size={14} className="spin" />Processing secure transaction…</> : <><Activity size={14} />{state ? `${state.stats.requests} observed requests` : "Awaiting backend"}</>}</span></div>
        {!state ? <div className="loading-state"><GhostMark size={48} /><h2>Connecting to the local operations centre</h2><p>Loading agent identities, policies, and signed memory.</p><button className="button" onClick={() => window.location.reload()}>Reconnect</button></div> : <>
          {section !== "Demo Control" && <div className="section-toolbar"><div className="view-label"><span className="online-dot" />Live observations <small>refreshes every 2.5s</small></div><label className="search-input"><Search size={15} /><input aria-label="Search activity" placeholder="Search agent activity…" value={search} onChange={e => setSearch(e.target.value)} /><kbd>⌕</kbd></label></div>}
          {searchResults ? <div className="panel"><div className="panel-heading"><h2>Activity matching “{search}”</h2><span className="muted">{searchResults.length} results in recent observations</span></div><ActivityTable events={searchResults} limit={30} /></div> : <>
            {section === "Overview" && <Overview {...props} />}
            {section === "Agent Registry" && <AgentRegistry key={focusId ?? "registry"} {...props} />}
            {section === "AgentDNA" && <AgentDNA key={focusId ?? "dna"} {...props} />}
            {section === "ShadowWatch" && <ShadowWatch {...props} />}
            {section === "MemoryGuard" && <MemoryGuard key={focusId ?? "memory"} {...props} />}
            {section === "GhostTrap" && <GhostTrap {...props} />}
            {section === "Investigations" && <Investigations key={focusId ?? "investigations"} {...props} />}
            {section === "Demo Control" && <DemoControl {...props} result={result} setResult={setResult} />}
          </>}
        </>}
        <footer className="main-footer"><span><Ghost size={13} />GHOST OPS <span className="footer-separator">/</span> Detect the rogue. Trace the behavior. Protect the memory.</span><span>Local MVP <i />v1.0</span></footer>
      </main>
    </div>
    {notice && <div role="status" className={`toast ${notice.error ? "error" : ""}`}>{notice.error ? <X size={18} /> : <Check size={18} />}<span>{notice.message}</span><button aria-label="Dismiss notification" onClick={() => setNotice(null)}><X size={14} /></button></div>}
    {help && <div className="modal-backdrop" onClick={() => setHelp(false)}><section className="modal" role="dialog" aria-modal="true" aria-label="Trust boundaries" onClick={e => e.stopPropagation()}><div className="panel-heading"><h2>Contained by design</h2><button className="icon-button" aria-label="Close trust boundaries" onClick={() => setHelp(false)}><X size={20} /></button></div><ShieldCheck size={35} className="green-text" /><h3>Integrated tools. Enforced boundaries.</h3><p>Identity, permissions, quarantine, correlation and signed memory are enforced server-side. Simulated events and actual local MCP requests are labeled separately.</p><p>The isolated runtime can read approved fixtures, save summaries in a restricted workspace and append signed notes. No shell, arbitrary paths or tool-driven outbound networking exists. Offline decisions are scripted. Optional model inference requires explicit configuration and can send synthetic task/tool content to OpenAI.</p><p>Only integrated tool calls are enforced—not all OS, Codex or Cursor activity. Local machine administration is trusted; this is not public-deployment authentication. A stolen signing key defeats memory signatures. Findings are rule explanations, not threat probabilities.</p><button className="button primary" onClick={() => { setHelp(false); navigate("Demo Control"); }}><Zap size={15} />Explore the demonstration</button></section></div>}
  </div>;
}
