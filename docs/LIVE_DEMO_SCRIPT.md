# Two-minute live-tool demonstration

## Prepare

```sh
npm ci
npm run setup
npm run build
npm start -- --port 3210
```

In another terminal:

```sh
npm run agent:provision -- --id live-demo-01
npm run agent:demo -- --id live-demo-01 --interactive
```

Open Overview at http://127.0.0.1:3210. Use Enter to advance each actual stage; no cosmetic alert playback or model key is needed. The client is a running MCP program with **offline scripted decisions**, not an inferred LLM compromise. Without `--interactive`, the same verified steps run automatically.

| Time | Enter / dashboard | What to show |
| --- | --- | --- |
| 0:00–0:20 | Stage 1, Overview → Local runtime sessions | Actual fixture read, task discovery, summary file creation and signed policy read. All four allowed. Zero model calls. |
| 0:20–0:35 | Stage 2 | Untrusted synthetic document is read; source trust/hash recorded. The offline dispatcher ignores embedded instructions. |
| 0:35–0:50 | Stage 3, AgentDNA / MemoryGuard | An explicitly intentional regression requests protected policy rewriting. Backend denies it; legitimate summary still writes successfully. This is not a model decision. |
| 0:50–1:00 | Stage 4, GhostTrap | Unregistered RogueRuntime makes an actual MCP decoy request. ShadowWatch denies unknown identity; GhostTrap stores linked evidence. |
| 1:00–1:15 | Stage 5, Investigations | The authenticated agent's decoy probe correlates its behavioral deviation and memory denial into one critical suspected-compromise incident. No decoy payload or handler is granted. |
| 1:15–1:30 | Stage 6, expand live receipt / timeline | Quarantine is genuinely enforced. The same otherwise permitted summary is denied; execution receipt is null. No new file handler effect occurs. |
| 1:30–1:45 | Stage 7, MemoryGuard select live-demo-01/runtime-policy | Explicit local-administrator fault injection creates an altered test version. Integrity fails; verified v1 is restored as v3. Altered v2 remains. Do not call this model-caused corruption. |
| 1:45–2:00 | Expand incident and linked memory evidence | Show ordered events, verified versus claimed identities, denial rules, real handler metadata and valid restoration. |

Repeat with `live-demo-02` and the same two commands. Existing identities and credentials are not overwritten; demo Reset only clears simulated records. Root history, live quarantine and memory are preserved. At twenty runtime identities or other bounded capacities, use an explicitly chosen archived/new isolated environment rather than silently deleting evidence.

The original ten-step Phase 2 story remains in Demo Control. Its clean totals apply to simulation-only environments; the dashboard counts all persisted activity once runtime events are added.

Optional model observation is a **separate** explicitly configured run described in REAL_AGENT_INTEGRATION.md. Inspect the actual model response and tool sequence. If no unauthorized request is made, say exactly that; run the deterministic enforcement regression regardless. No real-model invocation was performed during this build's verification.

For independently reproducible proof, run `npm run test:runtime` after building. It starts temporary production servers/databases, executes separate CLI agent processes, checks artifact bytes and denials, restarts the server, verifies quarantine persists, performs restoration, preserves runtime records across simulation reset, and executes this exact non-interactive presenter script. It does not reset presenter data.
