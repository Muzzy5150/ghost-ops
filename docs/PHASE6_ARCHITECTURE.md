# Phase 6 architecture

## Execution path

```text
Loopback administrator + session/CSRF + strict scenario/budgets
  → persisted ExperimentRun (one active SQLite lease)
  → private run credential and bound agent session
  → scripted dispatcher OR bounded official OpenAI Agents SDK
  → actual loopback MCP tools/call (local/model modes)
  → existing identity/session/current quarantine/resource/tool policy
  → authorized bounded handler OR persisted denial without execution
  → existing four engines / evidence / incident correlation
  → ordinal experiment observations + minimized model receipts
  → Security Lab history, comparison and evidence inspectors
```

Offline mode uses the existing gateway and its synthetic executor. Its security decisions are real policy evaluations, but no local tool handler executes. Local mode makes real MCP calls with scripted decisions. Model mode uses actual inference only after environment enablement and per-run cost consent; inference is not implied by a runtime session.

## Additive persistence

`20261008030000_security_lab` adds `ExperimentRun`, `ExperimentObservation` and `ModelInvocation`; it does not replace security events, requests, policy decisions, memory or incidents. Runs contain scenario, identity/session references, mode, budgets, command fingerprint, timestamps, lease/cancellation state and aggregate results. Observations refer to actual request/event IDs and preserve operation order. Invocation receipts retain configured provider/model, status, response ID, latency and reported usage—not prompts, documents, provider errors, tool output or private reasoning.

The migration verifier uses a consistent read-only backup of the existing database and checks every original table's payload after migrating the clone. The presenter database and its signing key are untouched by that test.

## Orchestration and authority

- Start and cancel use the existing administrative authentication, loopback attestation, strict input/body limits and CSRF boundary. Command UUIDs share the existing namespace; identical delivery returns its receipt, altered reuse fails.
- One nullable unique `slot` permits one active lab experiment. A process UUID and cancellation flag are checked before inference and tool dispatch. Completed/history reads cannot execute work.
- Default runs create isolated research identities and signed policy/notes. The per-run credential is server-derived, stored only as a digest, never shown to the model or browser, and revoked at completion. The session is also closed.
- An explicitly selected active local runtime agent retains its permissions and existing credentials. Lab completion closes only the run's authority. Quarantining an existing identity requires extra consent and intentionally affects that identity's other sessions/credentials; it is never silently restored.
- Cancellation occurs at safe operation boundaries. A dispatched handler may finish; aborting an inference does not guarantee the provider stopped billing.
- On first lab access after process restart, foreign-worker active runs become `interrupted`, their authority closes and incomplete invocations are marked interrupted. They are **not** resumed or replayed automatically.
- The existing simulation reset now excludes lab identities, events, evidence and memory, including unverified rogue-actor requests. It never erases experiment history.

Containment verification uses a persisted, identity-verified `AGENT_QUARANTINED` denial with null execution. Only then is the recorded quarantine action linked to the same actor/session investigation and the investigation marked contained. Applying a response and proving enforcement are separate observations.

## Presentation and limits

Security Lab is the fourteenth workbench tool and a third preset; the original thirteen windows, Operations and Incident Room remain. Valid prior v2 arrangements append a parked lab window without losing geometry or graph positions. Alt+3 opens the lab preset; existing window and mobile navigation remain available. History returns the latest 50 runs, their observations, invocation receipts and bounded persisted events, so evidence can be inspected beyond the global recent feed.

Limits: 500 runs, 100 isolated lab identities, one active run, existing 2,000-request/1,000-memory-version and 10,000-command caps. This is a single-process local research service, not a durable distributed queue or OS sandbox. A stalled worker requires cancellation or a restart followed by lab access; there is no automatic paid retry. Use a separately archived environment rather than deleting evidence to reach capacity.

Key files: `src/server/lab.ts`, `src/runtime/model.ts`, `src/lib/lab-contract.ts`, `src/app/api/lab/`, `src/components/workspace/security-lab.tsx`, `prisma/schema.prisma`. Model adapter details and cost limitations: [MODEL_EXECUTION.md](MODEL_EXECUTION.md).

Production readiness still requires independent human admin identity, hardened execution isolation, durable workers, distributed concurrency controls, operational retention/rate/cost policies and genuine provider smoke verification. Only integrated MCP calls are protected—not arbitrary OS, Codex or Cursor actions.
