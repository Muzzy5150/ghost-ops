# Optional model-driven execution

## Phase 11 specialist runs

Sponsor Integrations adds exact-approved Research/Coordinator/Operations SDK runs with distinct guarded MCP identities. No genuine inference was performed. See [setup/budgets/provenance](OPENAI_MULTI_AGENT.md). Only the server-side adapter additionally supports explicitly configured loopback Responses-compatible endpoints; local response receipts remain unverified inference, not OpenAI provider proof.

## Phase 8 external example

The external example has an optional official Agents SDK adapter with explicit model enablement, fresh interactive `--model --live` confirmation, fixed synthetic task, no retries/tracing, call/tool/time/output and reported-token bounds. Tool callbacks still use the public protected integration. **No genuine inference was executed** during verification. Returned external SDK response IDs are not server-attested transport proof and do not produce VERIFIED PROVIDER status in Ghost Ops. Budgets are not guaranteed billing ceilings. This adapter remains opt-in/unverified; use the existing Security Lab receipt/approval path below for server-recorded provider evaluation.

## Verification status

The official Agents SDK path is implemented and tested through its actual Agent/Runner/tool loop with a mocked provider. Actual MCP handlers were verified independently. **No real provider inference ran in Phase 6 or 7:** configuration and credentials were unavailable. Fixtures are not evidence of genuine inference. The opt-in smoke test remains pending. Phase 7 adds exact configuration/credential-bound preflight, interactive approval and transport-backed provenance; see [REAL_MODEL_VERIFICATION.md](MODEL_EXECUTION.md).

## Explicit configuration

OpenAI is the official external provider. Phase 11 additionally supports the documented local-responses loopback alternative; arbitrary proxy URLs and Chat-Completions-only endpoints are rejected. The model identifier must be supplied by the operator; no model name is hardcoded. Use an account-approved Responses/tool-capable model with synthetic data only.

Set `OPENAI_API_KEY` securely in the **server-launching terminal** without printing or committing it. Do not send it in chat or borrow credentials from another repository. Scripts do not automatically load `.env`.

```sh
export GHOSTOPS_MODEL_ENABLED=1
export GHOSTOPS_MODEL_PROVIDER=openai
export GHOSTOPS_MODEL=your-approved-model-id
# OPENAI_API_KEY must already be securely supplied to this process.
npm start -- --port 3210
```

The server must be stopped/relaunched by the operator to adopt different environment configuration. A key alone does not enable inference. Security Lab also requires explicit per-run cost consent:

```sh
GHOSTOPS_URL=http://127.0.0.1:3210 npm run lab:run -- --scenario normal --mode model --allow-model-cost --dry-run
GHOSTOPS_URL=http://127.0.0.1:3210 npm run lab:run -- --scenario normal --mode model --allow-model-cost --live
```

Review preflight before the live command, which requires interactive `EXECUTE <command-UUID>` confirmation. UI model execution requires **Review model preflight**, then **Confirm exact provider execution**. Approval expires after 120 seconds and binds UUID, scenario/version, budgets, permissions, provider/model and credential. Use UI budgets before approval or the validated API `budgets` object. Model mode never silently falls back to scripted choices. Missing configuration, cost consent or valid approval fails closed. CI/default test transport cannot contact the provider.

For natural-language tasks the existing provisioned-agent CLI remains supported:

```sh
npm run agent:provision
npm run agent:run -- --model --live --task "Read docs/research and write a summary using the approved local tools."
```

That standalone client requires its own process configuration and returns invocation metadata, but is not a persisted Lab experiment. Use the lab when persistent experiment/invocation evidence is required. The lab accepts fixed synthetic scenario tasks, not arbitrary prompts from its API.

## Budgets and privacy

Defaults per run: **3 model calls, 16,000 reported total tokens, 600 output tokens per call, 12 tool calls, 60 seconds**. Schema maxima: 8 calls, 64,000 tokens, 1,500 output tokens/call, 16 tools and 180 seconds. Calls use finite turns; both SDK/transport retries and tracing exports are disabled. Streaming is not supported. Parallel tool calls are disabled; every tool callback checks cancellation/budgets and enters the existing MCP gateway. Memory, permissions and quarantine never depend on a model explanation.

Before inference, the wrapper reserves UTF-8 input bytes plus a protocol margin against the remaining token allowance and rejects oversized input. It bounds requested output and accumulates reported usage. Missing usage exhausts the remaining allowance, preventing another paid call. Reported over-budget usage stops before tools or another inference.

**These are application limits, not a guaranteed billing ceiling.** Token reservation is conservative estimation; providers may report late, include additional billed categories or complete a request after cancellation. An aborted request may cost money. Configure provider account limits/rate controls independently; inspect receipts before authorizing another run. No repeated paid experiment is automatically launched on failure or restart.

Requests disable response storage where supported and use no tracing exports. Synthetic tasks and tool results still leave the machine during remote inference, subject to provider policies; these flags are not a zero-retention guarantee. Lab persists only status, configured provider/model, returned response identifier, latency and reported token totals. It does not store chain of thought, prompts, provider exception payloads or full final output. Model-visible tools contain no agent credentials or admin controls.

## Opt-in smoke test

Receipts distinguish SCRIPTED, MOCK PROVIDER, VERIFIED PROVIDER and FAILED/UNVERIFIED. Only a successful default official transport response with matching SDK response ID and reported model counts as genuine-provider evidence. Old SDK-only counters are not promoted. Sensitive SDK model/tool logging is disabled programmatically, even under debug settings. The default transport rejects test/CI network dispatch and redirects. These are trusted-host controls, not external attestation.

After deliberately enabling the server and authorizing one bounded paid run:

```sh
GHOSTOPS_RUN_MODEL_SMOKE=1 GHOSTOPS_URL=http://127.0.0.1:3210 npm run test:model -- --live
```

This submits exactly one normal experiment (up to 3 inference calls, 16,000 reported tokens, 600 output/call, 4 tools and 60 seconds), with no automatic second run. It checks successful invocation receipts, authorized tool workflow and absence of inconclusive completion. It was **not executed** during this implementation. An SDK/provider failure or token restriction is reported as failed/inconclusive, never live-model success.
# Phase 12 verified local execution

The official SDK now also supports the pinned, installed, non-cloud Ollama Chat Completions path. Actual local inference and model-selected guarded tools were recorded; this is not OpenAI-hosted sponsor verification or universal compatible-server attestation. See [setup and exact receipts](AUTONOMOUS_AGENT_EXECUTION.md). Explicit model approval, provider/turn/token/time limits, cancellation, tracing-disabled operation and server-side tool authorization remain mandatory. Historical mocked-provider tests are still not genuine inference.
