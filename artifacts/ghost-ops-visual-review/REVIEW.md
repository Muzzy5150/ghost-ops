# Ghost Ops Phase 5.5 — final visual review attempt

**Status: blocked; visual sign-off not granted.** No screenshots were captured or examined, no before/after comparison exists, and no speculative UI corrections were made. This is a real access/verification report, not a completed visual acceptance report.

## Environment and access investigation

Review date: 2026-10-07, America/Los_Angeles. Repository began clean at `fe8c685`; Phase 5 implementation is `2308b2c`.

- Existing production process: PID **68163**, Node 24.10.0, `scripts/server.ts --port 3210`, bound to `127.0.0.1:3210`. It was inspected, not stopped or restarted.
- Running homepage: HTTP **200**. Authenticated snapshot: **200**. No presenter scenario/reset/migration was executed.
- Browser connector: connected **Chrome extension**, browser ID `1`. Its supported documentation was refreshed; the existing Ghost Ops tab was found and selected for the requested local site.
- Selection was rejected before page inspection: a **saved user permission setting blocks `http://127.0.0.1:3210`**. The rejection additionally forbids achieving the same outcome through workaround, indirect execution, raw CDP/browser commands, alternate browser surfaces or policy circumvention.
- Project `npm ls playwright @playwright/test playwright-core puppeteer puppeteer-core --all`: no installed project dependency. No existing repository screenshot/browser runner was found under `scripts`, `tests` or `docs` before this report.
- `/Applications/Google Chrome.app` exists. Local Playwright cache contains Chromium 1228/1234/1243, matching headless shells, Firefox 1538 and WebKit 2336. These are installed software, **not independent authorization**. No browser executable or cached runner was launched after the denial.
- Plugin discovery found additional unconnected browser services, not an authorized local fallback. No plugin was installed, no permission mode changed and no data uploaded to a third party.

The request conditionally permits other runners where explicitly allowed, but does not override the saved denial; it expressly prohibits bypass. A separate Playwright/Puppeteer/CDP/native screenshot path for this same blocked application would contradict the returned restriction. No alternate hostname, port, browser surface, screenshot command or replica was used to evade it.

## Required user action — automated capture can resume

Remove the **saved deny preference for `http://127.0.0.1:3210`** in the connected browser/site permission settings, then tell Codex that the saved setting has changed. General chat authorization alone has repeatedly left that preference unchanged. An asynchronous request for this precise setting change was issued during this run.

The available plugin permission-management interface adjusts whole-plugin confirmation modes, not an individual saved site-deny preference; widening global/plugin access would not be a justified substitute. No broader setting was changed. After the site setting is corrected, retry the supported connector and perform automatic captures/interactions. Manual screenshots are not the requested next step.

## Viewports and screen coverage

| Requested viewport | Captured / inspected | Result |
| --- | --- | --- |
| 1920×1080 desktop | No | Browser access rejected before viewport/capture |
| 1440×900 desktop | No | Same blocker |
| 1280×800 laptop | No | Same blocker |
| 768×1024 tablet | No | Same blocker |
| 390×844 mobile | No | Same blocker |

All requested screens remain uninspected: Operations default/full network, selected ResearchAgent inspector, AgentDNA, ShadowWatch, MemoryGuard history/diff, GhostTrap, Incident Room, expanded timeline evidence, Live Events, Demo Control, simultaneous floating windows, resized/repositioned workspace and mobile focused panels/navigation.

Screenshot paths: **none**. Before/after paths: **none**. Contact sheet: **not generated**. [Screenshot directory status](../../docs/visual-qa/phase5/README.md) records this explicitly. [Review package](README.md) contains reports/verification metadata only, not substitute images. No placeholder PNG or mockup has been labeled evidence.

## Findings and corrections

No screenshot-backed typography, hierarchy, canvas balance, spacing, clipping, color/contrast or visual-identity defect can be established in this attempt. The biggest confirmed blocker is access, not an observed design defect. No frontend, server, authentication, gateway, database or dependency implementation change was made. Existing Phase 5 visual problems/fixes are historical implementation records, not new visual findings.

### Graph and window usability

The full suite exercises actual React Flow in **Happy DOM**: node selection/directory, keyboard coordinates, mouse drag with click suppression, canvas mouse pan, zoom controls, expansion/search/origin filters and exact persisted request-path highlights. Pure tests check independent Dagre rectangles, deterministic placement, stable coordinates, identity-claim separation and actual relationship references.

Window tests cover synthetic pointer title dragging, corner resize, keyboard resize, focus ordering, docking, minimize/reopen, maximize/restore, presets/reset, validated preferences and reload. These tests demonstrate application logic in a synthetic environment; they do not verify physical browser hit targets, real touch, rendered window occlusion, CSS clipping or frame rate.

### Desktop, tablet, mobile and accessibility

No rendered viewport findings exist. Mobile selector tests exercise one active tool and access to all engines without rewriting desktop geometry; they are not tablet/mobile screenshots. Keyboard/non-drag controls and escaped untrusted evidence have regression coverage. Contrast, actual font legibility, screen-reader behavior, browser zoom, reduced-motion rendering and physical touch interactions remain unverified.

### Browser diagnostics

Browser console logs and browser failed-network-request monitoring were **not accessible** after the denial. HTTP availability checks cannot establish a clean browser console, successful hydration or network behavior during interaction.

## Verification performed in this run

The existing repository's complete suite was independently rerun: **140 tests pass across nine files**. Typecheck and zero-warning lint pass. This includes all existing unit/security/integration/runtime/rendering/window/graph regressions; no tests were added without a confirmed new bug.

The production build and actual HTTP/MCP/restart verifiers ran in an isolated archive of `fe8c685`, with a fresh lockfile install and disposable verifier databases. They did not operate against the presenter's database or replace its serving build.

| Executed check | Result |
| --- | --- |
| Main `npm run typecheck` | Pass |
| Main `npm run lint` | Pass, zero errors/warnings |
| Main `npm test` | **140 passed** across nine files, including graph/window and complete security/runtime regressions |
| Isolated archive `npm ci` | Pass; retained development deprecation/install-script/advisory notices |
| Isolated archive `npm run build` | Pass optimized Next.js 16.4; all original routes retained |
| Isolated archive `npm run test:runtime` | Pass original A/B/C/D HTTP security checks, real MCP/separate agent process, bounded reads/files/notes, untrusted provenance, denials, correlation, containment/restart, signed restoration, simulation preservation and exact live CLI; model calls **0** |
| Isolated archive `npm run test:restart` | Pass quarantine/revocation/cached-output denial/idempotent audit and ten real guided steps/cursor/tamper/restoration/replay across fresh processes |
| Isolated archive `npm audit --omit=dev` | Zero vulnerabilities |
| Existing presenter page/snapshot/referenced assets | All 200; **10 assets** checked |
| Presenter process/state preservation | Same PID **68163**, no restart/reset; counts unchanged |
| Browser viewport/screenshot/console/interaction checks | **Not executed**, blocked by saved permission |

Main environment: Node 24.10.0/npm 11.19.0. Isolated archive: Node 26.4.0/npm 11.17.0. The full test count remains 140; no new application bug was established. The archive's install reported the retained five high development-only advisory entries; no dependency upgrades or forced fixes were applied. The production-only audit is clean. No additional Node version matrix was run.

Exact presenter totals before and after checks: **4 agents / 41 requests / 5 incidents / 10 memory versions / 10 runtime requests / 2 quarantined agents**. Only authenticated read-only availability checks touched this app; no data changes were made. Verifier servers stopped via their own scripts, cleaning only their own disposable state. The exported verification checkout was recoverably moved to Trash after execution. Artifact metadata contains counts/results only, no credentials or private prompt content.

## Remaining limitations

- No visual sign-off, screenshot package, contact sheet, before/after proof, real-browser interaction, touch/hit-testing, screen-reader or rendered performance acceptance.
- Only integrated tools are enforced; no arbitrary OS/Codex/production monitoring is claimed.
- Local runtime tests use genuine bounded handlers and scripted offline choices, not model inference.
- Existing development-only dependency advisory remains; no forced destabilizing upgrade.
- Continue automated visual review after correcting the saved site preference; do not treat this report as acceptance.
