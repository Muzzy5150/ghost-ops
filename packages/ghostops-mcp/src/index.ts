import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { CallToolRequestSchema, ListToolsRequestSchema, McpError, ErrorCode } from "@modelcontextprotocol/sdk/types.js";
import { GhostOpsClient, GhostOpsError, validateTool, type ClientOptions } from "@ghostops/sdk";
/** One bound identity, tools-only; no upstream capability can grant authority. */
export async function createSecurityProxy(options: ClientOptions) {
  const ghost = new GhostOpsClient(options); await ghost.connect();
  const server = new Server({ name: "ghostops-security-proxy", version: "0.1.0" }, { capabilities: { tools: {} } });
  let busy = false;
  server.setRequestHandler(ListToolsRequestSchema, async (_request, extra) => {
    if (busy) throw new McpError(ErrorCode.InvalidRequest, "Ghost Ops busy; no automatic replay"); busy = true;
    try { return { tools: await ghost.listTools({ signal: extra.signal }) }; }
    catch { throw new McpError(ErrorCode.InvalidRequest, "Ghost Ops discovery unavailable; no cached authority"); }
    finally { busy = false; }
  });
  server.setRequestHandler(CallToolRequestSchema, async (request, extra) => {
    if (busy) throw new McpError(ErrorCode.InvalidRequest, "Ghost Ops busy; no automatic replay"); busy = true;
    try {
      if (Object.keys(request.params).some(key => !["name", "arguments", "_meta"].includes(key))) throw new GhostOpsError("INVALID_REQUEST");
      const validated = validateTool(request.params.name, request.params.arguments);
      const decision = await ghost.requestTool({ tool: validated.name, arguments: validated.arguments }, { signal: extra.signal });
      return { content: [{ type: "text", text: JSON.stringify(decision) }], structuredContent: decision, isError: !decision.allowed };
    } catch (error) {
      const code = error instanceof GhostOpsError ? error.code : "GATEWAY_UNAVAILABLE";
      throw new McpError(ErrorCode.InvalidRequest, `Ghost Ops ${code}; no fallback execution`);
    } finally { busy = false; }
  });
  return { server, close: async () => { await server.close(); await ghost.close(); } };
}
