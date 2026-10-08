# @ghostops/sdk 0.1.0

Node.js 22.12+ ESM/TypeScript client for Ghost Ops' authenticated **loopback MCP** gateway. Built declarations and public exports are included. It does not execute tools locally, self-provision, submit arbitrary telemetry or obtain administration/signing keys. Only properly routed tools are protected, not every OS/agent action.

Build from the repository with `npm run sdk:build`; package using `npm run sdk:pack`. Install the generated SDK tarball in your own project (no npm publication is performed).

```ts
import { GhostOpsClient, GhostOpsError } from '@ghostops/sdk';
const ghost = new GhostOpsClient({
  endpoint: process.env.GHOSTOPS_URL!, // http://127.0.0.1:3210 only
  agentId: process.env.GHOSTOPS_AGENT_ID!,
  sessionId: process.env.GHOSTOPS_SESSION_ID!,
  credential: process.env.GHOSTOPS_AGENT_TOKEN!,
});
try {
  const approved = await ghost.listTools();
  const result = await ghost.callTool({ tool: 'read_document', arguments: { resource: 'docs/research' } });
  // Consume permitted result locally; do not log secret-bearing payloads.
} catch (error) {
  if (error instanceof GhostOpsError) console.error(error.toJSON());
} finally { await ghost.close(); }
```

`requestTool` returns allowed/denied structured evidence. `callTool` throws on denial with `code`, `requestId` and `decision`. Supply an optional UUID in `arguments.requestId` for exact idempotent retries; no automatic mutation retry is performed. Timeouts/aborts can leave already committed effects: retain the ID and exact input before deliberate retry. Gateway replay rechecks current authority and never executes twice; cached local output is never an authorization source.

Public exports: `GhostOpsClient`, `GhostOpsError`, `decisionError`, `endpointOrigin`, `validateTool`, tool/resource catalogs, strict schemas and associated types. Methods: `connect`, `listTools`, `requestTool`, `callTool`, `close`. Per-call `{signal, timeoutMs}` is supported, maximum 30 seconds/default 10 seconds. Logger receives bounded event/code/ID/allowed metadata only, not credentials, request contents or tool output. Errors distinguish authentication, permission, quarantine, revocation, unavailable gateway, invalid/unsupported input, timeout/cancellation, request conflict and handler failure.

Current tools: approved/untrusted synthetic document reads, synthetic task list/status, restricted summary writes, owner-bound signed memory reads/notes writes. Decoy requests can be submitted explicitly but are not advertised as approved and never execute privileged handlers. Session/agent headers are fixed by configuration; argument identity/owner fields are rejected.

No general networking, filesystem, shell, third-party upstream MCP, OAuth or browser/OS interception. Public multi-user deployment is unsupported. See repository docs/DEVELOPER_SDK.md and docs/PHASE8_SECURITY_MODEL.md.

Each client is single-flight: await requests in order. Concurrent operations fail as unavailable rather than creating an unbounded queue. All response bodies (including errors) are bounded to 64 KiB; request JSON is bounded to 16 KiB. Per-call cancellation is applied to actual HTTP fetch as well as the MCP request wait. Already dispatched server effects cannot be undone.
