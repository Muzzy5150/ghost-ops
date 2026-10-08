# Implementation plan and verification log

## Phase 2 — independent hardening and investigation UX

- [x] Independently rerun baseline: 26 tests, type checking and lint pass.
- [x] Reproduce and fix replay authorization, identity attribution, source provenance, and correlation-key boundaries. Seven regressions failed pre-fix and pass post-fix.
- [x] Expand adversarial and restart verification; 52 tests pass, including 25 adversarial cases; actual production restarts preserve enforcement and memory/story state.
- [x] Improve all eight views, linked evidence, incident filtering/timeline, truthful status and demo results. Ten separately committed guided steps with cursor/replay protection added.
- [x] Verify production HTTP, persistence, dependency advisory, build and documentation.
- [ ] Commit verified milestones and finish clean-checkout verification of Phase 2.
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
