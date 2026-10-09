# Local MCP security gateway

## Phase 8 external client support

The gateway remains the authoritative existing execution path. Public `@ghostops/sdk` and tools-only `@ghostops/mcp` stdio adapter add external process access with fixed credential/session headers and strict request UUIDs. Discovery is filtered against current grants; a known forbidden explicit call still reaches policy denial/evidence, never its handler. See [proxy protocol/profile](MCP_PROXY.md) and [external quickstart](EXTERNAL_AGENT_INTEGRATION.md). No arbitrary upstream server/OAuth/full MCP compatibility is claimed. Revoked historical sessions may be attributed for forensic evidence but cannot authorize automatic recontainment of restored identities.

## Transport

`POST http://127.0.0.1:3210/api/mcp` uses the maintained official SDK's stateless, JSON-response Streamable HTTP transport. Only initialize, initialized notification, ping, tools/list and tools/call are supported; no free-form event ingestion, arbitrary resource read, shell, network tool or sampling endpoint exists. GET/DELETE return 405. The separate persistent agent session lives in SQLite, so restarting the stateless MCP endpoint never resets containment.

Headers:

```text
Authorization: Bearer <private agent credential>
X-Ghostops-Agent: live-research
X-Ghostops-Session: <provisioned session UUID>
Content-Type: application/json
Accept: application/json, text/event-stream
MCP-Protocol-Version: 2025-11-25
```

The SDK negotiates the protocol on initialize. Socket/Host/Origin protections remain those of `scripts/server.ts` and `localOnly()`: loopback bind, actual peer check, no inbound proxy/attestation headers, exact browser Origin and same-site protections. No CORS exemption exists. Discovery requires an active credential-bound runtime session. A well-formed tools/call with an invalid identity receives a denied MCP tool result and unverified investigative evidence, never discovery authority, payload access or handler execution.

## Catalogue and restrictions

| MCP tool | Catalogue resource | Actual effect |
| --- | --- | --- |
| read_document | docs/research | Read fixed synthetic fixture |
| read_document | docs/untrusted | Read hash-checked untrusted source record; taint session provenance |
| list_tasks | runtime/tasks | Read fixed synthetic JSON tasks |
| write_summary | research/summary | Exclusive request-addressed file in private restricted workspace |
| operational_status | infra/status | Read mock status fixture, not real infrastructure |
| read_memory | memory/runtime-policy or memory/runtime-notes | Read only submitting owner's signed chain |
| write_memory | memory/runtime-notes | Append signed, non-policy notes with source/session provenance |
| write_memory | memory/runtime-policy | Always denied independently of model instructions |
| read_document / restricted_admin | decoy/credentials / decoy/admin | Inert restricted decoys; interaction recorded, handlers never granted |

Every tool accepts a client-generated UUID `requestId`, a catalogue `resource`, and content only for writes (maximum 4,000 characters). Extra identity/owner/path/destination/provenance fields are rejected before SDK normalization. JSON bodies are capped at 16 KiB while streaming. Tool/resource mapping and strict schemas precede the common gateway; handler dispatch only follows current credential, session, quarantine, origin, tool/resource and memory-integrity checks.

The discovery catalogue intentionally includes restricted probes, clearly described as such. Discovering a name grants no execution capability. No tool accepts an actual filesystem path, command or outbound URL. All decoy secrets are synthetic and denied callers receive none.

## Receipts, provenance and replay

The MCP route supplies the trusted server executor; `/api/ingest` remains observation/simulation only. Runtime identities cannot use the simulation endpoint to train profiles, and demo identities cannot gain runtime effects. Client input cannot set `simulated` or `identityVerified`. Failed identity claims are separated from verified histories, baselines and incident correlation. Runtime incident keys add a local-runtime namespace.

Authorized handlers record completion, output hash/byte count, and bounded metadata (artifact or memory version ID). Full live tool output travels only to the requesting client; dashboard/database request receipts do not retain raw documents or prompts. Explicit persistent notes are stored as requested memory and visible to local administration. Policy/source hashes and structured evidence remain observable.

Exact duplicate delivery rechecks current authority, never invokes a committed handler again, and returns metadata-only receipts with null output. Changed UUID reuse conflicts. Withdrawn authority returns denial even for a previously allowed request. Failed handlers produce an audited failure, not a fabricated successful execution, and do not disclose arbitrary errors. Reads to tampered memory and appends over tampered notes fail before execution.

SQLite effects are transactional. Filesystem and SQLite are **not a distributed atomic transaction**. Summary filenames derive from actor/request hashes; creation is exclusive and no-follow. After an interrupted transaction, an existing artifact can be recovered only if its bytes match exactly. Partial/conflicting artifacts fail closed. Operational failure receipts distinguish attempted handlers from completed handlers. No durable generalized outbox/exactly-once external effects guarantee is claimed.

Quarantine and revocation are rechecked inside the serialized transaction immediately before dispatch. No authorization cache persists across tool calls. Existing connected clients receive denials after containment and restart. Correlation is deterministic; anomalies and decoy contact alone do not establish confirmed compromise.

## Enrollment / limits

`POST /api/runtime/enroll` requires existing loopback administration, cookie, Origin and CSRF. A strict UUID receipt, namespaced identity and random client secret are accepted; only the server-derived digest is persisted. It is not a public self-registration API. Twenty live identities, 2,000 total tool receipts, 1,000 memory versions and 10,000 administrative receipts bound the local environment. Simulation reset preserves live records and does not reset those live capacities. Local OS administration remains trusted; do not deploy publicly.
