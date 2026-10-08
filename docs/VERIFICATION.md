# Verification record

Phase 3's current results and actual MCP/agent-process proof are in [PHASE3_VERIFICATION.md](PHASE3_VERIFICATION.md): 73 tests, current production build and live-tool verification. The Phase 2 results below are preserved as historical evidence. No real model inference has been executed.

Phase 3 browser retry again selected the authorized existing local Ghost Ops tab, but the saved site preference explicitly blocked access. The in-app browser was unavailable. No alternate surface or indirect browser workaround was attempted after that denial.

## Phase 2 independently verified results

2026-10-07, macOS, Node 24.10.0 / npm 11.19.0. Previous claims were independently checked before changes: 26 tests, typecheck and lint passed. Seven new regressions then failed on the original implementation, establishing the defects before correction.

| Check | Actual result |
| --- | --- |
| `npm run db:generate`, `npm run db:migrate` | Pass; additive attribution/ordinal migration applied without deleting legacy data |
| `npm run typecheck` | Pass |
| `npm run lint` | Pass, zero errors/warnings |
| `npm test` | 52 pass: 18 existing security, 25 adversarial, 7 integration, 2 rendering |
| Targeted unit / integration | 18 / 7 pass |
| `npm run build` | Pass, optimized Next.js 16.4 production build with four API routes |
| Production `test:api` on 3210 | Pass A/B/C/D and HTTP security negatives; 31 requests / 8 denied / 3 investigations / 1 quarantined |
| `npm run test:restart` | Pass with separate temporary SQLite/key, actual production HTTP and multiple fresh server processes |
| Guided ten-step scenario | Pass: clean story 27 requests / 6 denied / 2 investigations / 1 quarantined / 3 traps; latest memory verified |
| `npm audit --omit=dev` | Zero advisories |
| Full dependency audit | Five high entries, one unpatched development-only braces chain; no nonbreaking published fix |
| Desktop/mobile browser | Not executed: saved browser permission blocked access despite explicit user authorization; no workaround |

The restart verifier additionally checks omitted-source ingestion provenance, missing/invalid credentials, an impersonator's decoy request not completing victim correlation, agent-only rollback returning 401, cached replay denial after quarantine and credential rotation, persisted tamper evidence, story cursor resume, authorized historical restoration, and duplicate-command idempotency. Its extra old-session denial deliberately creates one additional genuine investigation: that probe's final totals are 28 requests / 7 denied / 3 investigations. It cleans up only its own temporary directory and does not alter the presenter database.

Adversarial tests also cover both collision arrival orders, forged frequency history, active-session/permission/integrity withdrawal on replay, source substitution, cross-agent memory read/write denial, eleven signed provenance fields, every latest memory key before restoration, admin expiry/signature modification/session-bound CSRF, each story step's replay and cursor conflict, stable timeline ordinals, and escaped untrusted render content. Original tests cover normal-workflow false positives, actual containment, snapshot restoration, secret redaction, concurrent ingestion and deterministic reset without an OpenAI key.

The independent pre-change canonical security report contains four validated families (three medium, one low). All four have corresponding implemented fixes and regression coverage; the sealed baseline report is not a post-fix scan. See SECURITY_MODEL.md for the disposition and trust boundaries. Legacy observations remain unverified rather than receiving inferred attribution.

Phase 2 clean-checkout verification used a git archive of `37415ab`, installed with `npm ci`, and passed fresh setup, typecheck, lint, all 52 tests, production build, production startup on 3211, original A/B/C/D HTTP checks and the disposable restart verifier. It used its own generated private key/database. npm emitted development-tooling deprecation/allow-scripts warnings and the already documented five advisory entries, but installation and native SQLite execution succeeded. The temporary server was stopped and its checkout moved to Trash (recoverable); the main application remains running on 3210 in completed A/B/C/D state. Verified implementation checkpoint: `0ff9b59`; documentation checkpoint: `37415ab`.

Runtime distinction: the main workspace suite used Node 24.10.0 / npm 11.19.0; the clean temporary checkout used its shell's Node 26.4.0 / npm 11.17.0. Both passed the listed checks. Node 22 minimum compatibility is based on package requirements, not an additional executed runtime matrix.

## Historical Phase 1 verification (retained)

Verified in Node v24.10.0 / npm 11.19.0 on macOS, 2026-10-07.

## Completed

- Committed SQLite migration applied to the local database and isolated Vitest databases.
- TypeScript checking and ESLint pass.
- 26 Vitest tests pass: 18 security/unit, 7 integration, 1 component-render test for all eight sections.
- Optimized Next.js production build succeeds with all four API routes.
- Production HTTP verification on `127.0.0.1:3210` executes normal, rogue, memory poisoning, and full compromise through `/api/control` and the same ingestion gateway.
- Exact final scenario counts: 31 requests, 8 blocked, 3 incidents, one ResearchAgent quarantined; signed memory restored and verified.
- HTTP negatives: no administrative session, missing CSRF, hostile Origin, hostile Host, forged proxy headers, forged internal transport attestation, strict-schema rejection, and oversized bodies all rejected.
- Old agent credentials remain rejected after authorized restoration. Invalid credentials rejected over HTTP. Exact command retry does not duplicate containment.
- `npm audit --omit=dev`: zero vulnerabilities after tested transitive overrides.
- Clean checkout exported from the committed repository: `npm ci`, `npm run setup`, `npm run build`, `npm start -- --port 3211`, and the complete HTTP verifier all passed with a fresh database and separately generated private key.

Final commands passed: `npm run typecheck`, `npm run lint`, `npm test` (26 tests), `npm run build`, and `GHOSTOPS_TEST_URL=http://127.0.0.1:3210 npm run test:api`. The targeted unit (18 tests) and integration (7 tests) suites are included in the final run; targeted earlier runs also passed. Verification leaves the main server running on port 3210 in the completed demonstration state.

## Fixed during verification

- Repeated manual quarantine after a new finding originally duplicated an audit action. Containment now recognizes already-contained state independently of incident association, and credential generations distinguish a later fresh containment.
- Next.js injects forwarded headers into requests. Rejecting them inside a route denied legitimate local traffic. The custom transport now checks incoming headers and actual socket before Next.js injects its own headers; API routes verify transport attestation.
- Node fetch ignores a forged Host override. The negative Host test now sends an actual wire Host header via `node:http`; the application rejects it.
- Secret redaction tests ensure neither credential digests nor memory signatures appear in snapshots.

## Unverified browser checks

The browser tool refused access to the local application, reporting that site permission was declined. No alternate browser or indirect browser automation was attempted. **Rendered desktop/mobile visual appearance and live browser interaction are not verified.** Production HTTP and static component rendering do not substitute for these visual checks.

Manual checklist for the presenter:

- Desktop at 1440×900: confirm navigation, eight metrics, all five decoys, engine links, enforcement decisions and recent activity are readable without clipped content.
- Mobile at 390×844: open/close menu, confirm heading controls fit, inspect two-column metrics and stacked panels, scroll wide tables horizontally, and verify no page-wide horizontal overflow.
- Run A/B/C/D using actual dashboard buttons; polling should update counts within 2.5 seconds.
- Search activity; change agent tabs; filter critical investigations; expand an evidence event.
- Select a tampered memory version (restore disabled), select verified history (restore enabled), verify the latest signature.
- Restore the contained ResearchAgent; verify status active and run normal operation again.
- Open timeline replay and scrub with next/previous and the range slider; counts/actions should remain unchanged.
- Verify keyboard focus and reduced-motion preference; confirm the trust-boundary explanation opens and closes.
- Start a new guided demo; execute all ten steps, refresh midway and check cursor resume. Open a linked investigation from an expanded event, filter severity/status/engine, and follow linked agent and memory evidence.

## Known dependency limitation

Full `npm audit` reports the unpatched `braces` advisory through development lint tooling. Production dependency audit is clean. This limitation is documented in README and SECURITY; no forced downgrade or unsupported replacement was used to hide it.
