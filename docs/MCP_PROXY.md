# Local MCP security proxy

`@ghostops/mcp` 0.1.0 uses the official MCP TypeScript SDK 1.32.1. It bridges a client's **stdio MCP tools requests** to Ghost Ops' authenticated, stateless JSON Streamable HTTP `/api/mcp` gateway. It is a bounded tools adapter, **not an arbitrary upstream MCP server proxy**.

## Supported protocol

Official initialization/capability negotiation, ping, `tools/list` and `tools/call`. The proxy advertises tools only. No resources/prompts/sampling/roots/OAuth, arbitrary server connections or unrestricted listeners. Credentials are supplied by the trusted operator through process environment, not protocol arguments or tool descriptions. The downstream MCP client negotiates the official SDK-supported protocol; no custom initialization shortcut is used.

```sh
npm ci
npm run sdk:build
# Privately set GHOSTOPS_AGENT_ID, GHOSTOPS_SESSION_ID, GHOSTOPS_AGENT_TOKEN.
export GHOSTOPS_URL=http://127.0.0.1:3210
npm run mcp:proxy --silent
```

For a third-party MCP client, prefer the installed `ghostops-mcp` binary or `node /absolute/path/to/packages/ghostops-mcp/dist/cli.js`; no npm banner should enter the protocol stream. Provide the four `GHOSTOPS_*` connection values using your client's private environment configuration, never commit their real values. The example reads the private identity file and automatically launches the installed proxy with those values; it does not pass the server signing key, admin cookies or model API key to that child.

## Behavior and enforcement

One immutable authenticated identity/session per proxy process. Startup authenticates before accepting client requests. Discovery queries current server policy; quarantined/revoked identities cannot rely on an old tool catalog. Explicit calls to known but forbidden tools/resources still go to the existing gateway, which records a denial without invoking their handlers. Unknown tool names, mismatched resources, extra actor/owner fields, oversized frames and malformed requests fail before dispatch.

`requestId` is a required UUID in MCP tool arguments; it is forwarded unchanged. Standard protocol `_meta` cannot replace identity and is not forwarded as authority. A tool decision is returned as structured content and readable JSON; genuine denials set `isError: true`. Transport/input errors are sanitized MCP errors, not forged policy decisions. Untrusted tool output remains data and cannot change permissions.

Stdio input is bounded to 16 KiB; the public SDK caps request JSON at 16 KiB and responses at 64 KiB. Operations are single-flight, time-bounded and cancellation-aware. No automatic mutation retry, fallback executor, arbitrary shell, outbound network or effect replay. On process disconnect/shutdown the SDK connection closes. A disconnected operation may already have committed at the server; preserve its UUID before deliberate retry.

## Verification

`npm run test:external` installs the SDK/proxy/example tarballs in a separate temporary consumer, launches an independent agent and stdio proxy, and talks to a separate production server with disposable state. It checks protocol initialization, approved discovery, real reads/writes, denied handlers, exact replay, forged identity rejection, quarantine across restart, rotation/revocation, owner isolation, all four engines and authenticated forensic exports. This does not establish compatibility with every MCP client or upstream server.

Official sources: [transports](https://modelcontextprotocol.io/specification/2025-11-25/basic/transports), [tools](https://modelcontextprotocol.io/specification/2025-11-25/server/tools), [TypeScript SDK](https://ts.sdk.modelcontextprotocol.io/server).
# Phase 10 guarded delegation

Tool discovery can advertise `send_message` / `read_inbox` only for explicitly granted capabilities/resources. Normal initialization and stdio/loopback transport remain unchanged. Every invocation rechecks current identity, containment and scope/receiver/reference ownership before the bounded message handler; no unguarded agent-to-agent channel is introduced. Forwarded text is untrusted data, not a system instruction or permission grant. See [Hunt architecture](ARCHITECTURE.md) and [memory provenance](MEMORY_FORENSICS.md). Existing MCP support boundaries below remain unchanged.

## Phase 11 context capability

The tools-only stdio proxy and authenticated loopback transport remain unchanged. The additive docs/context resource requires an operator-approved contextId and documents:ingest permission; public SDK schemas preserve that field through tools/call. Remote retrieval cannot grant privileges. No arbitrary upstream MCP forwarding, new public listener or sponsor secret is exposed. [Provenance details](SENSO_PROVENANCE.md).
