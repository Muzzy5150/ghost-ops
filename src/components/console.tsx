"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Check, X } from "lucide-react";
import type { ManagementCommand } from "@/lib/schemas";
import type { State } from "@/lib/view-types";
import { GhostMark } from "./ui";
import { Workspace } from "./workspace/workspace";

export type RunControl = (action: ManagementCommand["action"], targetId?: string, expectedStep?: number) => Promise<unknown>;
export type SectionProps = { state: State; control: RunControl; busy: boolean; focusId?: string; navigate: (name: string, focusId?: string) => void; inspectEvent?: (id: string) => void; focusIncident?: (id: string) => void };

// Security client: existing bootstrap, CSRF, serial mutations and uncertain retry IDs.
// Window preferences never confer backend authority.
export function Console() {
  const [state, setState] = useState<State | null>(null);
  const [busy, setBusy] = useState(false);
  const [connected, setConnected] = useState(false);
  const [notice, setNotice] = useState<{ message: string; error: boolean } | null>(null);
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
  return <>{state ? <Workspace state={state} busy={busy} connected={connected} control={control} result={result} setResult={setResult} csrf={csrf} /> : <div className="workspace-loading"><GhostMark size={42} /><h1>GHOST OPS</h1><p>Connecting to the local security workspace…</p><button className="button" onClick={() => window.location.reload()}>Reconnect</button></div>}{notice && <div role="status" className={`toast ${notice.error ? "error" : ""}`}>{notice.error ? <X size={18} /> : <Check size={18} />}<span>{notice.message}</span><button aria-label="Dismiss notification" onClick={() => setNotice(null)}><X size={14} /></button></div>}</>;
}
