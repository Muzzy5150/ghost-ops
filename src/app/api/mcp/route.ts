import { NextRequest } from "next/server";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { z } from "zod";
import { runtimeCallSchema, runtimeToolNames, toolDescriptions } from "@/lib/runtime-contract";
import { authorizedRuntime, callRuntime, runtimeAction } from "@/server/runtime";
import { failure, HttpError, localOnly, readBody } from "@/server/http";
export const runtime = "nodejs";
export async function POST(request: NextRequest) {
  let server: McpServer | undefined;
  try {
    localOnly(request);
    const credentialHeader = request.headers.get("authorization") ?? "";
    if (!/^Bearer [a-zA-Z0-9_.:-]{8,256}$/.test(credentialHeader)) throw new HttpError(401, "Bearer agent credential required");
    const actorId = z.string().min(1).max(100).regex(/^[a-zA-Z0-9_.:-]+$/).parse(request.headers.get("x-ghostops-agent"));
    const sessionId = z.string().min(1).max(100).regex(/^[a-zA-Z0-9_.:-]+$/).parse(request.headers.get("x-ghostops-session"));
    const credential = credentialHeader.slice(7);
    const body = await readBody(request);
    const envelope = z.object({ jsonrpc: z.literal("2.0"), method: z.enum(["initialize", "notifications/initialized", "ping", "tools/list", "tools/call"]), id: z.union([z.string().max(100), z.number().int()]).optional(), params: z.unknown().optional() }).strict().parse(body);
    if (envelope.method === "tools/call") {
      // Strict parsing before SDK normalization prevents unknown argument/identity fields being stripped.
      const params = z.object({ name: z.enum(runtimeToolNames), arguments: runtimeCallSchema }).strict().parse(envelope.params);
      runtimeAction(actorId, sessionId, params.name, params.arguments);
      // Failed identities are recorded only as unverified claims at the gateway.
      // No discovery/payload/handler is granted; a denied tool call is still traceable.
    } else if (!await authorizedRuntime(actorId, sessionId, credential)) throw new HttpError(401, "Active authenticated runtime session required");
    server = new McpServer({ name: "ghostops-local-gateway", version: "1.0.0" }, { maxToolInputElements: 12 });
    for (const name of runtimeToolNames) server.registerTool(name, { description: toolDescriptions[name], inputSchema: runtimeCallSchema }, async args => {
      const result = await callRuntime(actorId, sessionId, credential, name, args);
      return { content: [{ type: "text", text: JSON.stringify(result) }], structuredContent: result, isError: !result.allowed };
    });
    const transport = new WebStandardStreamableHTTPServerTransport({ sessionIdGenerator: undefined, enableJsonResponse: true, maxRequestBodySize: 16_384 });
    await server.connect(transport);
    const response = await transport.handleRequest(request, { parsedBody: body });
    response.headers.set("Cache-Control", "no-store");
    return response;
  } catch (error) { return failure(error); }
  finally { await server?.close(); }
}
export function GET() { return new Response(null, { status: 405, headers: { Allow: "POST" } }); }
export const DELETE = GET;
