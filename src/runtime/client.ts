import { randomUUID } from "node:crypto";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { z } from "zod";
import { runtimeIdentitySchema, type RuntimeIdentity, type RuntimeToolName } from "@/lib/runtime-contract";

export function localBase(value = process.env.GHOSTOPS_URL ?? "http://127.0.0.1:3210") {
  const url = new URL(value);
  if (url.protocol !== "http:" || url.hostname !== "127.0.0.1" || url.username || url.password || url.pathname !== "/" || url.search || url.hash) throw new Error("Only a plain http://127.0.0.1:PORT runtime origin is supported");
  return url.origin;
}
export const resultSchema = z.object({ requestId: z.string(), allowed: z.boolean(), reason: z.string(), output: z.string().nullable(), incidentId: z.string().nullable(), replayed: z.boolean() });
/** Trusted operator CLI helper. Never exposed as an agent/model tool. */
export async function localAdmin(base = localBase()) {
  localBase(base);
  const response = await fetch(`${base}/api/bootstrap`, { redirect: "error", signal: AbortSignal.timeout(10_000) });
  if (!response.ok) throw new Error("Local administration unavailable");
  const csrf = z.object({ csrf: z.string() }).parse(await response.json()).csrf;
  const cookie = response.headers.get("set-cookie")?.split(";")[0];
  if (!cookie) throw new Error("Administrative cookie missing");
  return { cookie, origin: base, "content-type": "application/json", "x-ghostops-csrf": csrf };
}
export class LocalAgentClient {
  readonly client = new Client({ name: "ghostops-isolated-agent", version: "1.0.0" });
  constructor(readonly identity: RuntimeIdentity, readonly base = localBase()) { runtimeIdentitySchema.parse(identity); localBase(base); }
  async connect() {
    await this.client.connect(new StreamableHTTPClientTransport(new URL(`${this.base}/api/mcp`), {
      requestInit: { headers: { authorization: `Bearer ${this.identity.credential}`, "x-ghostops-agent": this.identity.actorId, "x-ghostops-session": this.identity.sessionId } },
      fetch: (input, init) => {
        const url = new URL(input);
        if (url.origin !== this.base || url.pathname !== "/api/mcp") throw new Error("Unexpected MCP destination");
        return fetch(input, { ...init, redirect: "error", signal: AbortSignal.timeout(10_000) });
      }
    }));
  }
  async call(name: RuntimeToolName, resource: string, content?: string, requestId = randomUUID()) {
    const response = await this.client.callTool({ name, arguments: { requestId, resource, ...(content ? { content } : {}) } });
    return resultSchema.parse(response.structuredContent);
  }
  async close() { await this.client.close(); }
}
