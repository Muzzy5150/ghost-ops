# GHOST OPS

Detect the rogue. Trace the behavior. Protect the memory.

Ghost Ops is a working local counterintelligence demonstration for autonomous AI agents. Four engines correlate identity, behavioral deviation, signed memory history, and synthetic deception interactions into explainable investigations. The dashboard uses actual SQLite records, and the gateway enforces every tool decision before a simulated effect can occur.

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

The default database is `prisma/ghostops.db`. First startup creates a private random signing key at `.ghostops/integrity.key` with mode `0600`. Both paths are gitignored. Back up the key together with the database. Changing or losing the key invalidates existing signatures and agent credential hashes; the disposable demo must then be reinitialized with **Reset environment**. Never copy this key into dashboard configuration or logs.

## Two-minute demonstration

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
    → bounded synthetic executor → persisted request + event
    → AgentDNA / ShadowWatch / MemoryGuard / GhostTrap
    → actor/session correlation → incident + evidence timeline
    → quarantine / credential revocation / verified snapshot restoration
    → polling dashboard (2.5 seconds)
```

Mutation commands are serialized in the local server process and committed in SQLite transactions. A simulation uses the exact gateway used by `/api/ingest`. Request and command IDs have persistent fingerprint receipts: identical replay returns the original receipt; altered reuse returns `409`. Replayed receipts describe the original decision and do not re-execute an action. Read-only timeline replay also never re-executes effects.

| Engine | Implemented method |
| --- | --- |
| AgentDNA | Trusted observation counts, frozen tool/resource/sequence baselines, unseen destinations, privileged-sequence and burst rules, post-ingestion escalation evidence |
| ShadowWatch | Registry, hashed high-entropy credentials, credential-bound sessions, explicit tool/operation/resource/destination allowlists, enforced quarantine and revocation |
| MemoryGuard | SHA-256 content hashes, server-held HMAC over content and provenance, version history, protected write denial, live integrity validation, restoration into a new signed version |
| GhostTrap | Five inert local catalogue resources; interactions record actor, session, operation, request, event, and linked incident |

Critical correlation requires **behavior deviation + memory manipulation + decoy interaction for the same actor/session**. Unknown identity or credential violations generate high-severity investigations; memory plus behavior is high. Other findings create medium investigations. The incident severity never decreases automatically. A decoy interaction alone creates a reviewable signal; it never proves malicious intent or automatically quarantines an actor. The exact rules live in `src/server/investigation.ts`.

All eight sections work: Overview, Agent Registry, AgentDNA, ShadowWatch, MemoryGuard, GhostTrap, Investigations, and Demo Control. Controls initialize/reset, run scenarios, inspect actual receipts, filter/search recent activity, verify/restore snapshots, quarantine/revoke/restore agents, expand evidence, and replay stored timelines.

Key files:

- `prisma/schema.prisma`: agents, credentials, sessions, profiles, requests, policy decisions, events, findings, incidents, evidence, memory versions, traps, interactions, containment, runs, receipts, and source documents.
- `src/server/gateway.ts`, `policy.ts`: credential/session checks, permission enforcement, synthetic dispatch, behavior analysis.
- `src/server/memory.ts`, `simulation.ts`: signed versions, verification, restoration, fault injection, and four real demo workflows.
- `src/server/investigation.ts`, `service.ts`: correlation, auditable containment, transactions, management, and dashboard snapshot.
- `scripts/server.ts`, `src/server/http.ts`, `src/app/api/`: local transport, administrative session, CSRF, body limits, and API boundaries.
- `src/components/`, `src/app/globals.css`: responsive graphite/green operations console.
- `src/lib/integration-contracts.ts`: future adapter contracts, not implemented integrations.

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
```

Vitest uses isolated temporary SQLite databases and applies the committed migration. Tests do not modify the running demo database. The suite covers authorized tasks, unknown identities, invalid credentials, impersonation, session mismatch, permissions, destination denial, protected memory, provenance tampering, signed restore, baseline deviations, quarantine/revocation, rotated credentials, concurrent duplicate ingestion, deterministic reset, command replay, secret redaction, and component rendering against actual incident records.

With the production server running in a second terminal:

```sh
GHOSTOPS_TEST_URL=http://127.0.0.1:3210 npm run test:api
```

This verification **resets disposable demonstration data**, exercises A/B/C/D over actual HTTP, verifies containment and old-credential denial, tests management/session/CSRF/host/proxy/schema/body-size boundaries, and leaves a completed demo state. It only accepts loopback targets. API verification reads the same private local key as the server, so run both from this project with the same environment.

Typecheck, lint, Vitest, production build, and production HTTP scenarios have passed. Browser access was declined by the browser tool, so desktop/mobile visual inspection and live browser interaction are **not verified**. Responsive styles and all eight section renders are covered by code/component checks; use [docs/VERIFICATION.md](docs/VERIFICATION.md) for the remaining manual checks.

## Trust boundaries and limitations

Read [docs/SECURITY.md](docs/SECURITY.md) before changing exposure or integrating a real runtime.

- Agent task sequences, documents, tools, infrastructure, endpoints, and all decoy keys are synthetic. Credential verification, policy denial, audit records, deterministic correlation, quarantine, revocation, signed memory validation, and restoration are genuinely enforced in backend code.
- No LLM runs in this MVP. The simulator explicitly submits adversarial attempted actions after ingestion; it does not claim a prompt actually compromised a real model. No shell, arbitrary code, real filesystem tool, or outbound network executor exists.
- This is a single-process local demonstration, not a production multi-tenant security service. It trusts the local OS user. Loopback is not independent administrative identity authentication. Do not deploy publicly without an independent authentication/authorization layer, TLS, proxy-aware transport verification, and operational hardening.
- HMAC integrity does not survive compromise of the server-held signing key. The MVP uses one local key to derive integrity, agent credential digests, transport attestation, and administrative tokens. A database/OS administrator can alter or erase unsigned event/incident history; the audit trail is not an externally immutable ledger.
- Baselines use straightforward counts and deterministic rules, not statistically validated machine learning. Burst detection uses a conservative 60-second request threshold; sequence evidence uses the last five requests. Baselines freeze after normal simulation; authorized policy changes need deliberate relearning/reset.
- Correlation is by actor and session, not an arbitrary cross-session attribution claim. Unknown actors are denied, not enrolled or declared confirmed compromised.
- Dashboard views intentionally bound recent data (180 events, 50 incidents, 80 memory versions/interactions, 20 runs, 30 sessions); headline counters query complete stored data. Detailed timelines include the actual events of each returned incident.
- The demo bounds requests at 2,000, administrative command receipts at 10,000, and administrative memory history at 1,000 versions; reset clears synthetic activity while retaining command receipts to prevent old reset replay. Restarting with a new key/database is an operator decision once receipt capacity is reached.
- Full dependency audit currently retains a high-severity unpatched `braces` advisory in development ESLint tooling; production dependency audit is clean. Prisma CLI transitive overrides are pinned and tested. Do not run lint against untrusted recursive glob patterns.

## Future integration roadmap

Implement and test runtime adapters for MCP, Codex, Cursor, OpenAI agents, and other runtimes behind the same policy gateway. Add credential enrollment/rotation APIs, independent administrator authentication and role separation, OpenTelemetry export, immutable remote evidence retention, production memory-store adapters, cloud infrastructure telemetry, carefully sandboxed effect executors, and evidence-grounded optional model explanations. These are **interfaces and roadmap only**, not supported integrations today.
