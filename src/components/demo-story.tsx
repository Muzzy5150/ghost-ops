import { useState } from "react";
import { ArrowRight, CheckCheck, RotateCcw, Terminal } from "lucide-react";
import type { SectionProps } from "./console";
import { Badge, Panel, SectionLink } from "./ui";

const steps = ["Establish normal baselines", "Block the rogue identity", "Ingest untrusted document", "Detect deployment escalation", "Reject memory poisoning", "Complete legitimate research", "Correlate decoy + behavior + memory", "Prove containment blocks execution", "Detect isolated memory tampering", "Restore verified historical snapshot"];
export function DemoStory({ state, control, busy, navigate }: SectionProps) {
  const [confirm, setConfirm] = useState(false);
  const run = state.runs.find(r => r.scenario === "guided-story");
  const results = run?.results as { nextStep?: number; steps?: { step: number; label: string; result: unknown }[] } | undefined;
  const next = results?.nextStep ?? 0;
  return <Panel title="The two-minute investigation" eyebrow="NORMAL → DETECTION → CONTAINMENT → VERIFICATION" action={<Badge value={run?.status ?? "info"}>{run ? `${next} / 10 recorded` : "Ready"}</Badge>}>
    <div className="story-intro"><p>Advance one genuine backend transaction at a time. Completed steps are persisted receipts; refresh or restart to resume. No alert animations or external actions.</p><button className="button" disabled={busy} onClick={() => setConfirm(true)}><RotateCcw size={15} />New guided demo</button></div>
    {confirm && <div className="reset-confirm" role="alert"><div><strong>Reset the synthetic environment and start?</strong><p>Removes demonstration records only. Signing key and command receipts remain.</p></div><button className="button" onClick={() => setConfirm(false)}>Cancel</button><button className="button primary" disabled={busy} onClick={async () => { if (await control("reset")) { await control("start-story"); setConfirm(false); } }}>Reset & start</button></div>}
    <ol className="story-steps">{steps.map((label, i) => <li key={label} className={i < next ? "complete" : i === next && run ? "current" : ""}><span>{i < next ? <CheckCheck size={16} /> : String(i + 1).padStart(2, "0")}</span><div><strong>{label}</strong><small>{i < next ? "Backend receipt recorded" : i === next && run ? "Next transaction" : "Not executed"}</small></div></li>)}</ol>
    <div className="control-row">{run && next < 10 && <button className="button primary" disabled={busy} onClick={() => void control("advance-story", run.id, next)}><Terminal size={15} />Execute step {next + 1}<ArrowRight size={15} /></button>}<SectionLink onClick={() => navigate("Investigations", state.incidents.find(i => i.severity === "critical")?.id)}>Inspect investigation</SectionLink><SectionLink onClick={() => navigate("MemoryGuard")}>Verify memory state</SectionLink></div>
    {results?.steps?.length ? <details className="story-receipts"><summary>Inspect {results.steps.length} actual step receipts</summary><pre className="result-json">{JSON.stringify(results.steps, null, 2)}</pre></details> : null}
  </Panel>;
}
