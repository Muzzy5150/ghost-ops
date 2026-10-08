# Phase 6 verification

2026-10-08. Implemented without browser access, paid inference or presenter reset/restart/migration. Baseline independently rerun before changes: **140 passing tests**. Core milestone: `b9294b4`; verified containment-evidence correction and chronologically additive migration: **`2eb5b03`**.

## Executed checks

| Check | Actual result |
| --- | --- |
| Main workspace `npm run typecheck` | Pass |
| Main workspace `npm run lint` | Pass, zero warnings/errors |
| Main workspace `npm test` | **175 pass / 13 files**; all 140 baseline tests retained |
| `npm run test:lab:migration` | Pass on a consistent read-only clone: all **17 original tables** have identical payload fingerprints after the additive migration; no signing key accessed |
| Immutable `2eb5b03` archive: `npm ci`, `npm run setup` | Pass; fresh SQLite/key state separate from presenter |
| Archive typecheck / lint / tests | Pass / zero warnings / **175 pass** |
| Archive production build | Pass; existing routes plus `/api/lab` and `/api/lab/cancel` |
| Archive `npm run test:lab` | Pass: **12 A–F local/offline runs**, actual MCP handlers, protected-memory denial/intact snapshot, spoof and unknown attribution, trap/correlation, contained investigation/action link, start idempotence, CSRF, real process restart, stale-worker interruption, signed restoration, demo-reset preservation and separate operator CLI |
| Archive `npm run test:runtime` | Pass: original A/B/C/D HTTP scenarios/security negatives, actual MCP client and separate agent processes, reads/files/notes, untrusted provenance, denial, correlation, restart containment/restoration and exact live-demo CLI |
| Archive `npm run test:restart` | Pass: fresh-process quarantine/revocation/cached-output denial/idempotent audit; ten guided steps, persisted tamper detection, verified restoration/resume and replay without repeated effects |
| `npm audit --omit=dev` | **0 vulnerabilities** |
| Full `npm audit --json` | **5 high development-only entries** in the existing braces/micromatch/fast-glob/Next ESLint chain; recommended force fix is an incompatible major downgrade, not applied |
| Real provider smoke test | **Not run**: no enabled model, configured model identifier or project credential; no paid request attempted |
| Browser, screenshots, console/touch/visual QA | **Not run**, expressly excluded by Phase 6 instructions; visual sign-off pending |

Main workspace: Node 24.10.0 / npm 11.19.0. Clean archive: Node 26.4.0 / npm 11.17.0. Node 22 minimum follows package requirements; no separate Node 22 matrix ran. Native SQLite installs and executes in both verified environments. Installation emitted existing development deprecation/install-script notices; no dependency force upgrades were applied.

## New coverage: 35 tests

- `tests/lab.test.ts`: **18** database/gateway/lifecycle cases. Real bounded handlers, offline labeling, untrusted source evidence, protected memory and continuation, invalid/unknown identity isolation, honeypots/correlation, handler-free quarantine, contained incident/action, idempotence, lease/cancel/restart, selected-agent authority isolation, preserved demo reset, strict consent/configuration, command namespace and authenticated routes.
- `tests/model-budget.test.ts`: **8** adapter/configuration cases. Call/cancel/boundary checks, conservative input/token reservation, missing/overreported usage, sanitized failure, disabled retries/tracing/storage, output limits and fail-closed configuration.
- `tests/model-agent.test.ts`: **3** tests through the actual official Agent/Runner/tool loop with a **mocked provider**, not inference. Denied-tool continuation, persisted invocation fixtures, public-refusal interpretation, independent enforcement probe and inconclusive incomplete workflow.
- `tests/lab-ui.test.tsx`: **6** synthetic DOM tests using backend-created experiment/evidence fixtures. Start/CSRF/schema/provenance, read-only comparison, evidence/incident navigation, preserved thirteen-window preferences/lab preset and historical evidence beyond the recent feed. These are not screenshots or browser visual tests.

Original window/React Flow DOM tests continue to cover dragging/resizing/focus/persistence, graph selection/filtering/pan/zoom, evidence navigation and responsive selectors. No physical mouse/touch or viewport appearance claim follows from them.

## Regression found and corrected

A strengthened containment assertion failed before correction: quarantine truly blocked the handler, but the investigation created by the subsequent denial still said `investigating` and lacked the earlier action. The lab now verifies the stored denial and its actor/session attribution, links that actual response and marks the case contained. `CONTAINMENT_APPLIED` remains separate from verified enforcement. The targeted red test and final green full/HTTP suites establish the correction.

Renaming the new migration into chronological order temporarily left an empty task-created directory; Prisma correctly failed closed with P3015. Removing only that empty directory restored discovery. Final fresh installation and clone preservation checks pass; no original applied migration was removed.

## Presenter preservation

PID **68163** on `127.0.0.1:3210` remains the original presenter. Main `.next`, database and signing key were not replaced; no scenario, setup, reset or migration ran against it. Final page and authenticated snapshot return **200**; persisted totals remain **4 registered agents / 41 requests / 5 incidents / 2 quarantined**, with the original **10 memory versions / 10 runtime requests** preserved. The original database was read only for clone verification. Phase 6 activation there is an explicit operator stop/migrate/build/restart step, not claimed complete here.

## Reproduce and limitations

In a separately built checkout, `npm run test:lab`, `npm run test:runtime` and `npm run test:restart` create and clean their own disposable databases, keys, workspaces and loopback processes. `npm run test:lab:migration` migrates a clone only. Do **not** run `test:api` against preserved presenter data; that legacy verifier intentionally resets original synthetic scenarios.

The optional paid smoke command and limits are in [MODEL_EXECUTION.md](MODEL_EXECUTION.md); it requires deliberate server enablement and `GHOSTOPS_RUN_MODEL_SMOKE=1`. No inference, general model resistance, production protection or visual sign-off is asserted by this report. Remaining architectural/privacy/cost limitations: [PHASE6_ARCHITECTURE.md](PHASE6_ARCHITECTURE.md).
