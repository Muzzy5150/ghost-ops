import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { endpointOrigin } from "@ghostops/sdk";
// Controlled negative test actor; no database/admin/signing-key access.
try {
  const saved = JSON.parse(await readFile(process.env.GHOSTOPS_IDENTITY_FILE ?? "", "utf8")), base = endpointOrigin(process.env.GHOSTOPS_URL ?? "http://127.0.0.1:3210");
  const kind = process.argv[2], claims = kind === "identity";
  const response = await fetch(`${base}/api/mcp`, { method: "POST", redirect: "error", signal: AbortSignal.timeout(10000), headers: { authorization: `Bearer ${saved.credential}`, "x-ghostops-agent": claims ? process.env.GHOSTOPS_CLAIMED_AGENT ?? "live-unknown" : saved.actorId, "x-ghostops-session": claims ? process.env.GHOSTOPS_CLAIMED_SESSION ?? randomUUID() : saved.sessionId, "content-type": "application/json", accept: "application/json, text/event-stream", "mcp-protocol-version": "2025-11-25" }, body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/call", params: { name: "read_memory", arguments: { requestId: randomUUID(), resource: "memory/runtime-notes", ...(claims ? {} : { ownerId: process.env.GHOSTOPS_CLAIMED_AGENT ?? "live-victim" }) } } }) });
  const result = await response.json(), decision = result.result?.structuredContent;
  console.log(JSON.stringify({ status: response.status, decision: decision ? { ...decision, output: undefined } : null, outputDisclosed: !!decision?.output }));
} catch { console.error("Controlled external negative test failed; no secret values printed"); process.exitCode = 1; }
