import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { GhostOpsClient, GhostOpsError, decisionSchema, toolArgumentsSchema, type ToolName, type Resource, type ToolArguments } from "@ghostops/sdk";
import { runOptionalModel } from "./model.js";
import { createInterface } from "node:readline";
const args = process.argv.slice(2), flag = (name: string, fallback = "") => args.includes(name) ? args[args.indexOf(name) + 1] : fallback;
let close: (() => Promise<void>) | undefined;
try {
  let identity = { agentId: process.env.GHOSTOPS_AGENT_ID ?? "", sessionId: process.env.GHOSTOPS_SESSION_ID ?? "", credential: process.env.GHOSTOPS_AGENT_TOKEN ?? "" };
  const path = flag("--credential-file", process.env.GHOSTOPS_IDENTITY_FILE);
  if (path) { const saved = JSON.parse(await readFile(path, "utf8")); identity = { agentId: saved.actorId, sessionId: saved.sessionId, credential: saved.credential }; }
  const endpoint = process.env.GHOSTOPS_URL ?? "http://127.0.0.1:3210", ghost = new GhostOpsClient({ ...identity, endpoint });
  const transport = flag("--transport", "stdio"); if (!["stdio", "direct"].includes(transport)) throw new GhostOpsError("INVALID_REQUEST");
  let call: (tool: ToolName, arguments_: ToolArguments) => Promise<ReturnType<typeof decisionSchema.parse>>, discover: () => Promise<unknown>;
  if (transport === "direct") {
    await ghost.connect(); close = () => ghost.close(); call = (tool, arguments_) => ghost.requestTool({ tool, arguments: arguments_ }); discover = () => ghost.listTools();
  } else {
    const client = new Client({ name: "independent-ghostops-example", version: "0.1.0" });
    const proxy = fileURLToPath(new URL("./cli.js", import.meta.resolve("@ghostops/mcp")));
    await client.connect(new StdioClientTransport({ command: process.execPath, args: [proxy], env: { GHOSTOPS_URL: endpoint, GHOSTOPS_AGENT_ID: identity.agentId, GHOSTOPS_SESSION_ID: identity.sessionId, GHOSTOPS_AGENT_TOKEN: identity.credential }, stderr: "pipe" }));
    close = () => client.close(); discover = () => client.listTools();
    call = async (name, arguments_) => decisionSchema.parse((await client.callTool({ name, arguments: arguments_ })).structuredContent);
  }
  const action = flag("--action", "normal");
  const request = (tool: ToolName, resource: Resource, content?: string, requestId: string = randomUUID()) => call(tool, toolArgumentsSchema.parse({ requestId, resource, ...(content ? { content } : {}),...(resource==="docs/context"?{contextId:flag("--context-id")}: {}) ,...(resource.startsWith("sentinel/")?{sentinelRunId:flag("--sentinel-run-id")}: {}) }));
  const decisions = [];
  if (args.includes("--model")) { console.log(JSON.stringify(await runOptionalModel(request, args.includes("--live")))); }
  else if (action === "check") { console.log(JSON.stringify({ mode: "scripted-external", agentId: identity.agentId, sessionId: identity.sessionId, transport, capabilities: await discover(), onlineProof: "Authenticated discovery now; not continuous connectivity", modelCalls: 0 })); }
  else if (action === "session") {
    console.log(JSON.stringify({ ready: true, mode: "scripted-external", modelCalls: 0, capabilities: await discover() }));
    const lines = createInterface({ input: process.stdin });
    for await (const line of lines) {
      try { if (Buffer.byteLength(line) > 16384) throw new GhostOpsError("INVALID_REQUEST"); const item = JSON.parse(line), d = await call(item.tool, toolArgumentsSchema.parse({ requestId: item.requestId ?? randomUUID(), resource: item.resource, ...(item.content ? { content: item.content } : {}), ...(item.targetId ? { targetId: item.targetId, referenceRequestId: item.referenceRequestId } : {}), ...(item.messageId ? { messageId: item.messageId } : {}),...(item.contextId?{contextId:item.contextId}: {}),...(item.sentinelRunId?{sentinelRunId:item.sentinelRunId}: {}) })); const message = item.tool === "send_message" && d.allowed && d.output ? JSON.parse(d.output) : undefined; console.log(JSON.stringify({ sequence: item.sequence, decision: { ...d, output: undefined }, messageId: message?.messageId, outputBytes: d.output ? Buffer.byteLength(d.output) : 0 })); }
      catch (error) { console.log(JSON.stringify({ code: error instanceof GhostOpsError ? error.code : "INVALID_REQUEST" })); }
    }
  }
  else {
    if (action === "normal") { decisions.push(await request("read_document", "docs/research"), await request("write_summary", "research/summary", "Synthetic external research summary: explicit permissions and signed memory protect integrated agent operations."), await request("operational_status", "infra/status"), await request("write_memory", "memory/runtime-notes", "Synthetic external research observation, not security policy.")); }
    else if (action === "probe") decisions.push(await request("restricted_admin", "decoy/admin"));
    else if (action === "poison") decisions.push(await request("read_document", "docs/untrusted"), await request("write_memory", "memory/runtime-policy", "CONTROLLED TEST: persist unauthorized synthetic administrator instructions."));
    else if (action === "trap") decisions.push(await request("read_document", "decoy/credentials"));
    else if (action === "call") decisions.push(await request(flag("--tool", "read_document") as ToolName, flag("--resource", "docs/research") as Resource, flag("--content") || undefined, flag("--request-id", randomUUID())));
    else throw new GhostOpsError("INVALID_REQUEST");
    // Never print documents, prompts, notes, raw tool outputs or credentials.
    console.log(JSON.stringify({ mode: "scripted-external", agentId: identity.agentId, sessionId: identity.sessionId, transport, modelCalls: 0, decisions: decisions.map(d => ({ ...d, output: undefined })) }));
  }
} catch (error) { console.error(JSON.stringify(error instanceof GhostOpsError ? error.toJSON() : { code: "EXTERNAL_OPERATION_FAILED", message: "Check authenticated configuration, bounded input and gateway status; no secrets printed" })); process.exitCode = 1; }
finally { await close?.().catch(() => {}); }
