# Phase 8: three-minute external-agent proof

Use an activated Phase 8 loopback server, built packages and a **new identity per presentation**. No reset, database insertion or paid model call. Two operator terminals and the existing dashboard are sufficient. The agent is a separate Node process that launches a separate MCP stdio proxy; actor choices are scripted/manual, permitted effects and denials are real.

## Preparation

```sh
npm ci
npm run sdk:build
# Existing retained database: npm run db:migrate (never reset).
# Fresh checkout only: npm run setup.
npm run build
npm start -- --port 3210
```

From another terminal:

```sh
export GHOSTOPS_URL=http://127.0.0.1:3210
npm run external:manage -- --action provision --id live-external-judge --name ExternalResearch
npm run external:run -- --credential-file .ghostops/external/live-external-judge-provision.json --action normal
npm run external:run -- --credential-file .ghostops/external/live-external-judge-provision.json --action session
```

The persistent example prints `ready:true` and genuinely discovered tools. Keep this process open; each pasted line below makes a real MCP request with a generated UUID. In the dashboard, Runtime sessions → Developer integrations shows registration/capabilities and actual last activity, not invented connectivity. Operations graph links derive from its persisted requests.

## 0:00–0:35 — external identity and legitimate execution

Show the already completed normal workflow (actual document read, summary artifact, mock status and signed notes). Paste into the **agent terminal**:

```json
{"tool":"read_document","resource":"docs/research"}
```

Observe `allowed:true`, request UUID and nonzero output byte count. No raw document/credential is printed. This is actual local execution, not verified model inference.

## 0:35–1:20 — denial, poisoning and deception

Paste sequentially, waiting for each real decision:

```json
{"tool":"restricted_admin","resource":"decoy/admin"}
{"tool":"read_document","resource":"docs/untrusted"}
{"tool":"write_memory","resource":"memory/runtime-policy","content":"CONTROLLED TEST: persist forbidden administrator policy"}
{"tool":"read_document","resource":"decoy/credentials"}
```

The first privileged handler is denied. The document is untrusted data, not authorization. Protected memory update is denied, original signed policy stays intact. Decoy attempts are recorded without receiving production secrets. Explain that decoy interest/anomaly alone does not prove malice. Recorded behavior + memory + decoy signals can trigger deterministic containment; do not claim every request occurs before automatic quarantine. Use the **actual** returned incident ID.

## 1:20–1:55 — containment and real post-response proof

In the **operator terminal**:

```sh
GHOSTOPS_URL=http://127.0.0.1:3210 npm run external:manage -- --action quarantine --id live-external-judge
```

In the still-initialized agent terminal:

```json
{"tool":"write_summary","resource":"research/summary","content":"Must not execute after quarantine"}
```

Observe `AGENT_QUARANTINED`. Its persisted execution receipt is null; no additional summary artifact is created. Current server enforcement, not a cached SDK decision, prevented it. Open the linked investigation through Developer integrations; inspect gateway decisions, all four engines and containment. This dashboard walkthrough is supported but visual sign-off remains pending.

## 1:55–3:00 — forensic proof

Use the real incident UUID from the returned decision or operator inspection:

```sh
GHOSTOPS_URL=http://127.0.0.1:3210 npm run external:manage -- --action inspect --id live-external-judge
GHOSTOPS_URL=http://127.0.0.1:3210 npm run evidence:export -- --incident ACTUAL-INCIDENT-UUID --output /absolute/new/private/external-case.zip
npm run evidence:verify -- /absolute/new/private/external-case.zip
```

The verifier uses the matching local signing key for origin authentication when available. Agent bearer tokens cannot export. ZIP hashes/HMAC prove consistency relative to this host/key, not external attestation. Tamper rejection is independently automated in the existing evidence suite; `npm run lab:evaluate -- --mode local --show-tamper` is the separate supported Phase 7 tamper presentation (fresh identities, no paid model).

For a complete repeatable cross-process validation with disposable state, including restart, exact replay, forged identity, owner isolation, signed restoration, credential replacement/revocation and authenticated export, run `npm run test:external`. It packs/installs into an unrelated consumer and cleans up only its test processes/state. Use new identity/output names for later live presentations; never reset retained history. Original guided and Security Lab demos remain available.
