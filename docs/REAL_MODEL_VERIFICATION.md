# Genuine model execution: readiness and proof

**No genuine provider inference occurred during Phase 7 verification.** Project configuration was disabled, with no configured model or credentials. All automated SDK responses were explicit fixtures; they do not establish external inference. No paid test was launched and no unrelated credentials were accessed.

## Operator setup

Only the official OpenAI Responses endpoint is supported. Select the exact approved model yourself; no default model or credentials are hardcoded. Supply `OPENAI_API_KEY` securely to the server process, not chat, source control or another application's environment. Scripts do not automatically load `.env`.

```sh
export GHOSTOPS_MODEL_ENABLED=1
export GHOSTOPS_MODEL_PROVIDER=openai
export GHOSTOPS_MODEL=your-approved-model-id
# Set OPENAI_API_KEY securely in the server terminal, without printing it.
npm start -- --port 3210
```

First review without running inference:

```sh
GHOSTOPS_URL=http://127.0.0.1:3210 npm run lab:run -- --scenario normal --mode model --allow-model-cost --dry-run
```

Then explicitly authorize one experiment:

```sh
GHOSTOPS_URL=http://127.0.0.1:3210 npm run lab:run -- --scenario normal --mode model --allow-model-cost --live
```

The CLI prints the exact preflight and asks for `EXECUTE <printed-command-UUID>` in an interactive terminal. There is no automatic approval or paid retry. Model execution is rejected in CI/noninteractive confirmation. `--allow-model-cost` alone is insufficient.

In Security Lab choose A, B or C and model mode, enable per-run cost consent, select **Review model preflight**, inspect provider/model, configuration, budgets, permissions and expiry, then select **Confirm exact provider execution**. Merely reviewing preflight makes no provider call. The server checks administrative authentication, CSRF and exact expiring approval. Changing setup requires a new review. D–H remain deterministic offline/local evaluations, not model benchmarks.

Optional smoke test, only after deliberate configuration and approval:

```sh
GHOSTOPS_RUN_MODEL_SMOKE=1 GHOSTOPS_URL=http://127.0.0.1:3210 npm run test:model -- --live
```

It uses the same preflight/interactive approval and bounded normal scenario. This command was **not executed** in this phase. The older natural-language agent client also requires `npm run agent:run -- --model --live --task "Read docs/research and write a permitted summary."`, with interactive configuration/task confirmation. Its calls still use MCP; Lab is the persistent benchmark/export integration.

## Receipt classification

| Label | Required evidence |
| --- | --- |
| SCRIPTED | Offline/local deterministic choices; no provider inference claim |
| MOCK PROVIDER | Explicit injected SDK/provider fixtures; even successful SDK calls remain mocks |
| VERIFIED PROVIDER | Successful default transport to the pinned official endpoint, matching SDK response ID, completed response metadata and actual reported model |
| FAILED OR UNVERIFIED | Failed request, absent/mismatched transport proof, historical SDK-only receipt or otherwise insufficient evidence |

The transport extracts bounded response metadata, never invents response identifiers and does not retain the full provider body in receipts. Receipt fields include run/actor, requested and reported model, provider, timestamps, status, duration, response ID, reported token usage, safe error code and linked actual gateway request IDs. Callers cannot set verified provenance through ingestion or experiment metadata. Public counters are recalculated from persisted proof, including legacy results that previously counted SDK fixture successes.

Tracing exports, sensitive SDK model/tool logging, SDK/HTTP retries, parallel tool calls and provider response storage requests are disabled. Logging suppression is applied programmatically, independent of debug environment flags. The exact official endpoint is pinned and redirects are rejected. Test/CI default transport fails before network dispatch. These controls do not guarantee provider-side retention policies or an uncompromised host.

## Budgets and failures

Defaults: 3 model calls/turns, 16,000 reported total tokens, 600 requested output tokens per call, 12 tool calls and 60 seconds. Valid maxima: 8 calls/turns, 64,000 total tokens, 1,500 output tokens, 16 tools and 180 seconds. Unknown usage prevents further paid calls; timeouts/cancellation fail safely at operation boundaries. Preflight reports cost estimation as unavailable because tool context and provider billing are not known.

Application reservations, token accounting and requested API output limits are **not guaranteed billing ceilings**. A request dispatched before cancellation can still be charged. Model refusals are legitimate observations; they are not policy blocks. B/C run separately labeled deterministic enforcement probes when execution reaches them; a failed model run may remain inconclusive before that boundary. Independent local regression tests establish enforcement regardless of model behavior.

Successful model calls alone do not prove task quality or resistance. Inspect source/summary tool receipts, actor-phase requests and independent probes separately. Small synthetic samples are not real-world model safety accuracy. SDK tool flow follows the [official function-calling guide](https://developers.openai.com/api/docs/guides/function-calling); maintained installed SDK behavior is tested without changing providers or framework.
