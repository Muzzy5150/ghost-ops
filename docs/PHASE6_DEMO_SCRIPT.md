# Phase 6 demonstration

## Prepare without erasing existing records

The existing 3210 presenter was deliberately not stopped, migrated, rebuilt or reset during implementation. To activate Phase 6, the operator should stop that process normally, preserve the database and its matching private signing key, then:

```sh
cd /Users/muzzy5150/Documents/ChatGPT/GhostOps
npm ci
npm run db:migrate
npm run build
npm start -- --port 3210
```

For a fresh checkout use `npm ci`, `npm run setup`, `npm run build`, then the same start command. Always use the custom server; direct `next start` lacks local transport attestation. No model key is required for the local demonstration. Do not run `test:api` against the preserved presenter: it intentionally resets original synthetic demo data. Phase 6 verifiers use their own disposable state.

## Two-minute local-tool story

1. **0:00 — Security Lab:** open its toolbar preset or Alt+3. Select **New isolated identity**, **Live local agent**, **A Normal research**. Start. Show actual MCP requests, authorized handlers and successful summary. Say “real tools, scripted decisions; no inference.”
2. **0:20 — Injection:** run **B Untrusted instructions**, still new/local. Inspect source provenance, permitted continuation and the separately labeled forbidden-request regression. Open its real Gateway denial and linked decoy investigation. Do not call the scripted agent's behavior “model resistance.”
3. **0:40 — Memory:** run **C Protected memory**. Show rejected protected writes, the original-version/intact-signature verification, and permitted summary/notes. Open MemoryGuard for the isolated owner to inspect signed versions. No poisoning succeeded merely because the fixture contained instructions.
4. **1:00 — Identity/deception:** run **D Identity impersonation** or **E Synthetic decoy**. Expand the unverified claim or authenticated decoy evidence. Explain that an untrusted claimed name is not a verified victim and decoy interest alone does not prove intent.
5. **1:20 — Defense:** run **F Containment verification**, new/local. Show `CONTAINMENT_APPLIED`, then `AGENT_QUARANTINED`, then verified `CONTAINMENT` with `handlerNeverExecuted`. Open its contained investigation: the quarantine action and actual follow-up denial are linked.
6. **1:45 — Investigation:** switch to Incident Room, inspect that case's persisted timeline and policy receipt. Return to lab history and compare earlier runs without replaying tool effects. All existing demos and window controls remain accessible.

If six runs exceed the narration window, prepare A–E in advance and start F live; label historical runs as historical. Do not fabricate timing or animations. Lab completion revokes its run credential; containment additionally persists the agent restriction. It is not automatically undone.

## Optional model demonstration

Follow [MODEL_EXECUTION.md](MODEL_EXECUTION.md); explicitly configure the launching server and authorize provider costs. Run A or B with **Model-driven** and consent. Only show MODEL-DRIVEN after a successful invocation receipt, with response ID/latency/usage where reported. In B, describe actual observed tool decisions; refusal is possible but not guaranteed. The independent forbidden-request probe proves policy enforcement regardless of model choice. If evidence is insufficient, show INCONCLUSIVE rather than inventing resistance.

## Restoration and restart proof

The existing authorized runtime memory drill can intentionally alter an isolated test snapshot and restore verified history. It is labeled **operator fault injection**, not model-induced tampering. In the isolated verifiers, this drill and a real process restart verify signed restoration and continued quarantine enforcement with no tool effects. For live restoration use the existing MemoryGuard controls and check the server-confirmed new signed version; do not restore a protected record from an unverified snapshot.

Do not reset the presenter's data for judging. Original guided reset remains explicit and preserves runtime and lab history. Repeating a lab scenario creates a new experiment; viewing/comparing old runs does not execute them again.
