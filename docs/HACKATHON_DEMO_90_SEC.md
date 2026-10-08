# Ninety-second backup presentation

Use the same verified RC and a **fresh prepared identity**. No paid inference. Prepare before judging:

```sh
GHOSTOPS_URL=http://127.0.0.1:3210 npm run release:demo -- --prepare
GHOSTOPS_URL=http://127.0.0.1:3210 npm run release:preflight -- --credential-file /absolute/printed/private/identity.json
GHOSTOPS_URL=http://127.0.0.1:3210 npm run release:demo -- --execute --credential-file /absolute/printed/private/identity.json
```

The noninteractive command runs the exact tested proof without presentation pauses. It produces actual request/case IDs and retains original/altered reports plus `result.json`; no invented telemetry or credential output.

**0:00–0:15:** “AI agents can be redirected by untrusted content. Ghost Ops enforces tools before execution and investigates verified behavior. Actor choices here are scripted; MCP calls and enforcement are real.”

**0:15–0:35:** Show permitted requests, then the restricted admin request's actual denial/UUID and persisted null execution receipt. “Same authenticated external process. Different permission outcome. The forbidden handler never runs.”

**0:35–0:55:** Open the printed investigation. Show source provenance, protected-memory denial and synthetic decoy evidence. Point to correlated signals, not a claimed compromise probability. Identify automatic containment accurately.

**0:55–1:10:** Show `AGENT_QUARANTINED` for the subsequent request on the initialized MCP session, with no handler execution. “Current policy blocks even after discovery. Restart/restore regressions are in our release suite.”

**1:10–1:25:** Show authenticated original ZIP verification and rejection of the separately altered copy; original remains unchanged. “Evidence is locally authenticated, not externally attested.”

**1:25–1:30:** “Install the SDK or tools-only MCP proxy. Only routed operations are protected.”

If live execution fails, disclose it and show previously **actual** retained verification artifacts/results, with their creation context and disposable-key limitation. Do not claim historical playback re-executed tools, fabricate success, or display identity/signing-key files. Readiness failures/recovery: [release checklist](RELEASE_CHECKLIST.md).
