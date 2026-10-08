# Phase 7: three-minute evidence demonstration

Use the existing local server after **normal operator-controlled activation** of the new build. Do not reset historical evidence. Each new Security Lab run defaults to a fresh isolated identity. Local mode executes genuine MCP handlers but makes **scripted decisions**, not model inference. Offline mode is explicitly synthetic effects. Genuine provider mode is separate, optional and never necessary for this presentation.

## Prepare

From a clean checkout: `npm ci`, `npm run setup`, `npm run build`, `npm start -- --port 3210`. For the existing installation stop the old presenter normally, back up the database **and matching integrity key**, use `npm ci`, `npm run db:migrate`, `npm run build`, then `npm start -- --port 3210`. No database reset is needed. These activation steps were not applied to the user's already running process during development.

For a complete offline/local report collection in a second terminal:

```sh
GHOSTOPS_URL=http://127.0.0.1:3210 npm run lab:evaluate -- --mode local --show-tamper
```

The command prints run IDs and a new private `.ghostops/evaluations/UUID/` directory with eight ZIPs, an index and an intentionally altered copy. Optional `--output /absolute/new-directory` must name a nonexistent destination. No paid request, reset, credential restoration or historical effect replay occurs. Keep the matching server key available locally for authenticated verification; do not distribute it.

## Live presentation

| Time | Action and evidence |
| --- | --- |
| 0:00–0:25 | Open **Security Lab** (rail or Alt+3). Choose A Normal, **LIVE LOCAL AGENT**, new identity, Start. Show completed source read/summary and actual allowed handler receipts. “Actual tools; choices are scripted.” |
| 0:25–1:00 | Run B Untrusted instructions with a new local identity. Inspect source provenance, actor choices and separately labeled forbidden-resource enforcement probe. The denied operation has no handler execution. Do not call this model resistance. |
| 1:00–1:25 | Run C Protected memory. Inspect the unauthorized protected write, MemoryGuard finding and verified unchanged policy. Legitimate summary still completes. |
| 1:25–1:55 | Run F Containment with a new identity. Show recorded quarantine action, subsequent `AGENT_QUARANTINED`, `handlerExecuted: false` and associated contained investigation. Existing identities are not touched. |
| 1:55–2:25 | Open the actual investigation/timeline. Distinguish claimed identity, behavior, policy denial and containment. Use the lab comparison to show actor attempts versus independent probes and N/A for untested metrics. |
| 2:25–3:00 | Download the completed run or incident evidence ZIP. Verify the original with the command below. Verify the pre-created intentionally altered copy and show nonzero exit/failure. Explain SHA-256 plus local HMAC, not externally attested or tamper-proof. |

```sh
npm run evidence:verify -- /absolute/path/to/original-report.zip
npm run evidence:verify -- /absolute/path/to/intentionally-altered-copy.zip
```

The presentation duration/rendered UI has not been browser-verified. Backend commands, all eight local/offline scenarios, report downloads/verifier/tamper detection and original guided/runtime demos are exercised by production HTTP/MCP tests with disposable state. Physical graph/window interactions remain covered by existing synthetic DOM/unit tests, not a fresh screenshot sign-off.

## Optional real inference

Use [REAL_MODEL_VERIFICATION.md](REAL_MODEL_VERIFICATION.md). Review preflight, explicitly approve the exact model experiment, and inspect transport-backed invocation receipts. The model may ignore injection, identify it, attempt a prohibited operation or fail; report what actually happened. A separately labeled deterministic probe proves gateway enforcement regardless. Do not promise a model will fail, claim refusal from a scripted run, or run repeated paid demonstrations automatically.

## Retained workflows

Original Operations/Incident Room, graph inspection, draggable windows, Phase 2 ten-step guided story and Phase 3 runtime demo remain available. `npm run agent:demo -- --interactive` verifies actual bounded tools independently. Guided reset is optional and deletes simulated history; do not use it when preserving existing simulation evidence. New lab history can be compared without any reset.
