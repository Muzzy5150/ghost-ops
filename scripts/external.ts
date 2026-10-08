import { randomBytes, randomUUID } from "node:crypto";
import { constants } from "node:fs";
import { mkdir, open } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { enrollmentSchema, rotationSchema, integrationSchema } from "../src/lib/runtime-contract";
import { localAdmin, localBase } from "../src/runtime/client";
const args = process.argv.slice(2), value = (flag: string, fallback: string) => args.includes(flag) ? args[args.indexOf(flag) + 1] : fallback;
const actorId = enrollmentSchema.shape.actorId.parse(value("--id", "live-external-research")), base = localBase();
try {
  const action = value("--action", "inspect"), headers = await localAdmin(base);
  if (["provision", "rotate", "restore"].includes(action)) {
    const path = resolve(value("--output", `.ghostops/external/${actorId}-${action}.json`)); await mkdir(dirname(path), { recursive: true, mode: 0o700 });
    let file, input;
    try {
      file = await open(path, constants.O_RDWR | constants.O_CREAT | constants.O_EXCL | constants.O_NOFOLLOW, 0o600);
      const common = { commandId: randomUUID(), actorId, credential: randomBytes(32).toString("hex") }, role = value("--role", "research");
      const defaults = role === "observer" ? { tools: ["status:read"], resources: ["infra/status"] } : { tools: ["documents:read", "documents:ingest", "summarize:write", "status:read", "memory:read", "memory:write"], resources: ["docs/research", "docs/untrusted", "runtime/tasks", "research/summary", "infra/status", "memory/runtime-policy", "memory/runtime-notes"] };
      const integration = integrationSchema.parse({ name: value("--name", actorId), role, permissions: { tools: value("--tools", defaults.tools.join(",")).split(","), resources: value("--resources", defaults.resources.join(",")).split(","), destinations: [] } });
      input = action === "provision" ? enrollmentSchema.parse({ ...common, integration }) : rotationSchema.parse({ ...common, restore: action === "restore" });
      await file.writeFile(JSON.stringify({ pendingAction: action, input })); await file.sync();
    } catch (error) {
      await file?.close(); file = undefined;
      if (!(error instanceof Error && "code" in error && error.code === "EEXIST")) throw error;
      file = await open(path, constants.O_RDWR | constants.O_NOFOLLOW);
      if ((await file.stat()).size > 16384 || (await file.stat()).mode & 0o077) throw new Error("Unsafe private credential file");
      const pending = JSON.parse(await file.readFile("utf8")); if (pending.pendingAction !== action) throw new Error("Use a new private output path; existing file is not a pending receipt");
      input = action === "provision" ? enrollmentSchema.parse(pending.input) : rotationSchema.parse(pending.input); if (input.actorId !== actorId) throw new Error("Identity mismatch");
    }
    try {
      const response = await fetch(`${base}/api/runtime/${action === "provision" ? "enroll" : "rotate"}`, { method: "POST", headers, body: JSON.stringify(input), redirect: "error", signal: AbortSignal.timeout(15000) }); if (!response.ok) throw new Error("Command denied; retain pending receipt"); const receipt = await response.json();
      const saved = JSON.stringify({ actorId, sessionId: receipt.sessionId, credential: input.credential }); await file.write(saved, 0, "utf8"); await file.truncate(Buffer.byteLength(saved)); await file.sync();
      console.log(JSON.stringify({ action, actorId, sessionId: receipt.sessionId, credentialFile: path, plaintextCredentialPrinted: false }));
    } finally { await file.close(); }
  } else if (["quarantine", "revoke"].includes(action)) {
    const response = await fetch(`${base}/api/control`, { method: "POST", headers, body: JSON.stringify({ commandId: value("--command-id", randomUUID()), action, targetId: actorId }), redirect: "error", signal: AbortSignal.timeout(15000) }); if (!response.ok) throw new Error("Control denied"); console.log(JSON.stringify({ action, actorId, receipt: await response.json() }));
  } else if (action === "inspect") {
    const response = await fetch(`${base}/api/state`, { headers, redirect: "error", signal: AbortSignal.timeout(10000) }); if (!response.ok) throw new Error("Inspection denied"); const state = await response.json(); const agent = state.agents.find((a: { id: string }) => a.id === actorId); if (!agent) throw new Error("Unknown integration");
    console.log(JSON.stringify({ agent, sessions: state.sessions.filter((s: { agentId: string }) => s.agentId === actorId), requests: state.runtimeRequests.filter((r: { actorId: string; identityVerified: boolean }) => r.actorId === actorId && r.identityVerified), incidentIds: state.incidents.filter((i: { actorId: string; identityVerified: boolean }) => i.actorId === actorId && i.identityVerified).map((i: { id: string }) => i.id), connection: "Historical observations; not an online-process assertion" }, null, 2));
  } else throw new Error("Unsupported operator command");
} catch { console.error("External integration command failed; check local operator authorization, bounded capabilities, private output path and current identity. No secrets printed; retain pending receipt after uncertain delivery."); process.exitCode = 1; }
