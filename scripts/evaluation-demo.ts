import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { execFileSync } from "node:child_process";
import { setTimeout as delay } from "node:timers/promises";
import { z } from "zod";
import { labStartSchema, scenarios } from "../src/lib/lab-contract";
import { localAdmin, localBase } from "../src/runtime/client";
import { evidenceZip, readEvidenceZip } from "../src/lib/evidence-zip";
const args = process.argv.slice(2), value = (flag: string, fallback: string) => args.includes(flag) ? args[args.indexOf(flag) + 1] : fallback;
try {
  const mode = z.enum(["local", "offline"]).parse(value("--mode", "local")), base = localBase(), headers = await localAdmin(base);
  const directory = resolve(value("--output", join(".ghostops", "evaluations", randomUUID()))); await mkdir(directory, { recursive: false, mode: 0o700 }).catch(async error => { if (error?.code === "ENOENT") { await mkdir(resolve(directory, ".."), { recursive: true, mode: 0o700 }); await mkdir(directory, { mode: 0o700 }); } else throw error; });
  const index: { scenario: string; runId: string; export: string; results: unknown }[] = [];
  // Containment last: all other stages use their own isolated identities, never an existing actor.
  for (const scenario of [...scenarios.filter(s => s !== "containment"), "containment" as const]) {
    const input = labStartSchema.parse({ commandId: randomUUID(), scenario, mode });
    console.log(`Start ${scenario} (${mode}); command ${input.commandId}. No inference.`);
    const response = await fetch(`${base}/api/lab`, { method: "POST", headers, body: JSON.stringify(input), redirect: "error", signal: AbortSignal.timeout(15000) }); if (!response.ok) throw new Error("Evaluation start rejected");
    const { runId } = await response.json(); let run;
    for (let n = 0; n < 100; n++) { const snapshot = await fetch(`${base}/api/lab`, { headers, redirect: "error", signal: AbortSignal.timeout(10000) }); if (!snapshot.ok) throw new Error("Evaluation read rejected"); run = (await snapshot.json()).runs.find((r: { id: string }) => r.id === runId); if (run && !["queued", "running"].includes(run.status)) break; await delay(200); }
    if (!run || run.status !== "completed" || run.results.verifiedModelCalls !== 0) throw new Error("Evaluation incomplete; no success inferred");
    const responseZip = await fetch(`${base}/api/evidence/run/${runId}`, { headers, redirect: "error", signal: AbortSignal.timeout(15000) }); if (!responseZip.ok) throw new Error("Report denied");
    const path = join(directory, `${scenario}-${runId}.zip`), bytes = Buffer.from(await responseZip.arrayBuffer()); await writeFile(path, bytes, { mode: 0o600, flag: "wx" });
    const verification = JSON.parse(execFileSync(process.execPath, ["--import", "tsx", "scripts/evidence-verify.ts", path], { encoding: "utf8", timeout: 10000 }));
    console.log(`Report ${runId}: hashes valid, local authentication ${verification.authenticated === true ? "verified" : "not available (hashes alone are not origin proof)"}.`);
    index.push({ scenario, runId, export: path, results: run.results });
    if (scenario === "containment" && args.includes("--show-tamper")) {
      const files = readEvidenceZip(bytes); files["events.jsonl"] = Buffer.concat([files["events.jsonl"], Buffer.from("INTENTIONALLY ALTERED LOCAL COPY\n")]); const altered = join(directory, "intentionally-altered-copy.zip"); await writeFile(altered, evidenceZip(files), { mode: 0o600, flag: "wx" });
      let rejected = false; try { execFileSync(process.execPath, ["--import", "tsx", "scripts/evidence-verify.ts", altered], { stdio: "pipe", timeout: 10000 }); } catch { rejected = true; } if (!rejected) throw new Error("Tamper was not detected"); console.log("PASS tampered copy rejected; original database and report unchanged.");
    }
  }
  await writeFile(join(directory, "evaluation-index.json"), JSON.stringify({ formatVersion: 1, mode, inferenceCalls: 0, runs: index }, null, 2), { mode: 0o600, flag: "wx" });
  console.log(`Completed eight isolated stages. Evidence review directory: ${directory}`);
} catch { console.error("Evaluation demo incomplete. Inspect the printed run/command IDs; no automatic effect replay or paid inference. Existing output/data not overwritten."); process.exitCode = 1; }
