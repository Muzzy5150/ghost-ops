# Ghost Ops architecture

## Phase 4 presentation boundary

The security backend, APIs, database schema and runtime dispatcher are unchanged. `Console` retains the existing bootstrap/CSRF client, non-overlapping polling and idempotent mutation retry IDs. `Workspace` maps navigation to thirteen window tools rather than replacing security workflows. Layout actions never call management endpoints.

`workspace-model.ts` is the pure geometry/persistence reducer. `WorkWindow` uses pointer capture and frame-scheduled local DOM updates during gestures, committing geometry at gesture end. Eight edge/corner handles, title-bar keyboard movement, bounded focus ordering, minimize/maximize/restore/hide/reopen and two presets share one positioning system. A ResizeObserver handles desktop bounds; mobile panels do not overwrite desktop geometry.

`workspace-graph.ts` projects bounded stored ownership, request and investigation relationships. Claims and claimed sessions have separate namespaces. Tool nodes are session scoped; compact request edges come directly from recorded actor/resource requests, never temporal proximity or inferred paths. The lazily loaded React Flow canvas provides pan/zoom/select/node movement with opaque coordinate persistence. An investigator can inspect an agent, case, version or linked event while retaining other windows.

`IncidentDesk` makes evidence timelines primary; the previous full case view remains inside an expandable case file. `EvidenceInspector` resolves events from the recent snapshot or returned incident timelines, displays actual request receipts, and preserves replay-denial semantics. The event terminal freezes only its displayed snapshot while polling/enforcement continue. Engine components, guided demo and live session receipts are reused with window-width container queries. Details: [WORKSPACE_ARCHITECTURE.md](WORKSPACE_ARCHITECTURE.md).

## Phase 3 local runtime

`src/runtime/agent.ts` supplies an optional official OpenAI Agents SDK tool loop and a clearly labeled offline dispatcher. Both use `LocalAgentClient` and the official MCP protocol client. `/api/mcp` runs stateless JSON-response Streamable HTTP while binding every action to a persistent SQLite credential/session. `/api/runtime/enroll` uses the existing administrator/Origin/CSRF boundary and stores only a random credential's digest. The client receives no signing root.

The common gateway accepts a server-held runtime dispatcher only on the MCP path. Simulation ingestion cannot acquire execution or train runtime histories. Allowed calls dispatch to fixed synthetic fixture reads, exclusive request-addressed summary files or signed owner-bound notes. No arbitrary paths, commands, destinations or security-policy writes exist. Runtime ToolRequest.execution stores handler completion, output hash/size and bounded artifact/version metadata; raw tool output is returned only to the caller and not persisted in receipts. Operational failures are audited without fabricated success. Exact retries recheck current authority and never rerun committed handlers.

AgentDNA learns only authenticated permitted trusted runtime history, with independent local-operator baseline freezing after at least four observations. Untrusted ingestion taints the session. MemoryGuard separates writable notes (never policy) from protected runtime policy and verifies signatures before reads/appends. GhostTrap sees actual denied MCP decoy attempts. Correlation distinguishes live/simulated provenance and verified/unverified attribution; quarantine and revocation remain enforced at dispatch across restart. Local administrator restoration/fault injection is labeled separately from agent/model behavior.

Simulation reset now deletes only simulated requests/events/incidents/agent memory; runtime identities, revocation, evidence and memory survive. Shared source/decoy records and command receipts remain. Overview and Agent Registry expose real session receipts; all event feeds and incidents label provenance; MemoryGuard selects individual owner/key chains. Existing eight sections and original guided demos remain operational.

The process is not an OS sandbox, and only integrated calls are protected. Optional remote inference has not been executed in verification. Details: REAL_AGENT_INTEGRATION.md, MCP_GATEWAY.md and PHASE3_VERIFICATION.md.

## Deployment and authority

One local Node process runs Next.js App Router on `127.0.0.1`. `scripts/server.ts` verifies the actual socket, rejects inbound proxy/attestation headers, and inserts a domain-separated HMAC transport attestation before Next handles the request. Routes check that attestation, exact loopback Host, Origin and fetch metadata. Direct `next start` fails closed.

The local OS operator is trusted. Bootstrap creates a random signed eight-hour administrative session; management also requires session-bound CSRF. This is not independent human administrator authentication. Agent ingestion and runtime MCP use separate credential digests and bound sessions. Real bounded local effects and opt-in model execution now ship; cloud/production integrations do not.

## Event and response path

```text
strict bounded action + credential
  → current identity/session/status checks (including cached output)
  → catalogue + tool/operation/resource/destination policy
  → allowed synthetic result OR denial without output
  → persisted request, policy decision and ordinal events
       ├─ AgentDNA: verified history, trusted baseline, rule deviations
       ├─ ShadowWatch: identity and permission evidence
       ├─ MemoryGuard: protected writes, provenance, signed versions
       └─ GhostTrap: inert decoy attempts, including denied claims
  → correlation namespace [verified-or-claimed, actor, session]
  → incident + evidence + recorded correlation decision
  → verified multi-signal automatic containment
  → revoked credentials + disabled sessions + audited response
```

`src/server/db.ts` serializes mutations in-process. Ingestion and each management command use a SQLite transaction. A guided story commits each step separately; all ten step receipts and its cursor live in `SimulationRun.results`. `expectedStep` and persistent command fingerprints prevent concurrent advance/replay from executing a step twice. Refresh or application restart does not lose progress. No autonomous background executor is needed.

## Attribution and idempotency

`identityVerified` requires both credential-to-actor and session-to-actor/credential bindings. It does not imply permission or active authority: a correctly bound revoked credential still supplies attributable post-containment denials. Invalid credentials and foreign sessions remain unverified claims, isolated from authenticated correlation and AgentDNA history. Administrative memory verification/restoration and operator response events are explicitly authorized operator attribution, not agent execution.

Correlation uses JSON tuple encoding, not delimiter concatenation. Automatic critical response requires verified attribution plus AgentDNA, MemoryGuard and GhostTrap signals. Unknown identity is distinct from suspected compromise. Correlation creation/escalation, enforcement and restoration are actual stored events. Event ordinals preserve transaction order even when timestamps coincide. Ordinals rely on the supported single-process mutation queue; they are not a distributed ordering service.

Exact request retry never executes the tool again. Before returning historical output, the gateway rechecks current credentials, session, status, policy and memory integrity. Withdrawn authority receives `allowed:false`, `output:null`, and an idempotently recorded replay denial; the original receipt stays unchanged. Management command replay returns its prior receipt. Reset preserves command receipts so an old reset cannot erase newer activity.

## Provenance and memory

The catalogue determines `docs/untrusted` → `untrusted-paper`; omitting or substituting source metadata cannot keep the session trusted. The server verifies the source content hash and records successful ingestion/provenance in the same transaction. Content remains inert data. Untrusted activity never trains the trusted baseline.

`src/server/memory.ts` signs content, hash, owner, key, version, parent, source identity/trust, session, authorization, protection state, restoration source and timestamp. Restore verifies history and appends a new signed snapshot, keeping altered records. Restoring an agent checks the latest snapshot of every owned key, rotates credentials and disables predecessor sessions. All memory append paths enforce the 1,000-version capacity.

## Dashboard and data

`snapshot()` returns complete counters and bounded recent collections, with full timelines for returned incidents and safe selected policy-request fields. Credentials/digests, signing material, request fingerprints and memory signatures are never projected. React escapes observed strings. No raw HTML rendering or evaluation is used.

The eight sections share expandable event evidence and targeted investigation navigation. Investigations separates facts from interpretation, filters severity/status/engine, shows recorded stages, and links agent history and related memory diffs. AgentDNA charts verified gateway requests in real minute buckets. Deception displays all five synthetic resources. Live polling avoids overlapping interval requests and ignores obsolete responses; uncertain command retries reuse the same ID. These code-level behaviors are tested where possible; browser interaction/visual layout remains unverified because of the saved tool permission.

## Key implementation files

| Concern | Files |
| --- | --- |
| Schema, migration | `prisma/schema.prisma`, `prisma/migrations/20261008010000_verified_attribution/migration.sql` |
| Enforcement | `src/server/gateway.ts`, `policy.ts`, `config.ts`, `http.ts` |
| Evidence and response | `src/server/investigation.ts`, `service.ts` |
| Signed memory | `src/server/memory.ts`, `simulation.ts` |
| Persisted ten-step demonstration | `src/server/demo.ts`, `src/components/demo-story.tsx` |
| Investigation UI | `src/components/investigations.tsx`, `overview.tsx`, `sections.tsx`, `console.tsx` |
| Adversarial and real restart verification | `tests/adversarial.test.ts`, `scripts/verify-restart.ts`, `scripts/verify-api.ts` |

The additive migration preserves existing records and deliberately leaves their attribution unverified. It does not repair historical ambiguous/mixed incidents or infer old credential proof. Reset the disposable demonstration after upgrading to generate fully attributed evidence.

The bounded local MCP/optional OpenAI SDK client is implemented. Native Codex/Cursor, arbitrary MCP servers, OpenTelemetry, cloud and production memory adapters remain roadmap. Production integration needs independent admin identity, credential lifecycle/redelivery, durable concurrency, hardened sandboxing and externally anchored evidence.
