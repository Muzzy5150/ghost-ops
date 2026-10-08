# @ghostops/mcp 0.1.0

Tools-only stdio adapter using official `@modelcontextprotocol/sdk` 1.32.1. One operator-provisioned identity per process forwards supported calls through `@ghostops/sdk` to the existing loopback gateway. No network listener, arbitrary upstream server, shell or local fallback execution.

Install both locally packed SDK/proxy tarballs together. Configure `GHOSTOPS_URL`, `GHOSTOPS_AGENT_ID`, `GHOSTOPS_SESSION_ID`, `GHOSTOPS_AGENT_TOKEN` privately in the client-launched process environment. Run the installed `ghostops-mcp` binary, or `node node_modules/@ghostops/mcp/dist/cli.js`. Do not put credentials in tool descriptions, command arguments, committed client configuration or stdout.

Supports official initialization/capability negotiation, ping, `tools/list` and `tools/call`. Advertises only tools, not prompts/resources/sampling/tasks/OAuth. Discovery is server-filtered; every invocation rechecks authorization. Tool arguments require UUID `requestId`, catalogued `resource` and write-only bounded `content`; no owner/identity/URL/path substitution. Reuse the exact same UUID/input only for deliberate safe retries.

Denials return standard MCP `isError: true` with structured Ghost Ops evidence. Transport/input failures return sanitized protocol errors, never fabricated policy receipts. Stdio frames are bounded to 16 KiB and operations are single-flight. Only protocol messages go to stdout; diagnostic stderr omits secrets. On EOF/shutdown the proxy closes. Disconnect/cancellation cannot undo committed tool effects.

The gateway uses JSON-response stateless Streamable HTTP internally, with persisted Ghost Ops sessions distinct from MCP transport sessions. No unrestricted external-MCP interception is claimed. See repository docs/MCP_PROXY.md for tested local setup and limitations.
