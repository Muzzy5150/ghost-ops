# Three-minute release demonstration

Release: `v1.0.0-rc.1`. Use the verified RC server, not the retained older 3210 build. Real external Node/MCP processes; scripted actor choices; zero paid inference. Do not reset history.

## Prepare before judging

After safe activation or in a fresh isolated checkout:

```sh
# Keep install/start/CLI on the same Node version (verified: 24.10).
export GHOSTOPS_URL=http://127.0.0.1:3210
npm run sdk:build
npm run release:preflight -- --server-only
npm run release:demo -- --prepare
```

Preparation prints a fresh restricted `agentId`, `credentialFile` and private output directory. Copy the **filename**, not its contents. Then:

```sh
npm run release:preflight -- --credential-file /absolute/printed/private/identity.json
npm run release:demo -- --execute --credential-file /absolute/printed/private/identity.json --interactive
```

The exact prepare/preflight/execute sequence is tested against a production build. `--interactive` pauses between stages for narration; it requires a real terminal. Without it, the same proof runs unattended for regression/backup presentation. Ctrl+C stops further requests at safe boundaries; already committed operations are not rolled back. Identity files and local verification keys must never be displayed or submitted.

If the old presenter remains on 3210, run the fresh isolated RC on **3211** and change `GHOSTOPS_URL` accordingly. Never point fresh setup/reset commands at retained evidence.

## 0:00–0:15 — problem

“AI agents read outside content, use tools and remember instructions. A valid identity doesn't tell us whether the next action is authorized. Ghost Ops verifies the actor, enforces tool boundaries and preserves evidence of what actually happened.”

Show Operations/Runtime sessions. Say: “This offline demo scripts choices; the external process, MCP traffic and security enforcement are real.” Physical browser presentation is supported but visual timing/sign-off remains unverified.

## 0:15–0:40 — normal external agent

Continue stage 1. An independent process completes permitted document read, summary file, status and signed notes operations. Point to actual request UUIDs and Developer integrations / runtime receipts. Registration alone is not claimed as permanent connectivity. No model-inference badge is justified.

## 0:40–1:10 — main moment: forbidden handler never runs

Continue stage 2. The external MCP request attempts the restricted admin decoy. Read its actual denial reason/UUID. Show persisted `execution:null` in the runtime case, not a success animation.

“The agent requested it. Ghost Ops refused it before dispatch. This isn't just an alert after the fact.”

## 1:10–1:45 — investigate the chain

Continue stage 3. Approved ingestion retains untrusted provenance; an attempted protected-memory write is rejected; a synthetic credential decoy attempt is recorded. Open the **actual printed incident UUID** in Investigations from Developer integrations. Show verified identity, source, policy decisions, AgentDNA findings, MemoryGuard and GhostTrap evidence.

“These signals explain the investigation; an anomaly or decoy contact alone doesn't prove compromise.” If deterministic critical correlation already quarantined the actor, say so accurately. Do not imply that the subsequent manual control caused an earlier automatic response.

## 1:45–2:15 — containment proof

Continue stage 4. Existing authorized quarantine is applied/idempotently confirmed. The still-initialized external MCP session requests another summary write. It returns `AGENT_QUARANTINED`; the script checks the persisted handler receipt is null.

“The transport is still connected, but current server authority wins. Cached discovery cannot bypass quarantine.” Restart/credential restoration are separately covered by the release tests, not silently demonstrated here.

## 2:15–2:50 — forensic verification

Continue stage 5. The actual investigation exports to `original-evidence.zip`. Independent CLI verification checks hashes **and matching local HMAC**. The script changes `summary.html` in a separate `tampered-evidence.zip`, recomputes valid ZIP checksums but retains the original manifest. Verification rejects that content mismatch and verifies that original bytes remain unchanged.

Show `authenticated:true`, `tamperRejected:true`, `originalUnchanged:true`, and the actual private output paths. `result.json` keeps minimized proof IDs/decisions. Local HMAC is not externally attested and does not rule out host/key compromise.

## 2:50–3:00 — close

“External developers can integrate the TypeScript SDK or supported MCP proxy. Ghost Ops shows what the actor attempted, what policy prevented and the evidence behind it. It protects routed tools—not every operating-system action.”

## Recovery

- Old server/version mismatch: don't demo it as RC; use the [safe activation sequence](RELEASE_CHECKLIST.md). Never kill an unknown port owner.
- Invalid/closed/revoked credential or already contained/completed demo: run `release:demo -- --prepare` for a new identity/output directory. Do not reset or revive an old token.
- Proxy failure: check `npm ci`, `npm run sdk:build`, current credentials and server health; no fallback executor.
- Existing evidence filename: use a new prepared directory; no overwrites.
- Unexpected shutdown: restart the **same RC checkout/database/key** normally, run preflight; quarantine persists. If state is uncertain, keep the case and prepare a new identity.
- Missing model config: irrelevant; this demonstration requires no model/API key.

Original Phase 7 Lab and guided demonstrations remain available. Automated full proof: `npm run test:external`. See [90-second fallback](HACKATHON_DEMO_90_SEC.md) and [limitations](RELEASE_LIMITATIONS.md).
