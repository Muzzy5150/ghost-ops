# Phase 9 release verification

Date: 2026-10-08. Target local release `v1.0.0-rc.1`. Code checkpoints `3064f51` (readiness/backup/demo/regressions), `857a81f` (cloned upgrade and fresh critical-session proof). No remote push, package publication, public deployment, paid inference or browser workaround. The release label is compiled metadata, not a remotely attested Git revision.

## Results and commands

Phase 8's reported 260-test baseline was independently checked; eight added regressions produce **268 passing tests across 21 files**. Initial new fixture mistakes (401 versus transport 403, selecting historical rather than latest memory) and test callback types were corrected before final success. No new confirmed application security defect was discovered; the prior historical-session response fix was independently revalidated.

Code was exported with `git archive` to independent temporary checkouts. The retained presenter's `.next`, database/key/process were not replaced. Fresh dependencies/generated client/SQLite/key were confined to those checkouts and verifier-owned fixtures.

| Actual executed check | Result |
| --- | --- |
| `npm ci` + `npm run setup` in disposable checkout | Pass; six migrations on fresh state; native SQLite works |
| `npm run typecheck` | Pass |
| `npm run lint` | Pass; zero warnings/errors |
| `npm test` | **268 pass / 21 files** |
| `npm run build` in separate checkout | Pass; protected `/api/release` included; retained build unchanged |
| `npm run sdk:build` / `npm run sdk:pack` | Pass; three local public tarballs/declarations, no publication |
| `npm run test:external` | Pass; independent tarball consumer, separate agent/proxy/production server, actual stdio initialization/discovery/calls and exact release demo |
| `npm run test:lab` | Pass; 16 A–H local/offline HTTP/MCP evaluations, evidence/CLI/tamper and local presentation |
| `npm run test:runtime` | Pass; original A/B/C/D HTTP scenarios, official MCP client, separate agent CLI, real bounded file/notes effects, memory integrity, correlation, reset preserves runtime and existing local demo |
| `npm run test:restart` | Pass; new process enforces quarantine/revocation/replay; ten guided steps and signed restoration |
| `GHOSTOPS_MIGRATION_SOURCE=/absolute/private/backup/database.sqlite npm run test:lab:migration` | Pass; all **17 original table payloads** preserved in further isolated migration clone |
| `npm run test:release-upgrade -- --backup /absolute/private/backup-directory` | Pass; matching-key backup clone migrates, RC readiness passes, normal restart preserves original row counts/current signatures/quarantine and three intentionally altered historical versions |
| `npm run release:backup -- --verify .ghostops/backups/phase9-presenter-20261008` | Pass; consistent SQLite/hash/private modes/matching key/current memory signatures |
| Original ZIP independent authenticated verifier | Pass with hashes and matching local HMAC; original retained |
| Altered ZIP independent verifier | Expected nonzero failure; changed HTML with valid ZIP checksum/unchanged manifest detected |
| Included original/tampered artifacts `evidence:verify -- ... --hash-only` | Original exits 0; tampered exits 1. Hash-only is not origin proof |
| `npm audit --omit=dev` | **Zero vulnerabilities** |
| Full installation/development audit | Five existing high advisory entries in braces → micromatch → fast-glob → Next ESLint chain; forced breaking downgrade not applied |

The final clean archive was `/tmp/ghostops-phase9-final.jJRT2f`, exported from `857a81f`; the complete sequential install/setup/package/type/lint/268-test/build/external/Lab/runtime/restart/pack/backup-clone-upgrade/production-audit command exited **0**. Documentation-only changes follow that code checkpoint. Root shell/full clean run used Node 24.10/npm 11.19; no separate minimum Node 22.12/platform matrix was run. Install emits existing deprecated/native/lint tooling notices; no dependency changes were forced merely to clear them.

An additional normal fresh-server launch on port **3211** exposed an environment mismatch: a different terminal selected installed Node 26 against SQLite built under Node 24 (`NODE_MODULE_VERSION 137` versus `147`). The server's database routes failed closed; no protected effects occurred. Only the owned 3211 process was stopped. Pinning that terminal to the verified Node 24 binary restored readiness, and the normal server-only/full identity preflight plus exact prepare/execute demonstration passed. This is a native-runtime configuration requirement, not a reason to reset data or change security policy. Installation and startup must use the same Node version; recovery is documented. The 3210 presenter was unaffected.

## Independent external process proof

Provisioning uses actual local administration and exclusive 0600 identity files. The separate consumer imports only built public package exports; no database/key/private handler imports. The real stdio proxy talks to the authenticated production HTTP MCP gateway. No direct event insertion substitutes for the acceptance flow.

- Approved document read, summary file, operational status and signed owned-memory notes execute; result/events have verified agent/session and request UUIDs.
- Forbidden/restricted operation returns denial; persisted runtime execution receipt is null. Forged identity/invalid credentials do not train another identity's baseline; foreign owner memory is rejected.
- Exact replay does not duplicate effects. Current authority is rechecked; revocation/quarantine wins over prior successful requests/discovery.
- Authenticated external findings include **all four engines**, linked to the real incident. Decoy contact alone is not claimed as malice.
- Quarantine blocks an already initialized external session before handler execution, including after a normal isolated production-server restart.
- Authorized restore issues new credential/session. Old revoked-session requests still fail; historical critical evidence does **not** incorrectly contain the restored identity. A new untrusted/protected-write/decoy critical session creates a new contained case, proving fresh qualifying response remains active.
- Scoped original investigation ZIP passes actual matching-key HMAC verification. Altering an isolated HTML copy/rebuilding ZIP checksums without its manifest causes rejection; original remains unchanged.
- Exact `release:demo -- --prepare` → full credential preflight → `--execute` passes against the actual RC server with separate MCP processes, real allowed/denied effects and independent original/tampered CLI verification. TTY pauses are not a measured browser presentation.

## Failure-mode evidence and limits

| Failure | Proven behavior / boundary |
| --- | --- |
| Invalid or revoked credential during established session | Independent process fails authentication/current-authority checks; handler does not execute |
| Closed MCP stdio | Actual official client/proxy closes; next call rejects and server request count stays unchanged. Mid-flight authorized effects are not promised to roll back |
| Unavailable gateway | Independent disposable client fails closed; no local fallback handler |
| Tool timeout | Initialized SDK MCP transport fixture times out with request UUID retained; no automatic retry/fallback. This is not a claim that server dispatch is rolled back |
| Duplicate or altered request | Existing replay/idempotency regression plus real external exact replay; no duplicate protected effect; changed reuse rejected |
| Forged identity / foreign memory | Actual gateway evidence retains verified identity, denies cross-agent access and avoids forged baseline attribution |
| Interrupted evidence download | Separate export CLI receives incomplete response from a native local HTTP failure fixture; exits nonzero and creates no successful output file. A filesystem write failure could still leave a private partial file; verification is mandatory |
| Restored identity with old critical session | Real new credential/session permits normal operation; old revoked request fails; new qualifying critical evidence still contains |

Cancellation/disconnect after an authorized dispatch can leave committed effects. The SDK must not silently retry non-idempotent operations with a different UUID. This release does not claim rollback, high availability, universal OS interception or independent production administrator authentication.

## Retained presenter and backup safety

PID **68163**, port 3210, actual database `/Users/muzzy5150/Documents/ChatGPT/GhostOps/prisma/ghostops.db`, old build ID `iou-0Ua0LSmndBMunusjd`. Old build lacks Phase 6+ Lab/rotation/release routes; exact Git commit is not attested. Active key matches `.ghostops/integrity.key` as privately proven through its administrator-cookie MAC, without printing key/cookie values or process environment.

Verified private checkpoint: `/Users/muzzy5150/Documents/ChatGPT/GhostOps/.ghostops/backups/phase9-presenter-20261008/`. Directory 0700; database/key/manifest 0600 and Git-ignored. Read-only online backup/quick-check records four agents, 41 tool requests, five incidents, ten memory versions and three original migrations. Three current memory versions validate; three intentionally altered historical snapshots remain retained. Neither source migrations nor source writes were needed to validate the backup.

The upgraded matching-key clone preserves the original rows, current signatures and persisted quarantine over normal restarts. Final retained health remains page/snapshot HTTP 200, **4 agents / 41 requests / 5 incidents / 10 memory versions / 10 runtime requests / 2 quarantined**; original PID/build are unchanged. Actual port 3210 remains old and unactivated. Its server-only preflight returns **not ready**: loopback administration works but expected release probe is missing; database/key/fixtures are explicitly **unverified**, not falsely declared corrupt. The RC clone/full external demo preflight returns ready. Activation requires fresh approval; [exact safe sequence and recovery](RELEASE_CHECKLIST.md).

## Review material and remaining acceptance

Actual sanitized files: [artifact index](../artifacts/phase9-release/README.md). They contain no plaintext token, database or signing key. Original package authenticated at creation under a disposable verifier key; that key is not exported, so future reviewers can only independently check hashes. This limitation is explicit in the saved verification JSON. Local HMAC does not exclude host/key compromise or provide external attestation.

**Pending:** approved replacement of retained presenter, browser visual/touch/accessibility sign-off and genuine explicitly approved provider inference. None was executed or substituted with mocks/screenshots. Submission scripts are timed narration targets, not a measured visual demo. Production deployment/multi-user auth and additional integrations remain future work. [Complete limits](RELEASE_LIMITATIONS.md).
