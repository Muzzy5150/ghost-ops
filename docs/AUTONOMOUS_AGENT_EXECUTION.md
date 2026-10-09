# Genuine bounded model execution

The official `@openai/agents` Agent/Runner and OpenAI client are reused; no alternate sensitive tool handlers exist. Custom tools route to real authenticated loopback MCP. Tracing, sensitive SDK logging, storage and transport retries are disabled. No hidden reasoning is stored. A public final response is an **unverified model interpretation**, not an established finding or authorization.

## Installed local model (actually executed)

```sh
cd ghost-ops
GHOSTOPS_WEB_ENABLED=1 \
GHOSTOPS_SEMGREP_BINARY=/path/to/approved/semgrep \
GHOSTOPS_MODEL_ENABLED=1 GHOSTOPS_MODEL_PROVIDER=ollama-local \
GHOSTOPS_MODEL=LiquidAI/lfm2.5-350m:latest \
GHOSTOPS_MODEL_BASE_URL=http://127.0.0.1:11434/v1 \
GHOSTOPS_LOCAL_MODEL_ALLOW_NO_AUTH=1 npm start -- --port 3214
```

In another terminal:

```sh
GHOSTOPS_URL=http://127.0.0.1:3214 npm run sentinel:run -- --mode model --approve-local --sources osv
```

This explicit flag approves only an `ollama-local` preflight, never a hosted provider. The first verified run used the already-installed 379 MB model. There was no download and no paid call. Local inventory is checked before each invocation: exact installed identifier, 64-character digest, no remote/cloud alias, size between 1 KiB and 2 GiB, loopback `/v1/chat/completions` only. Larger models are outside this conservative adapter's support.

Ollama's [OpenAI-compatible interface](https://docs.ollama.com/api/openai-compatibility) is used with Chat Completions. Compatible generic Responses endpoints remain separately labeled unverified unless actual trustworthy transport evidence is supported. An OpenAI-compatible **local server is not OpenAI-hosted sponsor execution**.

## OpenAI-hosted option (not executed)

Set private shell configuration `GHOSTOPS_MODEL_ENABLED=1`, provider `openai`, an exact approved `GHOSTOPS_MODEL` and project-specific `OPENAI_API_KEY`. Do not copy credentials from unrelated sessions or enter them in chat. Then:

```sh
GHOSTOPS_URL=http://127.0.0.1:3214 npm run sentinel:run -- --mode model --live --sources osv
```

The CLI requires a TTY and exact provider/model/run-ID confirmation. UI approval is an authenticated, CSRF-protected exact preflight. Key presence alone never starts inference. Ordinary tests and CI reject provider transport calls. Costs and retention depend on the provider; application limits are **not guaranteed billing ceilings**. See the official [Agents SDK](https://openai.github.io/openai-agents-js/).

## Receipts, decisions and cancellation

Default CLI limits per role: three calls, 24,000 reported/reserved tokens, 512 output tokens, six tool requests and 60 seconds; overall run deadline 180 seconds. `--calls 4` is an explicit increased call budget (schema maximum eight per role). UI/API preflight displays exact total limits across all three roles. Reported missing usage prevents further calls. Cancellation is checked before inference and tool boundaries; accepted in-flight I/O may finish and is not described as rolled back.

Successful transport-backed response identifiers, reported model, timing, usage and matched model-selected tool receipts establish local/provider provenance. Scripts and injected mocks cannot assert it. All three specialists did perform inference in the first run, but only Research and Operations selected tools. Research hit the turn cap; Coordinator did not request a scan. It remains **partial**, not fully successful autonomous three-agent work. No model compromise/resistance conclusion is inferred from absence of prohibited calls.

`--injection` exposes a separately labeled synthetic source through a guarded fixture tool in model mode; it never modifies real advisories. The model may choose not to inspect it. Actual exposure/write attempts are recorded; deterministic denial proofs are separate.

The second bounded local run made real tool choices under all three identities: live OSV retrieval (Research) and report preparation (Coordinator/Operations). It did not select scanning or read the injection fixture. The final worker separately checks source/scan coverage rather than confusing SDK conversation completion with full task completion. Stopped or interrupted runs close their own active sessions, and no new guarded request can use those sessions.
