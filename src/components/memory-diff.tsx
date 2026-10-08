"use client";
import { useMemo, useState } from "react";
import { memoryDiff } from "@/lib/memory-diff";

export function MemoryDiff({ before, after, parentVersion, version }: { before: string; after: string; parentVersion?: number; version: number }) {
  const [unified, setUnified] = useState(false);
  const lines = useMemo(() => memoryDiff(before, after), [before, after]);
  const removed = lines.filter(l => l.kind !== "added"), added = lines.filter(l => l.kind !== "removed");
  return <section className="forensic-diff" aria-label="Memory text comparison"><div className="diff-toolbar"><span>{lines.filter(l => l.kind === "added").length} additions / {lines.filter(l => l.kind === "removed").length} deletions</span><button aria-pressed={unified} onClick={() => setUnified(v => !v)}>{unified ? "Side-by-side diff" : "Unified diff"}</button></div>
    {unified ? <div className="memory-diff unified"><div><span>Parent v{parentVersion ?? "—"} → selected v{version}</span>{lines.map((l, i) => <p key={i} className={l.kind}><b>{l.kind === "added" ? "+" : l.kind === "removed" ? "−" : " "}</b>{l.text}</p>)}</div></div> : <div className="memory-diff"><div><span>− Parent version {parentVersion ?? "—"}</span>{removed.length ? removed.map((l, i) => <p key={i} className={l.kind}>{l.text}</p>) : <p>No parent snapshot</p>}</div><div><span>+ Selected version {version}</span>{added.map((l, i) => <p key={i} className={l.kind}>{l.text}</p>)}</div></div>}
    <p className="diff-disclaimer">Text changes are not an attack verdict. Integrity and source trust are verified separately. Comparison is bounded to 160 segments per snapshot; full selected content is shown above.</p>
  </section>;
}
