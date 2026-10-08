# GHOST OPS

Detect the rogue. Trace the behavior. Protect the memory.

Ghost Ops monitors isolated local agents through an authenticated MCP tool gateway. Four engines correlate identity, behavioral deviation, signed memory and synthetic deception into evidence-backed investigations. The dashboard uses SQLite records; permissions, quarantine and revocation are enforced before bounded local tools run. The original synthetic demonstration remains available.

## Phase 4: interactive security workspace

The landing screen is now an operations desktop, not a card dashboard. Arrange thirteen operational tools in genuine draggable/resizable windows, use **Operations** or **Incident Room**, minimize to the task strip, maximize/restore, and reopen tools from the rail or **⌘/Ctrl K**. Geometry and opaque graph coordinates persist locally in a validated, versioned preference record. **Reset layout** changes presentation only—it does not reset security data. Mobile/tablet widths up to 900px use a single active panel with a selector for every tool, without rewriting desktop geometry.

The React Flow network supports pan, zoom, node movement, fit/reset and an accessible entity directory. **Operations map** projects recorded agent/resource requests; **Sessions & tools** exposes their actual session/capability chain. Dashed amber links mark unverified claims, red links denied requests. Claims never join the victim's registered session. Selecting an agent opens its floating inspector; selecting an incident or timeline event opens its actual case or evidence. Investigations presents a compact chronological timeline, recorded enforcement and response history, with the complete previous case file still available.

MemoryGuard retains signed history, source provenance, before/after diff and verified restoration. GhostTrap has an operational resource grid and linked interaction evidence. AgentDNA compares recent verified session activity with historical trusted counts; these are not compromise probabilities. The terminal supports search, engine/severity/agent/origin filters, display-only pause/resume and auto-scroll. Runtime receipts and the existing guided demo remain accessible.

See [UI design](docs/PHASE4_UI_DESIGN.md), [workspace architecture](docs/WORKSPACE_ARCHITECTURE.md), [visual QA limitations](docs/PHASE4_VISUAL_QA.md), and the updated [two-minute walkthrough](docs/DEMO_SCRIPT.md). **Real-browser visual QA remains unverified:** saved site permissions blocked the browser tool even after authorization. Synthetic DOM tests are not screenshots. The reference site was also inaccessible; no reference assets, code or specific layout were copied.

## Phase 3: running local agent

With the server on port 3210, use another terminal:

```sh
npm run agent:provision
npm run agent:run -- --task "Read the approved research document and write a summary."
npm run agent:demo -- --interactive
```

The offline client uses **scripted decisions**, not model inference, but makes genuine MCP requests: approved fixture reads, actual restricted file writes, signed memory operations and denied tool requests. Overview and Agent Registry show live sessions and handler receipts; Investigations labels live versus simulated provenance. The seven-stage demo tests injection denial independently of model behavior, correlates a decoy attempt, verifies containment and restores an explicitly altered test snapshot.

Optional **official OpenAI Agents SDK** model execution requires deliberate configuration:

```sh
export GHOSTOPS_MODEL_ENABLED=1
export GHOSTOPS_MODEL=your-approved-model-id
# Set OPENAI_API_KEY securely in this terminal; never commit or print it.
npm run agent:run -- --model --task "Read docs/research and summarize it using the local tools."
```

Model mode contacts only the configured official OpenAI provider endpoint and disables tracing exports. Use synthetic inputs only; costs and provider retention apply. A key alone does not enable inference. **No real-model call was performed during verification.** Model integration is implemented/typechecked, not live-provider verified. See [REAL_AGENT_INTEGRATION.md](docs/REAL_AGENT_INTEGRATION.md), [MCP_GATEWAY.md](docs/MCP_GATEWAY.md), [LIVE_DEMO_SCRIPT.md](docs/LIVE_DEMO_SCRIPT.md), and [PHASE3_VERIFICATION.md](docs/PHASE3_VERIFICATION.md).

## Run locally

Requires Node.js **22.12+** (Node 24 recommended), npm, and a writable local filesystem. Package versions are locked. SQLite needs no separate server. The native SQLite dependency normally installs a prebuilt binary; unsupported platforms need a C++ build toolchain. An internet connection is needed for the initial npm installation, not for running the application.

```sh
npm ci
npm run setup
npm run dev
```

Open **http://127.0.0.1:3000**. If that port is occupied:

```sh
npm run dev -- --port 3210
```

For the reliable production demo:

```sh
npm run build
npm start -- --port 3210
```

Open **http://127.0.0.1:3210**. Always use these scripts: the custom Node transport binds to `127.0.0.1`, verifies the actual peer socket, rejects client proxy headers, and supplies internal transport attestation. Direct `next start` does not provide attestation and the APIs fail closed. Do not put this MVP behind a proxy or publish it.

No OpenAI API key, cloud account, paid API, or external database is required. No environment file is required. Optional process environment variables are `PORT`, `DATABASE_URL`, and `GHOSTOPS_SIGNING_SECRET` (at least 32 characters). Scripts do not automatically load `.env`; export variables in the launching shell if overriding defaults. See [.env.example](.env.example).

The default database is `prisma/ghostops.db`. First startup creates a private random signing key at `.ghostops/integrity.key` with mode `0600`. Both paths are gitignored. Back up the key with the database. Losing/changing it invalidates memory signatures and credential hashes: restore the original key or explicitly archive and create a new isolated environment. Simulation reset does not repair runtime history or credentials. Never copy this key into dashboard configuration or logs.

## Two-minute demonstration

**Phase 2 recommended path:** open **Demo Control → New guided demo → Reset & start**, then click **Execute step 1** through **Execute step 10**. Each click commits a genuine gateway/verification transaction and updates a persisted story cursor. Steps show normal agents, a blocked rogue actor, untrusted ingestion, behavior escalation, protected-memory denial, successful legitimate research, correlated decoy-triggered containment, an otherwise permitted task denied, detected test-memory tampering, and verified restoration. Refresh or restart to resume. Inspect the critical incident and its linked memory diff. The clean guided story ends at **27 requests, 6 blocked, 2 investigations, 1 quarantined agent, 3 trap interactions**, with latest memory verified. Its replay includes the child normal/rogue runs and never executes effects again.

The original independent A/B/C/D scenarios remain available:

Open **Demo Control**. Reset the synthetic environment if it contains prior activity, then run these in order:

1. **Normal operation**: 18 permitted tasks; three agents each learn six trusted observations. No incidents or anomalies.
2. **Rogue agent**: an unregistered actor attempts two decoy operations. Identity verification denies both. Linked trap evidence is stored in a contained investigation.
3. **Memory poisoning**: an untrusted document prompts forbidden deployment and policy rewriting. Both are blocked; a legitimate summary still completes. A deliberately tampered synthetic snapshot fails HMAC verification and a verified historical version is restored.
4. **Full compromise**: behavior, permissions, memory, and deception signals link to one critical ResearchAgent incident. The correlation engine quarantines the registered identity, revokes credentials, disables sessions, and blocks an otherwise permitted summary. A verified memory snapshot is restored while the tampered version remains as evidence.
5. Open **Investigations** and expand the critical incident timeline. Show the `AGENT_QUARANTINED` blocked request and restoration events. Open **MemoryGuard** to inspect the tampered version, signed provenance, before/after comparison, and verified current restoration.

After A → B → C → D: **31 requests, 8 blocked, 3 investigations, 1 registered agent quarantined**. B is contained, C remains an investigation without automatically quarantining the legitimate research agent, and D is contained. Restore the research agent in **ShadowWatch** or **Agent Registry** to rotate its credential and permit further work. Previously revoked credentials stay revoked. Reset removes disposable synthetic history and reseeds the same identities, roles, traps, and policy text; random IDs and wall-clock timestamps intentionally differ.

Exact narration and timing are in [docs/DEMO_SCRIPT.md](docs/DEMO_SCRIPT.md).

## Architecture

```text
Local Node transport → Next.js API → strict Zod schema
    → credential + session verification → explicit policy decision
    → synthetic result OR bounded local MCP handler → persisted request + event
    → AgentDNA / ShadowWatch / MemoryGuard / GhostTrap
    → actor/session correlation → incident + evidence timeline
    → quarantine / credential revocation / verified snapshot restoration
    → polling windowed security workspace (2.5 seconds)
```

Mutation commands are serialized in the local server process and committed in SQLite transactions. A simulation uses the exact gateway used by `/api/ingest`. Request and command IDs have persistent fingerprint receipts; altered reuse returns `409`. Request replay rechecks current identity/session/status/policy/memory integrity before disclosing cached output: withdrawn authority receives `allowed:false` and `output:null`, while the original receipt remains unchanged and the tool never executes twice. Exact management replay returns its historical receipt. Read-only timeline replay never re-executes effects. Guided steps additionally require the persisted expected cursor.

| Engine | Implemented method |
| --- | --- |
| AgentDNA | Trusted observation counts, frozen tool/resource/sequence baselines, unseen destinations, privileged-sequence and burst rules, post-ingestion escalation evidence |
| ShadowWatch | Registry, hashed high-entropy credentials, credential-bound sessions, explicit tool/operation/resource/destination allowlists, enforced quarantine and revocation |
| MemoryGuard | SHA-256 content hashes, server-held HMAC over content and provenance, version history, protected write denial, live integrity validation, restoration into a new signed version |
| GhostTrap | Five inert local catalogue resources; interactions record actor, session, operation, request, event, and linked incident |

Critical correlation requires **verified identity attribution + behavior deviation + memory manipulation + decoy interaction for the same actor/session**. Unverified claims have their own unambiguous correlation namespace and cannot supply signals to contain a registered victim. Unknown identity or credential violations generate high-severity investigations; memory plus behavior is high. Other findings create medium investigations. Severity never decreases automatically. Decoy interest alone never proves malicious intent or automatically quarantines an actor. The exact rules live in `src/server/investigation.ts`.

All eight sections work: Overview, Agent Registry, AgentDNA, ShadowWatch, MemoryGuard, GhostTrap, Investigations, and Demo Control. Controls initialize/reset, run scenarios, inspect actual receipts, filter/search recent activity, verify/restore snapshots, quarantine/revoke/restore agents, expand evidence, and replay stored timelines.

Phase 2 adds readable eight-metric overview/enforcement feeds, expandable evidence throughout, truthful identity/status labels, minute-bucket behavioral activity, all five decoys, severity/status/engine investigation filters, recorded detection-to-restoration stages, facts versus interpretation, linked agent/memory inspection, source-derived ingestion provenance, and server-enforced administrative expiry. See [ARCHITECTURE.md](docs/ARCHITECTURE.md) and [SECURITY_MODEL.md](docs/SECURITY_MODEL.md).

Key files:

- `prisma/schema.prisma`: agents, credentials, sessions, profiles, requests, policy decisions, events, findings, incidents, evidence, memory versions, traps, interactions, containment, runs, receipts, and source documents.
- `src/server/gateway.ts`, `policy.ts`: credential/session checks, permission enforcement, synthetic dispatch, behavior analysis.
- `src/server/memory.ts`, `simulation.ts`: signed versions, verification, restoration, fault injection, and four real demo workflows.
- `src/server/investigation.ts`, `service.ts`: correlation, auditable containment, transactions, management, and dashboard snapshot.
- `src/server/demo.ts`, `src/components/demo-story.tsx`: ten-step persisted demonstration and compare-and-advance protection.
- `src/components/investigations.tsx`: linked investigation workflow and expandable policy evidence.
- `scripts/server.ts`, `src/server/http.ts`, `src/app/api/`: local transport, administrative session, CSRF, body limits, and API boundaries.
- `src/components/`, `src/app/globals.css`: responsive graphite/green operations console.
- `src/server/runtime.ts`, `runtime-tools.ts`, `src/app/api/mcp/route.ts`: runtime enrollment, authenticated MCP interception and bounded local handlers.
- `src/runtime/client.ts`, `agent.ts`, `scripts/agent.ts`, `live-demo.ts`: actual MCP client, opt-in official Agents SDK loop, offline dispatcher and exact live-tool demonstration.
- `src/components/live-sessions.tsx`: persisted runtime decisions and execution metadata.
- `src/lib/integration-contracts.ts`: extension interfaces; non-local/other-framework adapters remain future work.

## API boundaries

`GET /api/bootstrap` creates a local HttpOnly, SameSite Strict administrative session and returns a CSRF token. `GET /api/state` requires that session. `POST /api/control` requires the session, an exactly matching loopback Origin, CSRF header, a UUID command ID, and a valid management schema. `POST /api/ingest` requires a Bearer agent credential and an explicit actor/session/action schema. All APIs require verified local transport. Rejected identity and permission decisions are persisted and return `403`; malformed input returns `400`; replay conflicts return `409`; capacity exhaustion returns `429`.

Protected memory cannot be written with an agent credential. Only independently authorized local administration can restore verified snapshots. Agent restoration validates the latest memory signature, rotates the credential, and creates a new bound session. Synthetic credentials are never returned in browser snapshots; tests and simulations derive them privately on the server.

## Test and verify

```sh
npm run typecheck
npm run lint
npm run test:unit
npm run test:integration
npm test
npm run build
npm run test:restart
npm run test:runtime
```

Vitest uses isolated temporary SQLite databases and applies the committed migration. Tests do not modify the running demo database. The suite covers authorized tasks, unknown identities, invalid credentials, impersonation, session mismatch, permissions, destination denial, protected memory, provenance tampering, signed restore, baseline deviations, quarantine/revocation, rotated credentials, concurrent duplicate ingestion, deterministic reset, command replay, secret redaction, and component rendering against actual incident records.

With the production server running in a second terminal:

```sh
GHOSTOPS_TEST_URL=http://127.0.0.1:3210 npm run test:api
```

This verification **resets disposable demonstration data**, exercises A/B/C/D over actual HTTP, verifies containment and old-credential denial, tests management/session/CSRF/host/proxy/schema/body-size boundaries, and leaves a completed demo state. It only accepts loopback targets. API verification reads the same private local key as the server, so run both from this project with the same environment.

Phase 2 typecheck, lint, **52 Vitest tests**, production build, production HTTP scenarios and fresh-process restart verification pass. `test:restart` starts isolated loopback production processes with a disposable SQLite database and separate signing key; it verifies persistent quarantine/revocation, replay denial, omitted-source provenance, forged-identity isolation, unauthorized rollback denial, story resume and verified restoration. Run it after building; it does not reset the presenter's database. Browser access remains blocked by a saved tool permission despite explicit retry authorization, so desktop/mobile visual inspection and live browser interaction are **not verified**. Static rendering and HTTP do not replace visual checks; see [docs/VERIFICATION.md](docs/VERIFICATION.md).

## Trust boundaries and limitations

Read [docs/SECURITY.md](docs/SECURITY.md) and [docs/SECURITY_MODEL.md](docs/SECURITY_MODEL.md) before changing exposure or integrating a real runtime. Upgrade with `npm run setup`, then reset disposable demo data: the additive migration preserves history but deliberately does not infer verified identity attribution for legacy observations or repair old mixed incidents.

- Demonstration decisions and all documents, infrastructure and decoy keys are synthetic. Integrated runtime requests/effects, credential checks, policy denial, audit records, correlation, containment and memory integrity/restoration are genuine.
- Optional model inference is implemented but was not executed in verification. Offline decisions and malicious regression probes are scripted. Bounded tools perform actual fixture/file/signed-memory effects; no shell, arbitrary code/path or tool-driven outbound network capability exists.
- This is a single-process local demonstration, not a production multi-tenant security service. It trusts the local OS user. Loopback is not independent administrative identity authentication. Do not deploy publicly without an independent authentication/authorization layer, TLS, proxy-aware transport verification, and operational hardening.
- HMAC integrity does not survive compromise of the server-held signing key. The MVP uses one local key to derive integrity, agent credential digests, transport attestation, and administrative tokens. A database/OS administrator can alter or erase unsigned event/incident history; the audit trail is not an externally immutable ledger.
- Baselines use straightforward counts and deterministic rules, not statistically validated machine learning. Burst detection uses a conservative 60-second request threshold; sequence evidence uses the last five requests. Baselines freeze after normal simulation; authorized policy changes need deliberate relearning/reset.
- Correlation is by actor and session, not an arbitrary cross-session attribution claim. Unknown actors are denied, not enrolled or declared confirmed compromised.
- Dashboard views intentionally bound recent data (180 events, 50 incidents, 80 memory versions/interactions, 20 runs, 30 sessions); headline counters query complete stored data. Detailed timelines include the actual events of each returned incident.
- The demo bounds requests at 2,000, administrative command receipts at 10,000, and all memory append paths at 1,000 versions; reset clears synthetic activity while retaining command receipts to prevent old reset replay. Reset explicitly reenrolls deterministic initial synthetic credentials/sessions; it is not production credential rotation. Ordinary restoration keeps old credentials revoked across restart. A new environment/database is an operator decision once receipt capacity is reached.
- Full dependency audit currently retains a high-severity unpatched `braces` advisory in development ESLint tooling; production dependency audit is clean. Prisma CLI transitive overrides are pinned and tested. Do not run lint against untrusted recursive glob patterns.

## Future integration roadmap

The bounded local MCP tools/client and optional OpenAI Agents SDK path now ship. Native Codex/Cursor interception, arbitrary MCP servers, production agent enrollment/rotation, independent administrator identity, OpenTelemetry export, immutable evidence, production memory stores, cloud telemetry and hardened OS sandboxing remain **future work**. Ghost Ops does not intercept all tool calls or operating-system activity.
