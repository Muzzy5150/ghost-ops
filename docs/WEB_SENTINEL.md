# Web Sentinel

Web Sentinel is an additive, local research workflow, not universal agent/OS protection. Its approved tools discover public advisories, inspect declared npm dependencies, scan bounded code snapshots, prepare deterministic evidence-grounded reports and propose a separately approved issue publication. SQLite remains authoritative. All agent tool effects pass through the authenticated MCP gateway.

## Start the isolated checkout

```sh
cd ghost-ops
npm ci
npm run setup
npm run sdk:build
npm run build
GHOSTOPS_WEB_ENABLED=1 \
GHOSTOPS_SEMGREP_BINARY=/path/to/approved/semgrep \
npm start -- --port 3214
```

Use setup only in this isolated checkout; never reset or build the retained presenters. This generates a separate SQLite database and private signing key. If 3214 already responds, reuse it rather than launching a conflicting service. No configured provider is called merely by starting the app.

```sh
export GHOSTOPS_URL=http://127.0.0.1:3214
npm run sentinel:run -- --mode offline
npm run sentinel:run -- --mode live-web --sources osv,cisa,github
```

The CLI displays an exact preflight and approves that bounded offline/read-only web run. Model mode additionally requires explicit local approval or interactive provider confirmation. Run IDs are printed. The Web Sentinel window shows persisted receipts, source history, findings, protected-memory verification, linked incidents, report preview and requirement checks. Opening the panel never dispatches inference/publication.

## Capabilities and limits

- Three distinct identities: Research, Coordinator and Operations. Model decisions and scripted orchestration handoffs are labeled separately. One agent's content cannot grant another agent permissions.
- Approved repository: built-in vulnerable/corrected snapshots or `GHOSTOPS_SCAN_TARGET_ROOT`. No caller-selected filesystem path. Declared exact npm versions only; the first eligible dependency is queried. Ranges and transitive/installed dependency resolution are not implemented.
- Existing Semgrep CE rules; at most 50 supported source files, depth four, 1 MiB total, 30-second process timeout. No execution/autofix/remote rule download.
- At most one active run, 100 retained run records, 40 Sentinel requests per run and the existing 20-runtime-identity limit. Three identities per run means roughly six runs in a fresh lab. Use another isolated database for extended evaluations, never delete historical state to evade limits.
- Read-only monitoring: explicitly select two hourly checks in the UI (API allows 1–4 checks, 15–1440 minutes). Pause/resume; restart pauses it. Captured same-provider advisory IDs/content are classified new/updated/unchanged. Rechecks do not call a model or publish.
- Source failures are recorded as failures; the app does not silently substitute fixtures. Failed requested operations produce a partial workflow, not a successful scan.
- A finished conversation is not a completed investigation: source and actual scan coverage are checked independently. Cancellation, failure and restart interruption close this run's active sessions without inventing quarantine. Already accepted in-flight I/O is not claimed to have been rolled back.

See [model setup](AUTONOMOUS_AGENT_EXECUTION.md), [publishing](GITHUB_REPORT_PUBLISHING.md), [actual results](README.md#historical-records), and [security boundaries](SECURITY.md).
