# Phase 8 verification

Verified code milestones: `1f183e9` (packages, external identities, console, initial 257 tests) and **`6459d58`** (public workspace resolution, real cross-process verification, restoration fix and 260 tests). Verification was performed on October 8, 2026; earlier results were independently rechecked rather than assumed. No package was published and no paid inference/browser request was made.

## Actual commands and results

| Check | Result |
| --- | --- |
| Initial existing suite / typecheck / lint | 217 tests / 17 files pass; typecheck and zero-warning lint pass |
| Final `npm test` | **260 tests / 20 files pass**, both main checkout and clean immutable checkout |
| `npm run typecheck` / `npm run lint` | Pass; no lint warnings |
| Fresh `npm ci` | Pass; public workspaces resolve from lockfile without npm publication |
| Fresh `npm run setup` | Pass; six migrations deploy and synthetic seed initializes only the disposable checkout |
| `npm run sdk:build` | Pass; SDK/proxy/example JS and declarations generated |
| `npm run sdk:pack` | Pass; SDK 4 files, MCP 6 files, example 8 files; dist/public declarations included |
| `npm run build` | Pass; production app retains existing routes plus authorized `/api/runtime/rotate` |
| `npm run test:external` | Pass; independently installed tarballs, separate consumer/agent/proxy/production server and complete security lifecycle |
| `npm run test:lab` | Pass; 16 A–H local/offline experiments, benchmark/preflight/export/CLI/tamper/eight-stage story checks; no inference |
| `npm run test:runtime` | Pass; original A/B/C/D HTTP controls, actual MCP/agent processes, protected memory, correlation, restart/restoration/reset preservation and exact live demo |
| `npm run test:restart` | Pass; quarantine/revocation/replay survive fresh server, ten guided steps resume with tamper/restoration and no duplicate effects |
| `npm run test:lab:migration` | Pass on read-only consistent source clone; all 17 original table payloads preserved; no source key accessed |
| `npm audit --omit=dev` | **Zero vulnerabilities** |
| Full `npm audit --json` | Five existing high development-only entries, described below; exit 1, not a clean full audit |
| Browser/screenshots/live provider | **Not executed; pending**, not substituted with DOM/mocks |

Immutable `git archive 6459d58` checkout `/tmp/ghostops-phase8-clean.2CNh3M` ran the full install → setup → SDK build → typecheck → lint → 260 tests → production build → external → Lab → runtime → restart → production audit chain successfully. A separate disposable `/tmp/ghostops-phase8-verify.zUg4CD` was used while diagnosing/fixing regression failures, and also passed packaging. Main shell reports Node 24.10.0/npm 11.19.0; independent process runs also exercised the installed Node 26.4.0 toolchain. Node 22.12 is the declared minimum, not a separately verified platform matrix.

## What cross-process verification proves

`scripts/verify-external.ts` installs generated tarballs into an unrelated temporary consumer. That consumer's Node process imports only public packages, launches the installed stdio proxy, negotiates actual MCP, and accesses a separately started production Ghost Ops server on a private loopback port. Its environment contains agent connection values, never server signing/admin/model credentials. No child accesses private server modules or the database.

- Operator-only research/observer enrollment; root `external:run` public package resolution and independently installed example both work.
- Actual authorized document read, summary file and signed notes append; normal actor decisions are accurately labeled scripted, with zero inference.
- Approved discovery excludes privileged tool names; observer sees only `operational_status`.
- Explicit forbidden admin request denied, persisted `execution:null`; no handler effect. Protected-memory write denied and current policy unchanged.
- Exact UUID replay writes only one artifact; after quarantine the same historical allowed request is denied with no old output or second handler.
- Token A claiming identity/session B is rejected, recorded unverified, reveals no output and does not train B's profile. Cross-owner extra memory argument is rejected before disclosure.
- All four engines produce actual actor/session evidence and a linked contained investigation. Decoys are synthetic local resources.
- Already initialized proxy submits post-quarantine and post-restart requests; both persist denials without file effects. Restart retains DB/key only within this disposable fixture.
- Existing synthetic tamper drill detects modification and appends a verified restored snapshot. Explicit external restore issues a fresh credential/session; old tokens remain revoked. Revoke takes immediate effect on the persistent client.
- Incident ZIP is generated from actual records and verifies hashes/HMAC with the matching disposable key; agent bearer cannot access export. Existing Lab verifier independently rejects altered evidence.
- Gateway shutdown causes clear failure without fallback execution. State and captured agent diagnostics do not contain issued credentials.

## Reproduced defects and verification

1. **Restoration denial-of-service via stale critical session.** Before the fix, the new focused regression reproduced `expected active, received quarantined`: a correctly bound revoked old credential caused historical critical findings to re-quarantine the newly restored identity. The security fix skill required independent source-boundary and bypass reviews. `investigation.ts` now requires active actor/session/matching nonrevoked credential at the shared automatic-response boundary. The regression passes for fresh stale requests **and exact replay**, preserves old case evidence/resolved status and new-session access, and proves a genuinely new critical session still auto-contains. Full cross-process restoration subsequently passes. Explicit manual response is unchanged. Outcome: **fixed**.
2. **Older CLI discovery assumption.** First actual `test:runtime` failed because `runLocalAgent` expected all catalog tools, including forbidden ones, after discovery became permission-filtered. It now rejects unknown/empty catalogs but accepts valid granted subsets; two new regressions and the exact original runtime CLI/demo pass. It does not bypass per-call gateway checks.
3. **Public package resolution.** Added three npm workspaces to resolve public package imports in built root commands. No app relocation/new package manager; clean install, root example and independently packed consumer installation pass.

43 tests were added beyond the independently checked 217 baseline. Unit/native-HTTP tests cover SDK endpoint/input/identity validation, strict receipts, safe logs, bounds, timeout/preabort, request-ID retention, auth/permission errors, missing/unapproved model configuration, operator lifecycle, no secret receipts, memory integrity, claims, four-engine correlation and developer-view/graph records. Happy-DOM UI tests are **not visual screenshots**.

## Data preservation and limitations

Main PID **68163** remains the original process (started October 7 at 23:41:33). A final read-only HTTP check returned 200 with unchanged retained totals: 4 agents, 41 requests, 5 incidents, 10 memory versions, 10 runtime requests and 2 quarantined agents. Its database/signing key were not reset, migrated or rotated; `.next` was not rebuilt in the main directory. Node dependencies/ignored generated client were refreshed for development, but the presenter process/build remains unchanged. Phase 8 therefore needs normal operator activation, not a claim that its new routes already run at 3210.

Temporary verifier processes/data are owned and cleaned by each script; clean-checkout build directories remain separate from the presenter. No unrelated repository, credentials, existing Codex session or production infrastructure was used. Browser access was deliberately not retried. Optional external model adapter is typechecked/gating-tested only; no genuine-provider compatibility/billing guarantee. The external SDK never grants verified-provider provenance.

Full audit retains the existing `braces → micromatch → fast-glob → @next/eslint-plugin-next → eslint-config-next` development chain, [GHSA-vfj7-8cjw-p6xm](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm). npm proposes a breaking downgrade to eslint-config-next 14.2.35; no forced downgrade/unstable update was made. Production and package runtime audit omit that chain and pass. Deprecated prebuild-install/ESLint warnings remain tooling maintenance work, not hidden audit successes.

See [security model](PHASE8_SECURITY_MODEL.md) for local-operator trust, absence of universal OS/agent interception, bounded tools-only MCP scope, uncertain-delivery semantics, no online heartbeat and host/key integrity limits. No public multi-user/remote OAuth/framework adapters are claimed. See [quickstart](EXTERNAL_AGENT_INTEGRATION.md) and [exact presentation](PHASE8_DEMO_SCRIPT.md).
