# Four-minute multi-agent threat demonstration

Use a **fresh isolated checkout**, never the retained presenter directory. The following sequence builds Phase 10 without touching port 3210, historical data or the existing signing root. Keep the same Node executable for install/build/start (repository requires Node 22.12+; the actual Phase 10 verification version is recorded separately).

```sh
cd ghost-ops
git worktree add --detach /tmp/ghostops-phase10-demo phase10/ghost-hunt
cd /tmp/ghostops-phase10-demo
npm ci
npm run setup
npm run sdk:build
npm run build
npm start -- --port 3212
```

Use an unused `/tmp/ghostops-phase10-demo` path and unused port; never delete another worktree or kill a listener to recover. `setup` here creates only fresh isolated synthetic state and a fresh isolated signing key. A retained-key database activation is a different, approval-required procedure in the release checklist.

In a second terminal:

```sh
cd /tmp/ghostops-phase10-demo
export GHOSTOPS_URL=http://127.0.0.1:3212
npm run release:preflight -- --server-only
npm run hunt:demo -- --interactive
```

The demo pauses at eight numbered stages; Enter runs the next actual requests. Private output path is printed at completion; do not display credential files. No paid model key is required or used. Choosing scripted actions does not mean the operations or denials are simulated.

| Time | Action and evidence |
| --- | --- |
| 0:00 | Start three independent Node agents with their own stdio proxies. Approved research/status operations execute; freeze three trusted baselines. |
| 0:30 | Research reads the explicit untrusted fixture; a deterministic protected-policy update is denied. |
| 1:00 | Actual message references carry the source Research → Coordinator → Operations. The receiver gains no permissions; a protected-memory probe is denied. |
| 1:30 | Restricted administrator decoy is attempted. Independent RogueAgent and impersonation probes fail; unverified claims stay outside the trusted Hunt graph. Select an approved adaptive catalog overlay. |
| 2:00 | Open Ghost Hunt from the existing workbench rail. Select the newest case, its source/request links, tool capabilities and memory evidence. Novelty is not intent. |
| 2:30 | Explicitly enable APPROVAL_REQUIRED, preview, approve and execute existing containment. A subsequent real MCP summary write returns AGENT_QUARANTINED with no handler receipt. |
| 3:00 | Export the actual Hunt ZIP. Matching local HMAC verifies; an isolated altered ZIP fails. Original package remains unchanged. |
| 3:30 | Retire only the overlay, rotate/restore the Coordinator identity and prove a permitted read succeeds. Old critical history does not re-contain it. |

The CLI performs and asserts the backend actions; the browser is only a viewing aid and remains visually unverified. View actual `result.json`, `hunt-original.zip`, `hunt-tampered.zip` privately. To independently verify with this isolated instance's matching key:

```sh
npm run evidence:verify -- /absolute/printed/private/hunt-original.zip
# Expected nonzero exit, intentional isolated tampering:
npm run evidence:verify -- /absolute/printed/private/hunt-tampered.zip
```

Automated proof including fresh-epoch explicitly scoped automatic quarantine, normal server restart and 60 actual mock-status operations:

```sh
npm run test:hunt
```

It owns a separate ephemeral server/database/key and cleans only its own temporary fixture. Existing identity provisioning, signed snapshot restoration and Phase 1–9 demos remain available. Every repetition creates fresh identities/scope and retains history; scopes/message/gateway capacities are finite. Use a new disposable environment when evaluating beyond those limits rather than resetting user data. On failure inspect the returned denial and existing records; no automatic reset, changed-ID retry or unguarded fallback occurs. Stop only the process you started with normal Ctrl-C.
