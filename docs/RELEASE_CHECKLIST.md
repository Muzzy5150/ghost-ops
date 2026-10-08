# Release candidate checklist

Target: `v1.0.0-rc.1`. Feature freeze: Phase 8 integrations and existing engines only; changes limited to release probes, safe backups, presentation tooling and verified defects. Tag only after final verification; never push/publish/deploy automatically.

- [x] Inspect clean Git state, Phase 8 commits and reported verification.
- [x] Identify retained PID 68163, database `prisma/ghostops.db`, old build ID `iou-0Ua0LSmndBMunusjd`; no Lab/rotation route. Exact old commit is not attested.
- [x] Verify matching signing key privately and create a consistent 0700/0600 backup; validate database/key pair without disclosing secrets.
- [x] Independently rerun 260-test baseline, typecheck and lint; final suite grows to 268 tests.
- [x] Add authenticated release readiness and non-mutating version-aware demo preflight.
- [x] Prepare fresh demo identity without resetting historical records.
- [x] Run genuine packaged external-agent/stdio/gateway workflow and preserve sanitized evidence.
- [x] Verify allowed handlers, forbidden denials, identity/capability isolation, replay and revoked credentials.
- [x] Verify quarantine/restart, restoration after old critical sessions and new critical containment.
- [x] Verify proxy disconnect, unavailable gateway, client tool timeout and interrupted evidence export (failure fixture boundaries documented).
- [x] Verify original/tampered forensic ZIP and original report preservation.
- [x] Test migrations on a consistent isolated copy, original demos and restart recovery.
- [x] Clean immutable checkout: install/setup/SDK build/pack/independent install/tests/typecheck/lint/production build/audit.
- [x] Complete three-minute/90-second scripts, submission/Q&A, limitations and activation/recovery instructions.
- [x] Commit verified checkpoint; create local annotated RC tag `v1.0.0-rc.1` after success; clean tracked tree.
- [ ] Presenter activation: **requires fresh operator approval**, normal shutdown and consistent matching backup. Not required to overwrite the live presenter to verify the RC.

No real-provider inference, browser workaround, public exposure, npm publishing or remote push. Visual sign-off and live-model proof remain pending.

## Verified retained presenter backup

Actual private directory: `.ghostops/backups/phase9-presenter-20261008/` under the source repository. Directory 0700; `database.sqlite`, `integrity.key`, `manifest.json` 0600, Git-ignored. Never attach these files to a submission. The active administrator cookie's MAC matches the saved key; no secret was printed. SQLite online backup/quick-check, database hash, row counts and all three current memory signatures pass. Three intentionally altered historical versions remain evidence, not erased or silently repaired.

```sh
npm run release:backup -- --verify .ghostops/backups/phase9-presenter-20261008
# To create a NEW checkpoint later (never overwrite an existing directory):
npm run release:backup -- --database /Users/muzzy5150/Documents/ChatGPT/GhostOps/prisma/ghostops.db --output /absolute/new/private/backup-directory
```

This process uses read-only SQLite online backup. It does not seed, migrate or rewrite the source. The matching key is kept beside the database privately. An environment-configured key must be preserved through the corresponding documented secret mechanism instead; never dump a process environment. Reject key mismatch/invalid current signatures and recover the correct pair, rather than generate a replacement. Copy the pair to operator-approved secure storage as needed; restrictive permissions are not encryption.

## Safe activation — approval required, NOT executed

The live PID 68163 serves old build `iou-0Ua0LSmndBMunusjd`; exact old Git revision was not embedded. Do not rebuild its directory, run `setup`, migrate its database or terminate it during preparation. Stage an independent RC build first:

```sh
GHOSTOPS_SOURCE_DIR=/Users/muzzy5150/Documents/ChatGPT/GhostOps
# This machine's verified Node 24 installation. Keep it consistent in both terminals.
export PATH="/Users/muzzy5150/.nvm/versions/node/v24.10.0/bin:$PATH"
GHOSTOPS_RC_DIR=$(mktemp -d /tmp/ghostops-rc-presenter.XXXXXX)
git -C "$GHOSTOPS_SOURCE_DIR" archive v1.0.0-rc.1 | tar -x -C "$GHOSTOPS_RC_DIR"
cd "$GHOSTOPS_RC_DIR"
npm ci
npm run sdk:build
npm run build
```

For retained data, **do not run setup/seed/reset**. Before switching, obtain approval to interrupt the presenter; refresh the verified consistent backup into a new private directory if source history changed. Stop the old server normally with Ctrl+C in its owning terminal. Check port 3210 is free; do not kill another owner. Then, using the **verified latest matching key**, not a newly generated build key:

```sh
install -d -m 700 "$GHOSTOPS_RC_DIR/.ghostops"
install -m 600 "$GHOSTOPS_SOURCE_DIR/.ghostops/backups/phase9-presenter-20261008/integrity.key" "$GHOSTOPS_RC_DIR/.ghostops/integrity.key"
DATABASE_URL="file:$GHOSTOPS_SOURCE_DIR/prisma/ghostops.db" npm run db:migrate
DATABASE_URL="file:$GHOSTOPS_SOURCE_DIR/prisma/ghostops.db" npm start -- --port 3210
```

Run preflight from a second terminal **in that RC checkout**:

```sh
export PATH="/Users/muzzy5150/.nvm/versions/node/v24.10.0/bin:$PATH"
export GHOSTOPS_URL=http://127.0.0.1:3210
npm run release:preflight -- --server-only
npm run release:demo -- --prepare
```

The additive clone upgrade with matching backup key, retained rows/signatures/quarantine and normal restart is tested by `npm run test:release-upgrade -- --backup /absolute/private/backup-directory`. The source database was never migrated by the test. Preserve the RC path, actual database path and original key for future restarts. The commands above use this verified backup's key; substitute a newer verified backup path if required. The local release label is not cryptographic Git attestation.

## Recovery

| Condition | Safe action |
| --- | --- |
| Port occupied | Inspect its owner; use a separate approved loopback port or obtain approval for normal shutdown. Never automatically kill the retained/unknown process. |
| Server stops | Restart the same RC checkout with the same database and matching key, then preflight. Persisted quarantine/revocation remains authoritative. |
| Native SQLite / Node ABI mismatch | Select the Node version used during install (verified here: 24.10) in every terminal, then restart only the owned isolated server. If deliberately changing Node, run `npm ci` again only in the staged checkout before rebuilding. Never reset data/key or replace the live presenter's dependencies. |
| Old build / missing release probe | Expected readiness failure. Stage the RC and follow approved activation; do not reset database/key. |
| Invalid/revoked credential, completed case, quarantined demo identity | Prepare a new isolated identity/output with `release:demo -- --prepare`. Explicit restore/rotation uses existing authorized CLI and issues a new private file; old tokens stay invalid. |
| MCP proxy failure | Check local server, SDK build and current grants/private file, then preflight. Do not use an unguarded fallback or cache authorization. |
| Interrupted/uncertain tool delivery | Inspect the persisted request UUID. Keep exact input for safe replay; don't silently retry with a new UUID. An already authorized effect is not automatically undone. |
| Interrupted export / existing filename | Use a new exclusive output, then verify. Preserve original evidence; never treat a partial file as verified. |
| Missing model configuration | Nothing to fix for this offline presentation; no paid model/key is required. |
| Signing key unavailable / current signature failure | Recover the original private database/key pair, or inspect/restore a verified snapshot through authorized controls. Never replace the key to silence the failure. |
| Migration/activation failure | Stop only the owned RC normally; retain both old checkpoint and new database/history. Do not overwrite retained data, auto-downgrade schema or discard post-backup records. Operator-directed recovery can use a separate checkpoint copy; old builds are not RC-verified. |

Normal demo recovery never calls reset. [Release limits](RELEASE_LIMITATIONS.md) describe uncertain delivery, local trust and pending visual/provider verification. Presentation flow: [three minutes](HACKATHON_DEMO_3_MIN.md) / [90 seconds](HACKATHON_DEMO_90_SEC.md).

For an independent fresh RC instead of activating retained data, the staged archive can run `npm run setup`, `npm run sdk:build`, `npm run build`, `npm start -- --port 3211`; do not copy or point at the retained database/key. Use `GHOSTOPS_URL=http://127.0.0.1:3211` in the other terminal. This normal fresh-server preflight/demo path was also executed successfully under the consistent Node version. It leaves the port 3210 presenter untouched.
