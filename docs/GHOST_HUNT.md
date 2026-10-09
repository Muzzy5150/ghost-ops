# Ghost Hunt

Ghost Hunt analyzes **persisted integrated-runtime observations**, not unrelated processes. It never scans the operating system or infers private reasoning. Scripted choices still use real MCP requests/handlers; no model decision is implied.

## Evidence categories

| Category | Meaning |
| --- | --- |
| observed | A verified recorded interaction, session binding, source context or response receipt |
| confirmed-violation | Actual request denied under an explicit tool/resource/protected-memory/delegation rule |
| suspected-manipulation | A denied operation following recorded untrusted-source context; influence remains unproven |
| inferred-relationship | Available UI category; no fabricated proximity edges are generated |

Scope membership is operator grouping only. Within a scope, sender → receiver links require actual submitted/received messages, server-bound actor/session/request identifiers, matching content hash and immutable root request. Different agents are not linked just because events occurred near each other.

The graph includes agents, sessions, tool capabilities, resources, untrusted sources, owner memory versions, traps, behavioral findings and response plans. Every edge names the persisted event. Evidence selection highlights only those edges; agent/memory/incident controls open existing workbench inspectors. Generic novelty remains observed, not a confirmed policy violation.

## Operation

On a migrated isolated instance, open **Ghost Hunt** from the tool rail/mobile launcher. Create an OBSERVE organization from explicitly provisioned runtime identities, or use `npm run hunt:demo`. Freeze a baseline only after at least four clean permitted observations. Select a case, filter evidence categories, select an entity neighborhood, inspect chronological evidence, preview a response and explicitly approve if the scope allows it.

Use `/api/hunt` with the normal local administrative cookie/CSRF for automation. Commands are strict `scope`, `configure`, `baseline`, `deploy`, `cleanup`, `preview`, `approve`, `reject`; see `src/lib/hunt-contract.ts`. A repeated command UUID returns its persisted receipt; changed reuse fails. Inputs never grant runtime permission.

Limits: 20 scopes; eight agents/scope; one scope/identity; 200 messages/scope; three active deception overlays/scope. Dashboard history samples 1,000 links, 100 plans/baselines/message metadata and 60 deployments. It reports relationship truncation; export refuses oversize evidence. Graph rendering caps 44 nodes/100 edges, with explicit neighborhood exploration rather than microscopic fit. Global gateway capacity remains 2,000 requests; commands remain bounded at 10,000. Prepare fresh disposable environments for repeated large evaluation campaigns rather than resetting user history.

Continuous recovery is bounded local processing, not a background LLM or independent monitoring daemon. The one-second timer shares the server's mutation queue; heavy traffic can delay analysis. New scopes do not retroactively reprocess events already passed by the global cursor. The demo creates the scope before work. Durable links survive restart; restored identities are not contained again by old credential epochs.
