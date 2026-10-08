# Phase 5 verification

## Scope and baseline

2026-10-07, macOS, Node 24.10.0 / npm 11.19.0. Independently reran the Phase 4 suite before edits: **117 tests passed**. This phase preserves server code, database schema/migrations, authentication, MCP tools and the presenter database. Only frontend projection/presentation/preferences, tests, documentation and the pinned layout dependency change.

## Progressive results

- Typecheck and zero-warning lint passed after the component and interaction changes.
- Initial tests identified three obsolete presentation assertions (old defaults/labels). They were updated to require the new network-first design, not removed.
- New non-overlap testing caught shared mutable Dagre dimensions; fixed using separate per-node objects. New authenticated-actor fixtures respect the existing strict `live-*` schema.
- Actual React Flow DOM gestures cover node drag, click suppression, keyboard positions, canvas pan and zoom, plus directory selection, filters/search/expansion and exact evidence focus. These are synthetic DOM, not browser screenshots.
- Existing ownership/case edges now open the stored memory/session/case entity instead of treating its ID as a security-event ID. A regression verifies this distinction.

## Verified current results

| Check | Actual result |
| --- | --- |
| `npm run typecheck` | Pass |
| `npm run lint` | Pass, zero errors/warnings |
| `npm test` | **140 pass** across nine files: 117 baseline + 23 added cases |
| `npm run build` | Pass optimized Next.js 16.4; original routes retained |
| `npm run test:runtime` | Pass disposable production HTTP A/B/C/D and real MCP client/separate agent CLI, actual bounded handlers/files/signed notes, untrusted provenance, denial, correlation, containment, restart and restoration; exact live demo CLI passes; **0 model calls** |
| `npm run test:restart` | Pass fresh-process quarantine, revoked credentials, replay denial, idempotent audit, ten guided steps/cursor/tamper evidence/restoration |
| `npm audit --omit=dev` | Zero advisories |
| Full `npm audit` | Same five high development-only braces-chain entries; suggested force fix downgrades Next lint tooling to incompatible major 14, not applied |
| Real browser / screenshots | Blocked by saved permission; not executed |

New coverage: two preference/migration/docking cases, eleven graph/layout/evidence/diff cases and ten synthetic interaction cases. All 73 pre-Phase-4 security/runtime/rendering tests remain. Current file totals: security18, adversarial25, integration7, rendering3, runtime20, workspace26, workspace-graph9, graph-explorer11, workspace-interactions21.

Clean-checkout verification and preserved-presenter HTTP checks are pending at this implementation checkpoint and will be recorded separately after execution. See `docs/VERIFICATION.md` for the retained earlier phases.

## Boundaries

No real provider inference is invoked by this phase. Runtime verification uses real local MCP handlers with scripted offline decisions. No production systems, external infrastructure, existing Codex sessions or personal data are connected. Presenter reset/scenarios are not used for regression verification; disposable verifier databases exercise those operations.

Visual sign-off remains pending because saved localhost browser permission rejects access. No screenshots or real-browser responsiveness/hit-testing/performance claims are made. Follow [PHASE5_VISUAL_QA.md](PHASE5_VISUAL_QA.md) for exact screenshot steps. Real touch, assistive technology, very large graph profiling, model-provider execution and production deployment remain unverified.
