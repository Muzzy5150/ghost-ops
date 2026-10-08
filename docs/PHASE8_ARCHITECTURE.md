# Phase 8 integration architecture

The existing gateway remains authoritative. Implement `packages/ghostops-sdk` as an ESM TypeScript package using the installed official MCP client, and `packages/ghostops-mcp` as a stdio tools-only adapter. Neither imports private server modules, opens a network listener, executes tools locally or connects to arbitrary upstream servers. The standalone example consumes only public package exports in a separate process.

```text
external Node agent → SDK (direct HTTP) OR MCP client → stdio proxy
  → authenticated loopback MCP → current identity/session/policy checks
  → existing bounded handler → existing four engines / investigations / exports
```

Keep the root application structure unchanged: three small npm workspaces provide public package links after `npm ci`; independent builds and local tarball installation require no additional monorepo manager. No publication. Pin compatible MCP/Zod versions already installed. Support initialization/ping/tools-list/tools-call; no prompts/resources/sampling/OAuth/arbitrary upstream proxy claims.

Add a defaulted integration-type column without changing old data. Extend existing operator-only enrollment with bounded external metadata and explicit capability subsets. Add audited idempotent credential rotation/restoration with verified memory, revocation of prior credentials and new sessions; clients cannot self-provision or self-elevate. Secrets stay in private operator-generated pending/credential files, never returned by dashboards or command receipts.

SDK validates endpoint, identity, requests and responses, supplies session/request identifiers, caps payloads/timeouts, supports cancellation and exposes predictable sanitized errors. No automatic mutation retry or cached authorization. The proxy binds one operator-provisioned identity per process; request arguments cannot substitute it. Tool discovery is filtered server-side; direct forbidden calls still reach the gateway for denial/evidence. Request UUIDs survive proxy forwarding for exact safe replay.

Developer console is a tab inside existing Runtime sessions, not a redesign or new window. Show authorized session state and last recorded activity, never infer an online process from registration. External events remain local-runtime provenance (model inference not implied), with server-registered integration designation. Protected memory ownership is derived from authenticated identity, not a caller-supplied owner.

Verify existing baseline, unit schemas/errors, actual tarball installs outside the source tree, independent agent + stdio subprocess + production server, revocation/quarantine/restart/replay, all four engines, export/HMAC and original demos with disposable data/build. Never touch the retained presenter or run paid inference. Visual QA remains pending.

## Implemented boundaries

`packages/ghostops-sdk/src/index.ts` owns the public bounded MCP client. `packages/ghostops-mcp/src/index.ts` forwards tools; `src/server/runtime.ts` and the existing gateway remain the only authorization/execution path. `scripts/external.ts` is a separate trusted operator CLI, never imported by the SDK or agent. `examples/external-agent/src/main.ts` runs independently and consumes only supported public exports. `scripts/verify-external.ts` packs/installs all three packages in an unrelated temporary consumer and exercises separate agent/proxy/server processes.

`20261008050000_external_integrations` adds only a defaulted `Agent.integrationType` column. Existing identity, event, memory, incident and export models are reused. Registration is operator metadata, not proof of process location. Credentials/session binding verify the actor of tool requests; nothing submitted by an agent can assert provider verification or overwrite that binding.

The current-authority guard in `investigation.ts` fixes a reproduced lifecycle defect: a revoked old critical session could previously re-quarantine a newly restored identity. Correlation still links its historical evidence, but automatic response requires an active actor, actor-bound active session and matching nonrevoked credential. Explicit operator containment and fresh critical-session containment remain available.

Official protocol sources reviewed: [stdio transport](https://modelcontextprotocol.io/specification/2025-11-25/basic/transports), [tool discovery/calls](https://modelcontextprotocol.io/specification/2025-11-25/server/tools), and the maintained [TypeScript client](https://ts.sdk.modelcontextprotocol.io/client) / [server SDK](https://ts.sdk.modelcontextprotocol.io/server). The installed SDK is 1.32.1; negotiated MCP is not a custom wire protocol. Compatibility is limited to the tested tools-only subset and existing JSON Streamable HTTP profile.
