# Release candidate checklist

Target: `v1.0.0-rc.1`. Feature freeze: Phase 8 integrations and existing engines only; changes limited to release probes, safe backups, presentation tooling and verified defects. Tag only after final verification; never push/publish/deploy automatically.

- [x] Inspect clean Git state, Phase 8 commits and reported verification.
- [x] Identify retained PID 68163, database `prisma/ghostops.db`, old build ID `iou-0Ua0LSmndBMunusjd`; no Lab/rotation route. Exact old commit is not attested.
- [ ] Verify matching signing key privately and create a consistent 0700/0600 backup; validate database/key pair without disclosing secrets.
- [ ] Independently rerun 260-test baseline, typecheck and lint.
- [ ] Add authenticated release readiness and non-mutating version-aware demo preflight.
- [ ] Prepare fresh demo identity without resetting historical records.
- [ ] Run genuine packaged external-agent/stdio/gateway workflow and preserve sanitized evidence.
- [ ] Verify allowed handlers, forbidden denials, identity/capability isolation, replay and revoked credentials.
- [ ] Verify quarantine/restart, restoration after old critical sessions and new critical containment.
- [ ] Verify proxy disconnect, unavailable gateway, tool timeout and interrupted evidence export.
- [ ] Verify original/tampered forensic ZIP and original report preservation.
- [ ] Test migrations on a consistent isolated copy, original demos and restart recovery.
- [ ] Clean immutable checkout: install/setup/SDK build/pack/independent install/tests/typecheck/lint/production build/audit.
- [ ] Complete three-minute/90-second scripts, submission/Q&A, limitations and activation/recovery instructions.
- [ ] Commit verified checkpoint; create local annotated RC tag after success; clean tracked tree.
- [ ] Presenter activation: **requires fresh operator approval**, normal shutdown and consistent matching backup. Not required to overwrite the live presenter to verify the RC.

No real-provider inference, browser workaround, public exposure, npm publishing or remote push. Visual sign-off and live-model proof remain pending.
