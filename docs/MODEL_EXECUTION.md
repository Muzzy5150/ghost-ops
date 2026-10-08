# Optional model-driven execution

## Verification status

The official Agents SDK path is implemented and tested through its actual Agent/Runner/tool loop with a mocked provider. Actual MCP handlers were verified independently. **No real provider inference ran in Phase 6:** the project environment lacked enabled model configuration and credentials. Test fixtures are not evidence of genuine inference. The opt-in smoke test remains pending an operator-approved configured run.

## Explicit configuration

Only OpenAI is currently supported. The model identifier must be supplied by the operator; no model name is hardcoded. The provider adapter is pinned to the official `https://api.openai.com/v1` endpoint, not arbitrary proxy URLs. Use an account-approved Responses/tool-capable model with synthetic data only.

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
GHOSTOPS_URL=http://127.0.0.1:3210 npm run lab:run -- --scenario normal --mode model --allow-model-cost
```

Use UI budgets before Start or the validated API `budgets` object. Model mode cannot silently fall back to scripted decisions. Unsupported provider, missing enablement/model/credentials or missing cost consent fails closed.

For natural-language tasks the existing provisioned-agent CLI remains supported:

```sh
npm run agent:provision
npm run agent:run -- --model --task "Read docs/research and write a summary using the approved local tools."
```

That standalone client requires its own process configuration and returns invocation metadata, but is not a persisted Lab experiment. Use the lab when persistent experiment/invocation evidence is required. The lab accepts fixed synthetic scenario tasks, not arbitrary prompts from its API.

## Budgets and privacy

Defaults per run: **3 model calls, 16,000 reported total tokens, 600 output tokens per call, 12 tool calls, 60 seconds**. Schema maxima: 8 calls, 64,000 tokens, 1,500 output tokens/call, 16 tools and 180 seconds. Calls use finite turns; both SDK/transport retries and tracing exports are disabled. Streaming is not supported. Parallel tool calls are disabled; every tool callback checks cancellation/budgets and enters the existing MCP gateway. Memory, permissions and quarantine never depend on a model explanation.

Before inference, the wrapper reserves UTF-8 input bytes plus a protocol margin against the remaining token allowance and rejects oversized input. It bounds requested output and accumulates reported usage. Missing usage exhausts the remaining allowance, preventing another paid call. Reported over-budget usage stops before tools or another inference.

**These are application limits, not a guaranteed billing ceiling.** Token reservation is conservative estimation; providers may report late, include additional billed categories or complete a request after cancellation. An aborted request may cost money. Configure provider account limits/rate controls independently; inspect receipts before authorizing another run. No repeated paid experiment is automatically launched on failure or restart.

Requests disable response storage where supported and use no tracing exports. Synthetic tasks and tool results still leave the machine during remote inference, subject to provider policies; these flags are not a zero-retention guarantee. Lab persists only status, configured provider/model, returned response identifier, latency and reported token totals. It does not store chain of thought, prompts, provider exception payloads or full final output. Model-visible tools contain no agent credentials or admin controls.

## Opt-in smoke test

After deliberately enabling the server and authorizing one bounded paid run:

```sh
GHOSTOPS_RUN_MODEL_SMOKE=1 GHOSTOPS_URL=http://127.0.0.1:3210 npm run test:model
```

This submits exactly one normal experiment (up to 3 inference calls, 16,000 reported tokens, 600 output/call, 4 tools and 60 seconds), with no automatic second run. It checks successful invocation receipts, authorized tool workflow and absence of inconclusive completion. It was **not executed** during this implementation. An SDK/provider failure or token restriction is reported as failed/inconclusive, never live-model success.
