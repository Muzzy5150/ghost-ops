# Phase 2 security model and audit disposition

## Phase 3 additions

The historical audit disposition below remains valid for Phase 2. The platform now also has an authenticated bounded local MCP runtime, random scoped client credentials, actual fixture/file/signed-note handlers, explicit simulated/live provenance and independent operator-approved baseline freezing. All policy checks remain server-side; model explanations never authorize effects. Simulation reset preserves runtime history and containment. Private writable data is excluded from build traces. Additional 20 runtime regressions and actual HTTP/fresh-process checks are recorded in PHASE3_VERIFICATION.md.

The earlier “all tools synthetic” description applies to the original simulator, not the new actual local handler execution. Resource content/status/decoy secrets remain synthetic. Optional official model inference is implemented but **not live-provider verified**. The client process is not OS-sandboxed; local OS administration is trusted. Same-identity credential redelivery, arbitrary MCP/OS interception and production controls remain future work.

See [SECURITY.md](SECURITY.md) for deployment restrictions and [ARCHITECTURE.md](ARCHITECTURE.md) for implemented boundaries.

## Audit scope and evidence

The independent pre-change review covered all tracked product source/config/docs/tests (50 files) plus dependency-lock metadata at `bcdaf100`. A baseline auditor and a focused investigator inspected the four engines, API/transport/admin boundaries, source provenance, memory signatures, replay, rendering, secrets and effect isolation. The canonical report describes that baseline, not an assertion that its findings remain unfixed. Source review excluded generated framework/client code, dependency-owned implementations, runtime databases and private key contents. Seven isolated regression cases failed before remediation and passed afterward.

## Verified fixes

| Broken invariant | Correction | Regression / verification |
| --- | --- | --- |
| A denied identity claim could add a missing trap signal to another agent's memory/behavior incident, triggering victim quarantine; forged requests also polluted history | Explicit credential/session attribution; separate claimed/verified namespaces; only verified history for AgentDNA; containment guard | Impersonator cannot complete victim correlation, forged frequency cannot create a burst; production HTTP denies forged decoy without quarantining victim |
| Successful cached receipts returned output before current authorization | Recheck status, credential/session, policy and memory integrity; redact output on denial; immutable original receipt and deduplicated replay-denial event | Quarantine/revoke/session/permission/integrity tests; fresh-process production HTTP confirms replay remains denied after restart and rotation |
| Omitted sourceId returned untrusted content without provenance | Server-owned resource-to-source mapping, source substitution rejection, hash validation, transactional session provenance | Omitted ID taints the session, does not train baseline, produces post-ingestion evidence; actual production ingestion tested |
| Colon-containing actor/session tuples could share a correlation key | Unambiguous JSON tuple plus attribution namespace; exact event selection and event-ID trap linkage | Both arrival orders of colliding tuples retain separate investigations |

Additional hardening: randomized signed admin sessions with server-enforced expiry and session-bound CSRF; full `X-Forwarded-*` rejection; all-key memory checks before restoration; shared memory-capacity guard; deterministic event ordinals; truthful suspected-compromise labels; no false success toast for failed integrity verification. The React review influenced readable evidence presentation, escaped text, keyboard focus handling, sequential polling, and stale-response protection. Browser-level interaction checks remain outstanding.

## Trust boundaries and remaining limitations

- The supported deployment is local and single-process. A trusted local OS user can bootstrap administration. Loopback, a cookie and CSRF are not independent administrator authentication; never expose management publicly or behind a proxy without a new verified identity layer and TLS.
- All agents, source documents, tools, infrastructure and decoys are synthetic. The simulator submits adversarial actions explicitly. It does not execute source instructions, invoke an LLM, scan external systems, run commands or perform network effects.
- A verified credential/session identifies the submitting authority, not malicious intent. An anomaly is a rule deviation; decoy interest is evidence; multi-signal correlation establishes suspected compromise, not scientific certainty.
- Signing-key compromise defeats memory integrity and all capabilities derived from that key. Unsigned event/incident records can be altered or erased by the trusted OS/database administrator; no external immutable ledger exists.
- Reset is an explicitly privileged simulation reset: it reenrolls deterministic initial synthetic credential/session identities. It is not a production credential-rotation API. Ordinary restoration rotates credentials; prior credentials remain revoked within that environment lifecycle and across restart.
- Legacy attribution is not retroactively trusted, and historical correlation mistakes are not silently rewritten by migration. Use a demo reset after upgrading.
- Counts/baselines/sequence/burst rules are transparent but not statistically validated ML. Legitimate workload changes may need baseline relearning. Correlation remains session-local.
- Requests (2,000), memory versions (1,000) and command receipts (10,000) are bounded. Reset retains command receipts, so exhausted receipt capacity requires an operator-managed new database. This is not a distributed rate-limited production service.
- The additive migration, unit/integration/rendering tests, production API scenarios and fresh-process restart tests are verified. Actual desktop/mobile visuals, pointer/keyboard browser interaction and accessibility audit are not verified: the browser tool's saved permission still blocked access after user authorization. No alternate browser workaround was attempted.

## Development dependency advisory

On 2026-10-07, `npm audit` reports five high-severity entries in the single development chain `eslint-config-next → @next/eslint-plugin-next → fast-glob → micromatch → braces`. Production audit (`--omit=dev`) reports zero. The [reviewed braces advisory](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm) has no patched release; `npm view braces version` returns 3.0.3 and the current Next lint configuration is 16.4.0. npm's proposed fix downgrades the lint configuration to 14.2.35, a major/noncompatible stack change, not a verified nonbreaking remediation. No force downgrade or fabricated override was applied. Avoid untrusted lint/glob inputs and recheck upstream releases. Existing Prisma CLI overrides remain pinned and verified by migrations/tests/build.
