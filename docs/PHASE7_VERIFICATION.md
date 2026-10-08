# Phase 7 independent verification

Verified **2026-10-08**, implementation **4047f00** (after `f698588` and evidence-specific benchmark correction `230953c`). Baseline 175 independently reran; final suite has **217 passing tests across 17 files**. No paid inference or browser tool was invoked.

## Executed checks

| Check | Actual result |
| --- | --- |
| Existing baseline `typecheck`, lint, tests | 175 pass before changes |
| Final workspace typecheck / lint / tests / diff check | Pass; zero lint warnings; 217/217 |
| Immutable clean checkout `npm ci` | Pass; locked installation; no new dependencies |
| `npm run setup` | Fresh SQLite, five migrations, synthetic seed; separate checkout only |
| Typecheck / lint / tests in clean checkout | Pass; 217/217 in 17 files |
| `npm run build` | Optimized production build succeeds, including new lab/preflight/benchmark/evidence routes |
| `npm run test:lab` | 16 A–H local/offline production HTTP experiments; actual handlers, identity isolation, policy/memory denial, correlation, CSRF/idempotency, cancellation/restart, restoration/reset preservation pass |
| Phase 7 production lab additions | Dry preflight no effects, missing-provider rejection, read-only benchmarks, authenticated run/incident ZIP, independent verification/tamper failure, standard unzip, export CLI and eight-stage local presentation pass |
| `npm run test:runtime` | Original A/B/C/D HTTP checks, actual MCP/separate agent processes, summary files/notes, untrusted provenance, correlation, containment/restart, restoration and exact live demo pass; model calls 0 |
| `npm run test:restart` | Fresh-process quarantine/revoked credentials/cached-output denial/idempotent audit and all ten guided steps with tamper/restore/replay pass |
| `npm run test:lab:migration` | Consistent read-only presenter clone: all 17 original table payloads preserved; no key accessed |
| Populated Phase 6 migration fixture | Disposable old-schema database with historical run/observation/SDK-only success; clone migration preserves all 20 old table payloads, including legacy values; source/key untouched |
| Reviewer sample verifier | Actual saved valid ZIP hash-only success; structurally valid altered copy exits 1 |
| `npm audit --omit=dev` | Zero production vulnerabilities |
| Full `npm audit --json` | Five high, development-only lint-chain entries remain; no force/downgrade applied |

Fresh installation/build verification ran on Node 26.4.0/npm 11.17.0; workspace checks on Node 24.10.0/npm 11.19.0. Minimum declared Node 22.12+ was not separately matrix-tested. The immutable code archive was installed into a task-owned temporary directory, never over the running presenter's dependencies or `.next`. A prior immutable `f698588` full clean verification also passed 213 tests before final regression additions.

## Added regression coverage

42 additional tests cover exact preflight/configuration/credential/policy/expiry/command binding, unavailable provider, approval replay/forgery, CI transport refusal, explicit mock classification, cancellation, key rotation, legacy counter nonpromotion and interactive CLI gating. Benchmark tests cover actual A–H evidence, version/variation, actor-versus-probe denominators, N/A, independent unsafe-handler detection, benign deviations versus critical overreaction, manual versus automatic quarantine and equal-timestamp containment ordering.

Forensic tests cover scoped record ordering, actual at-export memory verification, redaction before hashing, hash-only warnings, missing/changed files, regenerated valid-CRC tampering, invalid authentication/scope, unauthorized export and unsafe/oversized ZIPs. Synthetic DOM tests exercise two-step confirmation, stale budgets, read-only comparison/filtering, proof badges and actual persisted-data report controls. Final logging regression overrides debug-sensitive SDK settings and confirms suppression.

These are unit/integration, actual production HTTP/MCP and **synthetic DOM** checks, not screenshot or physical browser gestures. Original graph/window/responsive interaction tests remain in the passing suite. No visual design changes or saved-permission workarounds were attempted.

## Observed benchmark results

The exact eight-scenario local fixture has 28 requests (20 allowed/8 denied), all 8 prohibited requests blocked before handlers, 3/3 protected writes prevented, 1/1 containment verified, 4/4 decoy evidence, zero unsafe executions, 0/2 defined benign critical/automatic-containment false positives and 5/5 qualifying task effects. Actor-attempt runs are 2/8; prohibited-request runs including independent probes are 6/8.

The saved production HTTP [benchmark artifact](../artifacts/phase7-evidence/benchmarks.json) has 18 rows (17 completed, one interrupted), 10 local/8 offline, zero genuine-provider calls. Completed mixed-mode evidence: policy block 16/16, protected write prevention 6/6, containment 2/2, decoy collection 8/8, unsafe handlers 0, defined benign false positives 0/5, task effects 11/11, actor-attempt runs 4/17, all-phase prohibited-request runs 12/17 and coverage 8/8. An additional eight-stage local campaign executes after this snapshot and passes independent exports/verifiers. None of these small scripted synthetic datasets measures real-model robustness, population false-positive accuracy or summary quality.

Actual review files: [valid containment ZIP](../artifacts/phase7-evidence/containment-experiment.zip), [intentionally altered copy](../artifacts/phase7-evidence/intentionally-altered-copy.zip), [scope/key limitations](../artifacts/phase7-evidence/README.md). The signing key is not included. Hash-only validation succeeds on the original and fails on the altered copy; matching disposable-key HMAC validation passed during generation.

## Preserved presenter

Main PID **68163** remains bound to `127.0.0.1:3210`. Existing page/authenticated state respond 200. Data remains 4 agents / 41 tool requests / 5 incidents / 10 memory versions / 10 runtime requests / 2 quarantined agents. No main migration, reset, build, restart or key rotation was performed. The already-running old process does **not** expose the new Phase 7 build until normal operator activation.

## Pending / limits

- **Genuine external model inference is pending**: disabled configuration, no configured model/key and no fresh paid-execution approval. SDK mocks and injected HTTP fixtures are not provider proof. `test:model` was not executed. Read [REAL_MODEL_VERIFICATION.md](REAL_MODEL_VERIFICATION.md) for guarded setup.
- Visual/browser sign-off remains pending and was expressly excluded; no screenshots, console inspection or physical responsive gestures are claimed.
- Trusted host/OS operator, private signing key and single local worker remain assumptions; no independent admin identity, external evidence attestation, general OS interception or production multi-tenancy.
- Current provider support is OpenAI only; model A–C; G/H local/offline. No qualitative task grader or large-document scenario is implemented.
- Cancellation stops new boundary operations, not already committed effects or guaranteed provider billing. CI never runs paid requests.
- Benchmarks are bounded history projections with defined denominators; historical configurations/proof are not reconstructed. No universal accuracy claim.
- Existing full-audit advisories follow `braces → micromatch → fast-glob → @next/eslint-plugin-next → eslint-config-next`. npm proposes incompatible `eslint-config-next@14.2.35`; no destabilizing remediation was forced. Installation also warns about deprecated toolchain helpers; production audit is clean.

## Reproduction

```sh
npm ci
npm run setup                       # fresh/disposable checkout only
npm run typecheck
npm run lint
npm test
npm run build
npm run test:lab
npm run test:runtime
npm run test:restart
npm audit --omit=dev
npm run test:lab:migration            # read-only consistent source clone
```

HTTP test runners use disposable state and loopback ports. Do not run the older `test:api` against a retained presenter; it deliberately resets simulated history. Run full installation/build in a separate checkout when an existing process is serving `.next`.
