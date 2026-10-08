# Phase 7: evidence-driven evaluations

Phase 7 extends the existing Security Lab, not the security gateway or application shell. The four engines, bounded local MCP handlers, SQLite history, signed memory, fourteen workspace tools (the original thirteen plus Security Lab), layouts and guided demos remain intact. There is no new unrestricted execution path.

## Execution and authority

```text
Authenticated local operator
  → strict versioned experiment configuration
  → model-only dry preflight and fresh exact-run approval
  → persistent run / existing single-worker lease
  → scripted choices OR official Agents SDK + bounded Responses transport
  → authenticated MCP → existing fail-closed gateway → bounded handler
  → existing security events, policy decisions and investigations
  → persisted observations / minimized invocation receipts
  → read-only benchmarks and scoped authenticated evidence export
```

Management retains actual-loopback transport attestation, Host/Origin/fetch-metadata checks, random administrative session and CSRF. Agent credentials cannot authorize exports or lab management. This is local OS-operator authority, not independent multi-user administrator authentication. Do not publish or proxy this MVP.

Model preflight binds a 120-second approval to the command UUID, scenario/version/variation, selected identity, budgets, current permissions, provider/model and a private HMAC of the configured credential. The confirmation token is authenticated, not an API credential. A changed configuration, credential, command or expired token fails closed. Exact previously committed command replay returns history without executing effects. CLI model execution additionally requires `--live` and interactive exact-command confirmation; CI/test paths prohibit default provider network calls.

Only OpenAI is supported. Every provider-selected tool uses the existing MCP client; policy remains outside writable agent memory. Cancellation prevents new operations at safe boundaries; already dispatched effects may finish, and aborting a provider request is not a billing guarantee. Interrupted workers are marked interrupted after restart, never automatically resumed or replayed.

## Additive persistence

Migration `20261008040000_forensic_evaluations` adds scenario version/configuration and a private credential-binding digest to `ExperimentRun`, and reported model/provenance/safe error code to `ModelInvocation`. No tables or existing records are deleted. Historical runs default to version 1.0 and unverified invocation provenance; successful historical SDK execution is not retroactively promoted to genuine inference. New runs default to 2.0.

Configuration records the scenario definition, variation, fixed or existing assigned permissions, policy hash, gateway policy version, public provider status and registered decoy resources. Private credential binding is omitted from dashboard and export projections. Existing events, requests, findings, trap interactions, memory versions and containment actions remain authoritative; no duplicate event store is introduced.

## Main implementation

| Component | Responsibility |
| --- | --- |
| `src/lib/lab-contract.ts`, `evaluation-contract.ts` | Strict A–H definitions, versions, budgets, proof classification |
| `src/server/preflight.ts` | Read-only configuration review and exact approval verification |
| `src/runtime/model.ts` | Official SDK, bounded official transport, receipt evidence, suppressed sensitive logging |
| `src/server/lab.ts` | Existing orchestration, persisted phases, G/H, cancellation and credential binding |
| `src/server/benchmarks.ts` | Actual-record metrics and historical comparison projection |
| `src/server/evidence.ts` | Scoped minimized evidence, at-export memory verification and deterministic HTML |
| `src/lib/evidence-zip.ts`, `evidence-verification.ts` | Bounded stored ZIP profile, strict manifest, SHA-256 and authentication checks |
| `src/components/workspace/security-lab.tsx`, `lab-benchmarks.tsx` | Preflight confirmation, provenance, comparison and download controls |
| `scripts/evaluation-demo.ts`, `evidence-*.ts` | Offline/local presentation and independent verification commands |

The benchmark API reads up to 500 historical runs, rejects excessive event projections rather than silently returning partial metrics, and the UI initially renders the latest 50 comparison entries. Polling never re-executes tools. SDK metadata is minimized; private chain of thought, prompts, document contents, raw credentials and raw tool outputs are not forensic payloads.

## Limits

Host and signing key are trusted. Transport evidence distinguishes real successful provider responses from explicit injected fixtures, but is not external attestation of an uncompromised host. Library callers with host-level execution can bypass application conventions; Ghost Ops constrains integrated calls, not arbitrary OS/Codex/Cursor activity. Campaign CLI stages reuse persisted lab runs; there is no durable campaign scheduler or automatic rollback. Visual QA remains pending and was intentionally not attempted.

See [real-model verification](REAL_MODEL_VERIFICATION.md), [benchmarks](SECURITY_BENCHMARKS.md), [evidence trust model](FORENSIC_EVIDENCE.md) and [verification results](PHASE7_VERIFICATION.md).
