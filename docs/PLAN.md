# Implementation plan and verification log

## Phase 5 — readable node-editor workstation

- [x] Independently rerun Phase 4 baseline: 117 tests pass; browser retry still rejected by saved permission.
- [x] Network-first defaults, contextual tabbed inspector, expanded rail, readable design system and window docking.
- [x] Large purpose-specific nodes, Dagre layout, bounded neighborhood exploration, search/focus/filters, stable manual positions and evidence highlighting.
- [x] Refine security tools, ordered split/unified forensic diff, baseline/outcome lanes, timeline and terminal; preserve authenticated controls and demos.
- [x] 140 tests pass, typecheck/lint/build, disposable MCP/HTTP/restart and production audit pass; document saved-permission visual limitation.
- [x] Implementation commit `2308b2c`; exact archived checkout passes npm ci/setup, 140 tests, typecheck/lint/build, disposable MCP/runtime/restart and production audit. Presenter restarted on 3210: page/10 assets/snapshot return 200; all persisted totals unchanged. Clean checkout recoverably moved to Trash.
- [ ] Real-browser screenshots/visual sign-off; blocked by saved localhost preference, no bypass.

Implemented: retain backend/projection provenance boundaries. Operations allocates roughly 67–72% of taller desktops to the full-width graph and parks the inspector until selected; short heights park the terminal. Initial exploration shows a relevant bounded neighborhood at readable zoom; expand explicitly rather than fit every entity. Automatic layout runs on first mount, user scope change or explicit Arrange; arriving nodes append without relocating old nodes. React Flow official examples/Dagre docs were accessible as source reference, not rendered reference appearance. Fixed shared mutable Dagre dimensions, keyboard coordinate persistence, stale graph drag suppression, older-event follow and non-event ownership/case edge navigation. Local saved permission remains blocked. Design/QA/verification documentation created; no screenshot claim.

## Phase 4 — interactive security workspace

- [x] Inspect reusable frontend and independently verify baseline: 73 tests pass.
- [x] Build validated persistent window geometry, focus ordering, presets and keyboard/mobile alternatives.
- [x] Add bounded React Flow network using recorded ownership and observed requests; isolate unverified claims.
- [x] Integrate existing engines, demo, runtime sessions, evidence inspector and filtered event terminal.
- [x] Verify layout/graph interactions, complete backend regressions, typecheck, lint, production build and disposable HTTP/MCP/restart demos (117 tests pass; 73 preserved + 44 new).
- [x] Update design/architecture/demo/verification documentation.
- [x] Implementation checkpoint `f367bb2`; clean checkout independently passes npm ci/setup, 117 tests, typecheck/lint/build, actual MCP/HTTP/runtime and restart verifiers; presenter server restarted on 3210 without reset.
- [ ] Real-browser desktop/laptop/tablet/mobile screenshots and visual sign-off: saved permission still blocks localhost after user replied yes. No bypass.

Design direction: an original graphite operations desktop, restrained severity colors, narrow utility rail, rectangular title bars and dense forensic tools. Custom pointer-based window geometry keeps one positioning system and enables pure constraint tests. React Flow handles the graph's pan/zoom/selection and node movement. Browser reference access was explicitly blocked; no reference design details are assumed. Local browser permissions have also previously blocked visual QA; requested a saved-permission change, without workaround. No backend/database/security changes are planned.

Final Phase 4 presenter HTTP check: page and all nine referenced JS/CSS assets return 200; authenticated snapshot returns 200. Before/after restart counts match exactly: four agents, 41 requests, five incidents, ten memory versions, ten runtime requests, two quarantined agents. No presenter reset, migration, model call or new agent activity occurred. Main Node 24 and clean-checkout Node 26 both pass; temporary checkout moved to Trash, recoverable. Visual acceptance remains pending saved-site permission change and real viewport/screenshot inspection; other checks are completed. Documentation verification checkpoint follows.

## Phase 3 — bounded local runtime integration

- [x] Inspect architecture and independently rerun all 52 baseline tests.
- [x] Authenticated loopback MCP transport, bounded real tools, replay/provenance protection.
- [x] Isolated runtime identities, optional official Agents SDK, labeled offline client.
- [x] Live memory, correlation, containment, dashboard sessions; preserve simulation reset.
- [x] Runtime security, actual protocol calls, restart and regression verification (73 tests, typecheck, lint, production build, both fresh-process verifiers; zero production advisories).
- [x] Runtime/demo documentation and implementation commit `758729a`; clean checkout independently passes install/setup, typecheck, lint, 73 tests, build, runtime HTTP/restart checks and original restart checks. Final verification documentation checkpoint follows.

Additive migration preserved all original workspace records (3 agents / 31 requests / 85 events / 3 incidents / 6 memory versions). A private consistent backup was created; the exact live demo then ran successfully on 3210 with new `live-phase3` identity, no reset and zero model calls. Browser retry: in-app browser unavailable; existing Chrome site explicitly blocked by saved permission. No workaround; visual checks remain unverified. Real-provider model execution and same-identity credential redelivery remain unverified/future work respectively.

Verified runtime totals on presenter database: ten actual MCP requests, four denied, critical registered-agent incident contained, verified runtime-policy restoration v3 with altered v2 retained. Main Node 24 and clean-checkout Node 26 both pass; no independent Node 22 matrix. Temporary clean checkout is recoverably moved to Trash after verification; disposable verifier servers/databases were stopped/cleaned by their own scripts. All four engines and eight sections retained. React review kept client imports type-only, model SDK conditional, labeled controls and escaped evidence. No public deployment or real model call was performed.

Model inference is opt-in; it must not be claimed unless executed. Tools cannot execute commands, arbitrary paths or outbound requests. Additive migrations preserve presenter data; simulation reset must preserve runtime records.

## Phase 2 — independent hardening and investigation UX

- [x] Independently rerun baseline: 26 tests, type checking and lint pass.
- [x] Reproduce and fix replay authorization, identity attribution, source provenance, and correlation-key boundaries. Seven regressions failed pre-fix and pass post-fix.
- [x] Expand adversarial and restart verification; 52 tests pass, including 25 adversarial cases; actual production restarts preserve enforcement and memory/story state.
- [x] Improve all eight views, linked evidence, incident filtering/timeline, truthful status and demo results. Ten separately committed guided steps with cursor/replay protection added.
- [x] Verify production HTTP, persistence, dependency advisory, build and documentation.
- [x] Commit verified milestones and finish clean-checkout verification of Phase 2.
- Browser retry explicitly authorized; saved browser-tool permission still blocks local access. No bypass attempted; visual checks remain unverified.

Phase 2 audit found four validated controls requiring fixes: claimed identity contamination of verified correlation/history; historical output released before current authorization; optional source provenance omission; delimiter-ambiguous incident keys. Fixed without introducing a real executor or model dependency. Also implemented server-side expiring randomized admin sessions, session-bound CSRF, complete proxy-header family rejection, all-key restoration checks, memory append capacity and event ordinals. UI now separates fact/interpretation, shows actual correlation stages and policy receipts, links investigation/agent/memory evidence, charts minute buckets, displays all decoys and reports integrity failures accurately. Typecheck, zero-warning lint, 52 tests, production build, original A/B/C/D API checks and disposable production restart checks pass. Full audit retains five development-only entries for one unpatched braces chain; production audit is clean. No forced dependency downgrade applied.

## Milestones

- [x] Foundation: Next.js, typed Prisma/SQLite records, registry, deterministic seed.
- [x] Core security: enforcing gateway, identity, behavior, signed memory, decoys; tests.
- [x] Investigation: correlation, evidence timeline, idempotent containment and restoration.
- [x] Dashboard: all eight sections backed by records, controls, polling, responsive layout.
- [x] Verification: all scenarios over production HTTP, security negative tests, eight section render checks, production build.
- [ ] Desktop/mobile visual inspection (browser access declined; requires presenter manual check).
- [x] Handoff: README, trust boundaries, exact two-minute demo, committed milestones.

## Decisions

Use Node 24, Next.js 16, React 19, Prisma 7 (stable, avoiding Prisma 8 release candidates), SQLite, Zod, Vitest, and Tailwind 4. Simulated tools operate only on an explicit resource catalogue. No model API or cloud service is needed. Server signs memory provenance with a private local key. Findings are rule explanations, never threat probabilities.

## Verification / unresolved risks

Runtime Node v24.10.0 and npm 11.19.0 verified. SQLite migration and seed passed. All 22 initial tests passed (15 security/unit, 7 integration); typecheck, lint, and first production build passed. Repeated quarantine across a newly created incident initially duplicated an audit response; fixed by recognizing already-contained actor state independently of incident association. Tests now enforce this case.

Dependency audit found vulnerable transitive Prisma CLI dependencies; overrides to deepmerge-ts 8.0.2 and mysql2 3.24.5 applied and migration/test compatibility verified. `npm audit --omit=dev` reports zero vulnerabilities. The unpatched braces advisory remains in development lint tooling; not in the production dependency graph.

Production HTTP checks found that Next.js injects forwarded headers. Added a Node transport that binds only to loopback, validates actual socket peers, rejects client proxy/attestation headers before Next, and supplies an internal signed attestation. Direct next start fails closed. Actual HTTP host/proxy/CSRF/session/schema/body-size tests pass. Node fetch ignores an overridden Host; that negative test now uses node:http to verify the actual hostile wire header.

All four production API scenarios pass: 31 observed requests, 8 blocked operations, 3 investigations, 1 registered ResearchAgent quarantined, 3 trap interactions. An otherwise authorized summary is blocked after quarantine; poisoned writes rejected while legitimate research completes; tampered history retained and verified snapshot appended. Old credentials stay revoked after restoration. Replayed commands do not duplicate containment. 26 tests pass (18 security, 7 integration, 1 rendering all eight sections), typecheck and lint pass. Request/history/command capacity bounds implemented. README, SECURITY, DEMO_SCRIPT, VERIFICATION, and future adapter contracts completed.

Browser inspection attempted but browser tool rejected local-site access, reporting user permission was declined. No workaround attempted. Desktop/mobile visual inspection remains unverified; exact manual checklist is in docs/VERIFICATION.md.

Final verification: typecheck, lint, all 26 tests, and production build passed after final changes. Production HTTP checks rerun against the final build and passed. A git-archive clean checkout in an isolated temporary directory passed npm ci, fresh migration/seed, production build, startup on port 3211, and the complete API verification with a separately generated private key/database. The temporary verification server was stopped after checking. Main application remains running on http://127.0.0.1:3210 with the completed A/B/C/D demonstration state. Two verified implementation checkpoints committed; final verification documentation checkpoint recorded separately.
