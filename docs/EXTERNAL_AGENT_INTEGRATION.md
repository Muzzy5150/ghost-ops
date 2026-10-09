# External agent quickstart

Run a separate Node.js process using only Ghost Ops' public packages. Offline decisions are scripted, but its MCP requests and permitted local tool effects are genuine. No model API, server imports, database access or signing key is required by the agent.

## Start the server

Fresh checkout, Node.js 22.12+:

```sh
npm ci
npm run setup
npm run sdk:build
npm run build
npm start -- --port 3210
```

For existing retained data, **do not run setup/reset**. Stop the old presenter normally when ready, back up SQLite consistently with its matching private signing key, then `npm ci`, `npm run db:migrate`, `npm run sdk:build`, `npm run build`, and start. Phase 8 verification uses a disposable checkout; it does not replace the already running 3210 build.

## Provision and run

In a second terminal, from GhostOps:

```sh
export GHOSTOPS_URL=http://127.0.0.1:3210
npm run external:manage -- --action provision --id live-external-demo --name ExternalResearch
npm run external:run -- --credential-file .ghostops/external/live-external-demo-provision.json --action check
npm run external:run -- --credential-file .ghostops/external/live-external-demo-provision.json --action normal
npm run external:run -- --credential-file .ghostops/external/live-external-demo-provision.json --action probe
npm run external:manage -- --action inspect --id live-external-demo
```

Provisioning requires the existing authenticated local operator boundary. Its generated token is stored only in a 0600 private file in a 0700 default directory; stdout prints the filename/session, not the token. The server stores a credential digest, not raw secret. The default `research` integration gets bounded documents, status, summaries and own signed memory notes; it cannot grant decoy/admin/command/outbound access. `--role observer` grants only `status:read` on `infra/status`. `--tools`/`--resources` CSV flags select narrower catalog subsets.

The example defaults to a genuine separate **stdio proxy subprocess**; `--transport direct` uses the SDK's authenticated HTTP MCP client instead. `check` reports approved capabilities now, not permanent online status. `normal` makes four real read/summary/status/notes requests. `probe`, `poison` and `trap` request controlled forbidden admin, protected-memory and credential-decoy operations. They do not run attacks outside the synthetic environment. They are not model decisions. A critical correlated sequence can automatically quarantine the identity.

Inspect Runtime sessions → **Developer integrations** and Investigations. Registration, actual verified requests, last observed activity, current authority, capability subsets and incident links come from persisted records. Quarantine/revoke buttons reuse existing operator controls. No continuous heartbeat/transport-online assertion is made.

## Containment and replacement

```sh
npm run external:manage -- --action quarantine --id live-external-demo
npm run external:run -- --credential-file .ghostops/external/live-external-demo-provision.json --action check
# Expected authentication/containment failure, not tool execution.
npm run external:manage -- --action restore --id live-external-demo
npm run external:run -- --credential-file .ghostops/external/live-external-demo-restore.json --action normal
npm run external:manage -- --action revoke --id live-external-demo
```

Active identities use `--action rotate` instead of restore. Replacement is operator-only, idempotent and requires verified latest owned memory. All old credentials/sessions remain revoked/disabled. `restore` explicitly restores a contained identity; `rotate` alone cannot bypass containment. New files are exclusive; use a **new `--output` filename for another replacement**, never overwrite an issued file. A pending issuance file retains the command UUID/input for retry after uncertain delivery. Do not reuse revoked token material. The old generic Restore-agent control does not deliver external credentials; use this CLI for external replacement.

Fresh clients are rejected during MCP initialization after quarantine/revocation, before tools can be called. An already initialized persistent client still submits a request to the gateway and gets a persisted current-authority denial. For the latter proof, use `--action session` and the [presentation script](EXTERNAL_AGENT_INTEGRATION.md).

## Install independently

```sh
# GhostOps terminal:
npm run sdk:pack

# A new developer directory:
npm install /absolute/path/GhostOps/ghostops-sdk-0.1.0.tgz /absolute/path/GhostOps/ghostops-mcp-0.1.0.tgz /absolute/path/GhostOps/ghostops-external-agent-example-0.1.0.tgz
GHOSTOPS_URL=http://127.0.0.1:3210 node node_modules/@ghostops/external-agent-example/dist/main.js --credential-file /absolute/private/identity.json --action normal
```

This exact tarball installation pattern is tested in `test:external`; no registry publication occurs. The example imports only public package exports. You can replace its scripted decisions with your own agent tool-selection logic while keeping every supported tool behind this client.

Optional external OpenAI SDK mode requires `GHOSTOPS_MODEL_ENABLED=1`, `GHOSTOPS_MODEL`, private `OPENAI_API_KEY`, `--model --live`, interactive exact-run confirmation and synthetic inputs. It has strict application-side bounds and is not exercised in CI. **No genuine inference was performed**. External SDK response receipts are not server-attested provider verification; the dashboard must not infer verified-model provenance from them. See existing Security Lab model documentation for its separate transport-backed approval/receipt flow.

## Boundary

Only routed supported calls are protected. Unrelated files, network, shell, Codex/Cursor sessions and deliberately unguarded tool connections are **outside** Ghost Ops' enforcement boundary. An authorized local OS user may use existing operator bootstrap; this is not a public multi-user authentication system. See [security model](SECURITY.md).
