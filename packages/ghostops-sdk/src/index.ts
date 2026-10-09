import { randomUUID } from "node:crypto";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { z } from "zod";

export const toolNames = ["read_document", "list_tasks", "write_summary", "operational_status", "read_memory", "write_memory", "restricted_admin", "send_message", "read_inbox", "advisory_lookup", "inspect_repository", "scan_repository", "draft_report", "publish_report", "security_analytics", "incident_search"] as const;
export type ToolName = typeof toolNames[number];
export const resourceNames = ["docs/research", "docs/untrusted", "docs/context", "runtime/tasks", "research/summary", "infra/status", "memory/runtime-notes", "memory/runtime-policy", "decoy/credentials", "decoy/admin", "agents/outbox", "agents/inbox", "decoy/memory", "sentinel/advisories", "sentinel/repository", "sentinel/scan", "sentinel/report", "sentinel/publication", "sentinel/analytics", "sentinel/intelligence"] as const;
export type Resource = typeof resourceNames[number];
export const toolArgumentsSchema = z.object({ requestId: z.string().uuid(), resource: z.enum(resourceNames), content: z.string().min(1).max(4000).optional(), targetId: z.string().regex(/^live-[a-zA-Z0-9_-]{1,48}$/).optional(), referenceRequestId: z.string().uuid().optional(), messageId: z.string().uuid().optional(),contextId:z.string().uuid().optional(),sentinelRunId:z.string().uuid().optional() }).strict();
export type ToolArguments = z.infer<typeof toolArgumentsSchema>;
export const decisionSchema = z.object({ requestId: z.string().uuid(), allowed: z.boolean(), reason: z.string().regex(/^[A-Z_]+$/).max(100), output: z.string().max(16000).nullable(), incidentId: z.string().uuid().nullable(), replayed: z.boolean() }).strict();
export type ToolDecision = z.infer<typeof decisionSchema>;
export type ErrorCode = "AUTHENTICATION_FAILED" | "PERMISSION_DENIED" | "AGENT_QUARANTINED" | "CREDENTIAL_REVOKED" | "GATEWAY_UNAVAILABLE" | "INVALID_REQUEST" | "REQUEST_TIMEOUT" | "CANCELLED" | "UNSUPPORTED_OPERATION" | "REQUEST_CONFLICT" | "TOOL_FAILED";
const messages: Record<ErrorCode, string> = { AUTHENTICATION_FAILED: "Agent credential/session authentication failed", PERMISSION_DENIED: "Current server policy denied this operation", AGENT_QUARANTINED: "Agent is quarantined", CREDENTIAL_REVOKED: "Credential has been revoked", GATEWAY_UNAVAILABLE: "Protected gateway unavailable; no fallback execution", INVALID_REQUEST: "Invalid bounded Ghost Ops request or response", REQUEST_TIMEOUT: "Request timed out; effects may have committed; retain its request ID", CANCELLED: "Request cancelled; already dispatched effects may have committed", UNSUPPORTED_OPERATION: "Unsupported tool operation", REQUEST_CONFLICT: "Request ID conflicts with previously committed input", TOOL_FAILED: "Bounded tool handler failed" };
export class GhostOpsError extends Error {
  constructor(readonly code: ErrorCode, readonly requestId?: string, readonly decision?: ToolDecision) { super(messages[code]); this.name = "GhostOpsError"; }
  toJSON() { return { name: this.name, code: this.code, message: this.message, requestId: this.requestId, reason: this.decision?.reason }; }
}
export function decisionError(d: ToolDecision): GhostOpsError {
  const code: ErrorCode = d.reason === "AGENT_QUARANTINED" ? "AGENT_QUARANTINED" : d.reason === "CREDENTIAL_REVOKED" ? "CREDENTIAL_REVOKED" : ["INVALID_CREDENTIAL", "UNKNOWN_IDENTITY", "SESSION_MISMATCH", "ACTIVITY_ORIGIN_MISMATCH"].includes(d.reason) ? "AUTHENTICATION_FAILED" : d.reason === "TOOL_HANDLER_FAILED" ? "TOOL_FAILED" : "PERMISSION_DENIED";
  return new GhostOpsError(code, d.requestId, d);
}
export function endpointOrigin(raw: string): string {
  try { const u = new URL(raw); if (u.protocol !== "http:" || u.hostname !== "127.0.0.1" || u.username || u.password || u.pathname !== "/" || u.search || u.hash) throw new Error(); return u.origin; } catch { throw new GhostOpsError("INVALID_REQUEST"); }
}
const identitySchema = z.object({ agentId: z.string().regex(/^live-[a-zA-Z0-9_-]{1,48}$/), sessionId: z.string().uuid(), credential: z.string().regex(/^[a-f0-9]{64}$/) }).strict();
export type ClientOptions = z.infer<typeof identitySchema> & { endpoint: string; timeoutMs?: number; logger?: (entry: { event: "connected" | "closed" | "decision" | "error"; requestId?: string; code?: ErrorCode; allowed?: boolean }) => void };
export type RequestOptions = { signal?: AbortSignal; timeoutMs?: number };
const matches: Record<ToolName, readonly Resource[]> = { advisory_lookup:["sentinel/advisories"],inspect_repository:["sentinel/repository"],scan_repository:["sentinel/scan"],draft_report:["sentinel/report"],publish_report:["sentinel/publication"],security_analytics:["sentinel/analytics"],incident_search:["sentinel/intelligence"], read_document: ["docs/research", "docs/untrusted", "docs/context", "decoy/credentials"], list_tasks: ["runtime/tasks"], write_summary: ["research/summary"], operational_status: ["infra/status"], read_memory: ["memory/runtime-notes", "memory/runtime-policy", "decoy/memory"], write_memory: ["memory/runtime-notes", "memory/runtime-policy"], restricted_admin: ["decoy/admin"], send_message: ["agents/outbox"], read_inbox: ["agents/inbox"] };
export function validateTool(name: unknown, raw: unknown): { name: ToolName; arguments: ToolArguments } {
  if (!toolNames.includes(name as ToolName)) throw new GhostOpsError("UNSUPPORTED_OPERATION");
  const result = toolArgumentsSchema.safeParse(raw), writing = name === "write_summary" || name === "write_memory" || name === "send_message" || String(name).includes("_repository") || ["advisory_lookup","draft_report","publish_report","security_analytics","incident_search"].includes(String(name));
  if (!result.success || !matches[name as ToolName].includes(result.data.resource) || writing !== !!result.data.content) throw new GhostOpsError("INVALID_REQUEST");
  const a = result.data;
  const sentinel=String(result.data.resource).startsWith("sentinel/");
  if(sentinel!==!!result.data.sentinelRunId)throw new GhostOpsError("INVALID_REQUEST");
  if ((a.resource === "docs/context") !== !!a.contextId) throw new GhostOpsError("INVALID_REQUEST");
  if (name === "send_message" ? !a.targetId || !a.referenceRequestId || a.messageId : name === "read_inbox" ? !a.messageId || a.targetId || a.referenceRequestId : a.targetId || a.referenceRequestId || a.messageId) throw new GhostOpsError("INVALID_REQUEST");
  return { name: name as ToolName, arguments: result.data };
}
/** Agent-only client. No administrator, enrollment, arbitrary telemetry or alternate tool executor. */
export class GhostOpsClient {
  readonly endpoint: string; readonly agentId: string; readonly sessionId: string;
  #credential: string; #timeout: number; #client?: Client; #connecting?: Promise<void>; #logger?: ClientOptions["logger"]; #activeSignal?: AbortSignal;
  constructor(options: ClientOptions) {
    if (!options || typeof options !== "object" || typeof options.endpoint !== "string" || options.logger !== undefined && typeof options.logger !== "function") throw new GhostOpsError("INVALID_REQUEST");
    const parsed = identitySchema.safeParse({ agentId: options.agentId, sessionId: options.sessionId, credential: options.credential });
    if (!parsed.success) throw new GhostOpsError("INVALID_REQUEST");
    this.endpoint = endpointOrigin(options.endpoint); this.agentId = parsed.data.agentId; this.sessionId = parsed.data.sessionId; this.#credential = parsed.data.credential; this.#logger = options.logger; this.#timeout = this.timeout(options.timeoutMs);
  }
  private timeout(value = 10000) { if (!Number.isInteger(value) || value < 1 || value > 30000) throw new GhostOpsError("INVALID_REQUEST"); return value; }
  private log(entry: Parameters<NonNullable<ClientOptions["logger"]>>[0]) { try { this.#logger?.(entry); } catch { /* Logging cannot change enforcement or leak exception contents. */ } }
  private async perform<T>(operation: (signal: AbortSignal) => Promise<T>, options: RequestOptions = {}): Promise<T> {
    const signal = options.signal ? AbortSignal.any([options.signal, AbortSignal.timeout(this.timeout(options.timeoutMs ?? this.#timeout))]) : AbortSignal.timeout(this.timeout(options.timeoutMs ?? this.#timeout));
    if (signal.aborted) throw new GhostOpsError("CANCELLED");
    if (this.#activeSignal) throw new GhostOpsError("GATEWAY_UNAVAILABLE");
    this.#activeSignal = signal;
    try { return await operation(signal); } catch (error) {
      const safe = error instanceof GhostOpsError ? error : new GhostOpsError(options.signal?.aborted ? "CANCELLED" : signal.aborted || error instanceof Error && error.name === "TimeoutError" ? "REQUEST_TIMEOUT" : "GATEWAY_UNAVAILABLE");
      this.log({ event: "error", code: safe.code }); throw safe;
    } finally { this.#activeSignal = undefined; }
  }
  async connect(options: RequestOptions = {}): Promise<void> {
    if (this.#client) return; if (this.#connecting) return this.#connecting;
    this.#connecting = this.perform(async signal => {
      const client = new Client({ name: "ghostops-developer-sdk", version: "0.1.0" });
      const transport = new StreamableHTTPClientTransport(new URL(`${this.endpoint}/api/mcp`), { requestInit: { headers: { authorization: `Bearer ${this.#credential}`, "x-ghostops-agent": this.agentId, "x-ghostops-session": this.sessionId } }, fetch: async (input, init) => {
        const u = new URL(input);
        if (u.origin !== this.endpoint || u.pathname !== "/api/mcp") throw new GhostOpsError("GATEWAY_UNAVAILABLE");
        const body = typeof init?.body === "string" ? init.body : "";
        if (Buffer.byteLength(body) > 16384) throw new GhostOpsError("INVALID_REQUEST");
        let response = await fetch(input, { ...init, redirect: "error", signal: AbortSignal.any([...(init?.signal ? [init.signal] : []), this.#activeSignal ?? AbortSignal.timeout(this.#timeout)]) });
        // Bound all response bodies, including untrusted error diagnostics, before parsing.
        if (response.body) { const reader = response.body.getReader(), chunks: Uint8Array[] = []; let size = 0; for (;;) { const { done, value } = await reader.read(); if (done) break; size += value.byteLength; if (size > 65536) { await reader.cancel(); throw new GhostOpsError("INVALID_REQUEST"); } chunks.push(value); } response = new Response(Buffer.concat(chunks), { status: response.status, headers: response.headers }); }
        if (!response.ok) {
          if (response.status === 401) { const denied = await response.clone().json().catch(() => ({})); const reason = denied.error; throw new GhostOpsError(reason === "AGENT_QUARANTINED" ? "AGENT_QUARANTINED" : reason === "CREDENTIAL_REVOKED" ? "CREDENTIAL_REVOKED" : "AUTHENTICATION_FAILED"); }
          throw new GhostOpsError(response.status === 409 ? "REQUEST_CONFLICT" : response.status === 400 || response.status === 413 || response.status === 422 ? "INVALID_REQUEST" : "GATEWAY_UNAVAILABLE");
        }
        // Supports the gateway's JSON profile, not an unlimited SSE stream.
        if (response.status === 200 && !response.headers.get("content-type")?.includes("application/json")) throw new GhostOpsError("INVALID_REQUEST");
        return response;
      } });
      try { await client.connect(transport, { signal, timeout: this.#timeout }); this.#client = client; this.log({ event: "connected" }); } catch (error) { await client.close().catch(() => {}); throw error; }
    }, options).finally(() => { this.#connecting = undefined; });
    return this.#connecting;
  }
  async listTools(options: RequestOptions = {}) {
    await this.connect(options); return this.perform(async signal => {
      const result = await this.#client!.listTools(undefined, { signal, timeout: options.timeoutMs ?? this.#timeout });
      if (result.tools.length > toolNames.length || result.tools.some(t => !toolNames.includes(t.name as ToolName))) throw new GhostOpsError("INVALID_REQUEST");
      return result.tools;
    }, options);
  }
  async requestTool(input: { tool: ToolName; arguments: Omit<ToolArguments, "requestId"> & { requestId?: string } }, options: RequestOptions = {}): Promise<ToolDecision> {
    const outer = z.object({ tool: z.string(), arguments: z.unknown() }).strict().safeParse(input); if (!outer.success || !input.arguments || typeof input.arguments !== "object") throw new GhostOpsError("INVALID_REQUEST");
    const request = validateTool(input.tool, { ...input.arguments, requestId: input.arguments.requestId ?? randomUUID() });
    try { await this.connect(options);
    return await this.perform(async signal => {
      const result = await this.#client!.callTool(request, undefined, { signal, timeout: options.timeoutMs ?? this.#timeout });
      const d = decisionSchema.safeParse(result.structuredContent);
      if (!d.success || d.data.requestId !== request.arguments.requestId || !d.data.allowed && d.data.output !== null) throw new GhostOpsError("INVALID_REQUEST", request.arguments.requestId);
      this.log({ event: "decision", requestId: d.data.requestId, allowed: d.data.allowed }); return d.data;
    }, options); } catch (error) { throw error instanceof GhostOpsError ? new GhostOpsError(error.code, request.arguments.requestId, error.decision) : new GhostOpsError("GATEWAY_UNAVAILABLE", request.arguments.requestId); }
  }
  async callTool(input: Parameters<GhostOpsClient["requestTool"]>[0], options: RequestOptions = {}): Promise<ToolDecision> { const result = await this.requestTool(input, options); if (!result.allowed) throw decisionError(result); return result; }
  async close(): Promise<void> { await this.#connecting?.catch(() => {}); const client = this.#client; this.#client = undefined; await client?.close().catch(() => {}); this.log({ event: "closed" }); }
  toJSON() { return { endpoint: this.endpoint, agentId: this.agentId, sessionId: this.sessionId }; }
}
