"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { budgetsSchema, scenarioNames, scenarios, type LabStart } from "@/lib/lab-contract";
import type { Wire, State } from "@/lib/view-types";
import type { LabSnapshot } from "@/server/lab";
import type { preflightExperiment } from "@/server/preflight";
import { invocationProof } from "@/lib/evaluation-contract";
import LabBenchmarks, { downloadEvidence } from "./lab-benchmarks";

type Props = { state: State; csrf: string; inspectEvent: (id: string) => void; provideEvidence?: (event: Wire<LabSnapshot>["runs"][number]["events"][number]) => void; navigate: (name: string, id?: string) => void };
const modeNames = { offline: "OFFLINE SIMULATION", local: "LIVE LOCAL AGENT · scripted decisions", model: "MODEL REQUESTED · proof pending" };
export default function SecurityLab({ state, csrf, inspectEvent, provideEvidence, navigate }: Props) {
  const [data, setData] = useState<Wire<LabSnapshot>>(), [error, setError] = useState("");
  const [scenario, setScenario] = useState<LabStart["scenario"]>("normal"), [mode, setMode] = useState<LabStart["mode"]>("local"), [agentId, setAgent] = useState("new");
  const [cost, setCost] = useState(false), [containment, setContainment] = useState(false), [busy, setBusy] = useState(false), [selectedId, setSelected] = useState(""), [compareId, setCompare] = useState("");
  const [maxCalls, setCalls] = useState(3), [maxTokens, setTokens] = useState(16000), [timeoutMs, setTimeoutMs] = useState(60000);
  const [variant, setVariant] = useState<LabStart["variant"]>("standard");
  const [approval, setApproval] = useState<{ input: LabStart; receipt: Wire<Awaited<ReturnType<typeof preflightExperiment>>> }>();
  const setup = () => labSetup(scenario, mode, agentId, cost, containment, maxCalls, maxTokens, timeoutMs, variant);
  const lock = useRef(false), retry = useRef<{ path: string; payload: object } | null>(null);
  const refreshVersion = useRef(0);
  const refresh = useCallback(async () => {
    const version = ++refreshVersion.current;
    const response = await fetch("/api/lab", { cache: "no-store", signal: AbortSignal.timeout(8000) });
    const next = await response.json(); if (!response.ok) throw new Error(next.error ?? "Security Lab unavailable; apply the additive migration on a stopped/new instance.");
    if (version === refreshVersion.current) { setData(next); setError(""); }
  }, []);
  useEffect(() => {
    let active = true, timer: ReturnType<typeof setTimeout>;
    async function poll() { try { await refresh(); } catch (e) { if (active) setError((e as Error).message); } if (active) timer = setTimeout(() => void poll(), 2000); }
    void poll(); return () => { active = false; clearTimeout(timer); };
  }, [refresh]);
  const mutate = async (path: string, input: object) => {
    if (lock.current) return;
    lock.current = true; setBusy(true); setError("");
    const payload = { commandId: crypto.randomUUID(), ...input };
    if (retry.current?.path === path) { setError("An earlier command has uncertain delivery. Inspect history before clearing its receipt or starting another run."); lock.current = false; setBusy(false); return; }
    retry.current = { path, payload };
    try {
      const response = await fetch(path, { method: "POST", headers: { "content-type": "application/json", "x-ghostops-csrf": csrf }, body: JSON.stringify(payload), signal: AbortSignal.timeout(15000) });
      const receipt = await response.json(); retry.current = null;
      if (!response.ok) throw new Error(receipt.error ?? "Lab command rejected");
      if (receipt.runId) setSelected(receipt.runId);
      await refresh();
    } catch (e) { setError((e as Error).message); }
    finally { lock.current = false; setBusy(false); }
  };
  const active = data?.runs.find(r => ["queued", "running"].includes(r.status));
  const run = data?.runs.find(r => r.id === selectedId) ?? data?.runs[0];
  const comparison = data?.runs.find(r => r.id === compareId);
  const inspect = (eventId: string) => { const record = run?.events.find(e => e.id === eventId); if (record) provideEvidence?.(record); inspectEvent(eventId); };
  const prepare = async () => {
    if (lock.current) return; lock.current = true; setBusy(true); setError("");
    try { const input = labStart(scenario, mode, agentId, cost, containment, maxCalls, maxTokens, timeoutMs, variant); const response = await fetch("/api/lab/preflight", { method: "POST", headers: { "content-type": "application/json", "x-ghostops-csrf": csrf }, body: JSON.stringify(input) }); if (!response.ok) throw new Error("Preflight denied"); setApproval({ input, receipt: await response.json() }); }
    catch (e) { setError((e as Error).message); } finally { lock.current = false; setBusy(false); }
  };
  const confirm = async () => { if (!approval || JSON.stringify({ ...approval.input, commandId: undefined }) !== JSON.stringify({ ...setup(), commandId: undefined })) { setError("Setup changed; review a fresh preflight"); return; } const input = { ...approval.input, approvalToken: approval.receipt.approvalToken }; setApproval(undefined); await mutate("/api/lab", input); };
  const exportRun = async () => { if (!run) return; try { await downloadEvidence("run", run.id); setError("Downloaded with server-verified local HMAC/hashes. Use evidence:verify independently; host/key compromise is not excluded."); } catch (e) { setError((e as Error).message); } };
  function summary(r: NonNullable<typeof run>) {
    const results = r.results as Record<string, unknown>, proof = r.invocations.filter(invocationProof);
    return <dl className="lab-summary"><div><dt>Origin</dt><dd>{r.mode === "model" && proof.length ? "MODEL-DRIVEN AGENT · verified provider response" : modeNames[r.mode as keyof typeof modeNames]}</dd></div>
      <div><dt>Identity / session</dt><dd>{r.actorId}<br /><code>{r.sessionId}</code></dd></div><div><dt>Status</dt><dd>{r.status}{r.cancelRequested ? " · cancellation requested" : ""}</dd></div>
      <div><dt>Duration</dt><dd>{r.finishedAt ? `${Math.max(0, new Date(r.finishedAt).getTime() - new Date(r.startedAt).getTime())} ms` : "In progress"}</dd></div>
      <div><dt>Requests · allowed / denied</dt><dd>{String(results.requests ?? "pending")} · {String(results.allowed ?? "—")} / {String(results.denied ?? "—")}</dd></div>
      <div><dt>Memory attempts / decoy observations</dt><dd>{String(results.memoryAttempts ?? "—")} / {String(results.honeypotInteractions ?? "—")}</dd></div>
      <div><dt>Observed outcomes</dt><dd>{Array.isArray(results.outcomes) ? results.outcomes.join(" · ") : "Pending persisted evidence"}</dd></div>
      <div><dt>Actual model responses</dt><dd>{proof.length}{proof.length ? ` · ${proof[0].provider} / ${proof[0].model}` : " · inference not claimed"}</dd></div></dl>;
  }
  return <section className="security-lab"><header><span className="eyebrow">ISOLATED AGENT EVALUATION</span><h2>Security Lab</h2><p>Model behavior and gateway enforcement are separate findings. All resources are synthetic; tools remain bounded.</p></header>
    <form onSubmit={e => { e.preventDefault(); if (mode === "model") void prepare(); else { try { void mutate("/api/lab", setup()); } catch { setError("Invalid run budgets"); } } }}>
      <div className="lab-controls"><label>Scenario<select aria-label="Lab scenario" value={scenario} onChange={e => { setScenario(e.target.value as LabStart["scenario"]); retry.current = null; }}>{scenarios.map(s => <option key={s} value={s}>{scenarioNames[s]}</option>)}</select></label>
        <label>Runtime<select aria-label="Lab runtime" value={mode} onChange={e => { setMode(e.target.value as LabStart["mode"]); retry.current = null; }}><option value="offline">Offline simulation · no handlers</option><option value="local">Live local agent · scripted decisions</option><option value="model" disabled={!data?.configuration.ready || !["normal", "prompt-injection", "memory-poisoning"].includes(scenario)}>Model-driven · explicit paid opt-in</option></select></label>
        <label>Identity<select aria-label="Lab identity" value={agentId} onChange={e => { setAgent(e.target.value); retry.current = null; }}><option value="new">New isolated lab identity (recommended)</option>{state.agents.filter(a => !a.simulated && a.status === "active").map(a => <option key={a.id} value={a.id}>{a.name}</option>)}</select></label></div>
      <p>Scenario version: 2.0 · policies remain server-side.</p>{scenario === "benign-edge" && <label>Variation<select aria-label="Scenario variation" value={variant} onChange={e => setVariant(e.target.value as LabStart["variant"])}><option value="standard">Uncommon allowed capabilities</option><option value="alternate-sequence">Additional approved task-list step</option></select></label>}
      <details><summary>Run budgets</summary><div className="lab-controls"><label>Model calls<input aria-label="Model call budget" type="number" min={1} max={8} value={maxCalls} onChange={e => setCalls(Number(e.target.value))} /></label><label>Reported token ceiling<input aria-label="Token budget" type="number" min={1024} max={64000} value={maxTokens} onChange={e => setTokens(Number(e.target.value))} /></label><label>Time (milliseconds)<input aria-label="Time budget" type="number" min={1000} max={180000} value={timeoutMs} onChange={e => setTimeoutMs(Number(e.target.value))} /></label></div><p>Input reservation is conservative, not a billing guarantee. Outputs capped at 600 tokens/call, 12 tool requests/run. No retries.</p></details>
      <p role="status">Model configuration: {data?.configuration.ready ? `enabled / ${data.configuration.provider} / ${data.configuration.model}` : "disabled or incomplete · offline/local modes available"}. Credentials are never shown.</p>
      {mode === "model" && <label><input type="checkbox" checked={cost} onChange={e => setCost(e.target.checked)} />I authorize this bounded model run and provider costs using synthetic inputs.</label>}
      {scenario === "containment" && agentId !== "new" && <label><input type="checkbox" checked={containment} onChange={e => setContainment(e.target.checked)} />Quarantine this selected identity; its existing credentials will be revoked.</label>}
      <div className="lab-actions"><button className="button primary" disabled={busy || !!active || !csrf || (mode === "model" && (!cost || !data?.configuration.ready)) || (scenario === "containment" && agentId !== "new" && !containment)}>{mode === "model" ? "Review model preflight" : "Start experiment"}</button><button className="button" type="button" disabled={busy || !active || !csrf} onClick={() => void mutate("/api/lab/cancel", { runId: active!.id })}>Stop active experiment</button><span>Cancellation stops at safe boundaries; an already dispatched tool can finish.</span></div>
      {approval && <section aria-label="Exact model execution confirmation"><h3>Dry-run preflight · no inference performed</h3><pre>{JSON.stringify({ ...approval.receipt, approvalToken: undefined }, null, 2)}</pre><button type="button" className="button danger" disabled={busy || !!active || !approval.receipt.canExecute} onClick={() => void confirm()}>Confirm exact provider execution</button><button type="button" className="button" onClick={() => setApproval(undefined)}>Discard preflight</button></section>}
    </form>{error && <p role="alert">{error}</p>}
    <div className="lab-controls"><label>Recorded run<select aria-label="Recorded experiment" value={run?.id ?? ""} onChange={e => setSelected(e.target.value)}><option value="" disabled>No experiments yet</option>{data?.runs.map(r => <option key={r.id} value={r.id}>{r.startedAt} · {r.scenario} · {r.status}</option>)}</select></label><label>Compare (read-only)<select aria-label="Compare experiment" value={compareId} onChange={e => setCompare(e.target.value)}><option value="">No comparison</option>{data?.runs.filter(r => r.id !== run?.id).map(r => <option key={r.id} value={r.id}>{r.scenario} · {r.mode} · {r.id.slice(0, 8)}</option>)}</select></label></div>
    {run ? <><h3>{scenarioNames[run.scenario as keyof typeof scenarioNames]} <code>{run.id.slice(0, 8)}</code></h3><div className="lab-comparison">{summary(run)}{comparison && summary(comparison)}</div>
      <p>History inspection is read-only and never replays tool effects. Regression probes are labeled separately from agent decisions.</p>
      <ol className="lab-timeline">{run.observations.map(o => <li key={o.id}><time>{new Date(o.createdAt).toLocaleTimeString()}</time><strong>{o.kind.replaceAll("_", " ")}</strong><span>{o.phase}</span><details><summary>Persisted observation</summary><pre>{JSON.stringify(o.details, null, 2)}</pre></details>{o.eventId && <button className="button" onClick={() => inspect(o.eventId!)}>Inspect event</button>}</li>)}</ol>
      <h3>Gateway, detection and response timeline</h3><ol className="lab-timeline">{run.events.map(e => <li key={e.id}><time>#{e.ordinal} · {new Date(e.createdAt).toLocaleTimeString()}</time><strong>{e.module} / {e.kind}</strong><span>{e.identityVerified ? "verified attribution" : "unverified claim"} · {e.simulated ? "simulation" : "local runtime"}</span><button className="button" onClick={() => inspect(e.id)}>Inspect security evidence</button>{e.incidentId && <button className="button" onClick={() => navigate("Investigations", e.incidentId!)}>Linked incident</button>}</li>)}</ol>
      <h3>Model invocation receipts</h3>{run.invocations.length ? run.invocations.map(i => <details key={i.id}><summary>{i.provenance.toUpperCase()} · {i.status} · {i.provider} / {i.model} · {i.latencyMs ?? "—"} ms</summary><p>Reported model: {i.reportedModel ?? "Not reported"}. Response ID: <code>{i.responseId ?? "Not reported"}</code>. Tokens: {i.inputTokens ?? "unknown"} in / {i.outputTokens ?? "unknown"} out / {i.totalTokens ?? "unknown"} total.</p></details>) : <p>No model inference occurred.</p>}
      <button className="button" disabled={["queued", "running"].includes(run.status)} onClick={() => void exportRun()}>Download experiment evidence</button>
      <div className="lab-actions">{Array.isArray((run.results as Record<string, unknown>).incidents) && ((run.results as Record<string, unknown>).incidents as string[]).map(id => <button className="button" key={id} onClick={() => navigate("Investigations", id)}>Open INC-{id.slice(0, 8)}</button>)}<button className="button" onClick={() => navigate("Runtime sessions", run.actorId)}>Inspect sessions</button><button className="button" onClick={() => navigate("MemoryGuard")}>Memory verification / restoration</button></div>
    </> : <p>No experiments recorded. Start a local normal workflow; it does not reset existing evidence.</p>}
    <LabBenchmarks navigate={navigate} />
  </section>;
}
function labSetup(scenario: LabStart["scenario"], mode: LabStart["mode"], agentId: string, cost: boolean, containment: boolean, maxCalls: number, maxTokens: number, timeoutMs: number, variant: LabStart["variant"]) {
  return { scenario, mode, agentId, scenarioVersion: "2.0" as const, variant: scenario === "benign-edge" ? variant : "standard" as const, confirmModelCost: cost, confirmContainment: containment, budgets: budgetsSchema.parse({ maxCalls, maxTokens, timeoutMs }) };
}
function labStart(...args: Parameters<typeof labSetup>): LabStart { return { commandId: crypto.randomUUID(), ...labSetup(...args) }; }
