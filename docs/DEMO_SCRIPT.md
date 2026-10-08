# Two-minute Ghost Ops demonstration

## Phase 7 evidence-driven demonstration (current)

Use [PHASE7_DEMO_SCRIPT.md](PHASE7_DEMO_SCRIPT.md) for the three-minute Security Lab → policy block → containment → report → tamper-detection flow. `GHOSTOPS_URL=http://127.0.0.1:3210 npm run lab:evaluate -- --mode local --show-tamper` runs eight versioned scenarios with actual MCP handlers and scripted decisions, never paid inference. It preserves existing history and creates new isolated identities. Existing windowed/node-editor and guided demos remain available.

Activate the new build only after normally stopping the old presenter and backing up SQLite with its matching key. The user's presenter was not rebuilt or restarted by this phase. Physical browser presentation/visual timing remains pending.

## Phase 5 node-editor walkthrough (retained)

Prepare with `npm run build` then `npm start -- --port 3210`. Open http://127.0.0.1:3210 at 100% browser zoom. **Reset layout** changes UI only. If deliberately resetting disposable simulated history, open Demo Control → New guided demo → Reset & start; runtime evidence is preserved. Do not run this reset if retaining the current simulation evidence.

1. **0:00–0:15 — Operations:** show the large **Tool network**, pan/zoom and select ResearchAgent. Its compact inspector opens Overview; open its AgentDNA tab → full view to show trusted baseline versus observed outcomes. With no observed calls yet, there are identities and memory ownership—not invented usage edges.
2. **0:15–1:05 — Actual enforcement:** reopen Demo Control from its task button/rail. Execute guided steps 1–8 in order. Minimize it between steps to expose the graph; permitted tool links and denied paths derive from stored requests. The terminal marks **SIM**. Open the decoy/evidence path or use agent filters/Expand records for additional entities.
3. **1:05–1:30 — Incident Room:** switch preset, select the critical ResearchAgent case. Click a denied tool timeline event; the evidence inspector shows its persisted policy receipt and the graph highlights exact recorded request links. Inspect `AGENT_QUARANTINED` and the actual containment action. Fit selection stays readable; pan for remaining entities.
4. **1:30–1:50 — Memory forensics:** reopen Demo Control and execute steps 9–10. Open the incident's Memory / restoration control, choose altered then verified restored history, switch Split/Unified diff, and inspect source trust and the verified restoration receipt. Altered snapshot restoration remains disabled.
5. **1:50–2:00 — Workbench:** drag/resize a window, dock it using title controls, maximize/restore, minimize/reopen. Reload after a short pause to restore geometry/node positions. Conclude: “Actual policy decisions, linked evidence, enforced containment.”

For **genuine local tools**, run `npm run agent:demo -- --interactive` in another terminal against a fresh isolated runtime identity; follow [LIVE_DEMO_SCRIPT.md](LIVE_DEMO_SCRIPT.md). Select it via the network agent filter and Runtime sessions. **LOCAL** means actual local MCP activity; offline choices remain scripted and no model call is implied. Never reuse a previously contained identity for a supposedly healthy-agent demonstration.

This exact backend story and live CLI are regression-verified on disposable production databases. Browser narration timing, rendered appearance and physical gestures remain unverified; obtain [PHASE5 visual screenshots](PHASE5_VISUAL_QA.md) before visual sign-off.

## Phase 4 workspace walkthrough (historical)

1. Before judging, start production with `npm run build` and `npm start -- --port 3210`. Open http://127.0.0.1:3210. Choose **Reset layout** (UI only), then **Demo Control → New guided demo → Reset & start** if explicitly resetting disposable simulation history. Runtime identities/evidence remain. Minimize Demo Control; the task strip reopens it. Never reset in the middle of an investigation you want to keep.
2. **0:00–0:20:** Operations → network **Operations map**, fit/zoom and select ResearchAgent. Its inspector shows registry permissions and signed memory. Drag the title bar and resize a corner; these are actual local preferences. Open AgentDNA from the inspector.
3. **0:20–1:10:** Reopen Demo Control and execute the existing guided steps 1–8 in order. Show normal work, rogue denial, untrusted document provenance, unusual deployment, protected-memory denial, legitimate task completion, correlated decoy-triggered containment, and `AGENT_QUARANTINED`. Every step commits backend evidence; no animation substitutes for it. Live Events labels these observations **SIM**.
4. **1:10–1:35:** Choose **Incident Room**. Select the critical ResearchAgent case. Click a timeline entry to populate the floating evidence inspector; inspect the denied summary's actual policy receipt. Use **Focus network** and fit the graph to show recorded links with unrelated records dimmed. Expand correlation interpretation or auditable response history if asked.
5. **1:35–1:55:** Reopen Demo Control and execute steps 9–10 (authorized synthetic tamper/restore test). Return to the incident, choose **Memory / restoration**, select the altered and restored versions, and show before/after text, source trust and verified current integrity. Verify only the latest good snapshot; verification itself records a real receipt.
6. **1:55–2:00:** Demonstrate maximize/restore, park a tool, and reopen it. Finish: “Detect the rogue. Trace the behavior. Protect the memory.” Reloading restores the arrangement, not credentials or backend state.

For **actual local tools**, follow [LIVE_DEMO_SCRIPT.md](LIVE_DEMO_SCRIPT.md) using a freshly provisioned isolated identity, then open **Runtime sessions** from the rail. Terminal provenance **LOCAL** means real local observations/tool requests—not necessarily model inference. The existing Phase 3 CLI and its seven stages are unchanged. No verified model-inference record is manufactured by this frontend.

Browser walkthrough timings and rendered visuals have not been executed by automation because saved site permissions block access. The underlying ten-step workflow and live CLI were independently verified over production HTTP with disposable databases. Use [PHASE4_VISUAL_QA.md](PHASE4_VISUAL_QA.md) before judging.

Phase 3's actual MCP tool demonstration is in [LIVE_DEMO_SCRIPT.md](LIVE_DEMO_SCRIPT.md). This retained script exercises the **synthetic** Phase 2 scenarios. Simulation reset now preserves runtime records; the clean totals below apply when no live records are present. No model inference is implied by this script.

## Before presenting

```sh
npm ci
npm run setup
npm run build
npm start -- --port 3210
```

Open http://127.0.0.1:3210. In **Demo Control**, click **New guided demo → Reset & start**. This privileged reset removes disposable observations/history and reenrolls three synthetic agents, five traps and two signed policy versions; command receipts and signing key remain. Verify zero requests. No model key or external service is needed.

Desktop/mobile visuals have not been browser-verified because the tool's saved site permission still blocked access after authorization. Before presenting, manually check 1440×900 and 390×844 using the checklist in VERIFICATION.md.

## Recommended guided flow

Each Execute button commits one real backend transaction. The completed marker means a persisted receipt exists, not an invented alert. Open “Inspect actual step receipts” for actual allowed/blocked decisions.

| Time | Exact action | Narration / evidence |
| --- | --- | --- |
| 0:00–0:15 | Execute step 1 | “Three registered agents perform 18 permitted tasks. Each learns six trusted baseline observations; no incident.” |
| 0:15–0:25 | Execute step 2 | “RogueAgent is unknown. Both decoy operations are denied; interest is recorded, not treated as proof of compromise.” |
| 0:25–0:35 | Execute step 3 | “Research receives an untrusted document. The server establishes source provenance even without caller-supplied source metadata.” |
| 0:35–0:45 | Execute step 4 | “An unusual deployment request deviates from the research baseline and is denied by policy.” |
| 0:45–0:55 | Execute step 5 | “An attempted protected-policy rewrite is rejected. No policy or permission changes.” |
| 0:55–1:00 | Execute step 6 | “The legitimate research summary still completes. Suspicion alone has not quarantined this agent.” |
| 1:00–1:10 | Execute step 7 | “Verified behavior, memory and decoy signals now correlate into one critical suspected-compromise investigation. Backend containment revokes credentials and disables sessions.” |
| 1:10–1:15 | Execute step 8 | “The same formerly permitted summary now returns AGENT_QUARANTINED. This proves enforcement.” |
| 1:15–1:20 | Execute step 9 | “Authorized test fault injection alters a synthetic snapshot. Integrity validation records valid:false.” |
| 1:20–1:25 | Execute step 10 | “A verified historical snapshot is restored into a new signed version. The altered history remains.” |
| 1:25–1:45 | Inspect investigation; expand blocked summary and restoration events | Show verified attribution, facts versus interpretation, recorded correlation decision, chronological ordinals, actual policy receipt and auditable containment. |
| 1:45–2:00 | Linked memory snapshot → inspect latest v4 and altered v3; Verify integrity on latest | Show source provenance, before/after comparison, verified restoration source and valid:true receipt. “Detect the rogue. Trace the behavior. Protect the memory.” |

Clean guided-story totals: **27 requests, 6 blocked, 2 investigations, 1 registered agent quarantined, 3 decoy interactions**. Latest memory is **v4 verified**; altered v3 stays in history. The rogue and critical incidents are contained. No extra poisoning incident is created: the authenticated stages share one attributed session.

Refresh or restart while paused: Demo Control resumes the stored cursor. Steps cannot advance out of order; duplicate command receipt replay never duplicates effects. If a command response is uncertain, retrying the same control retains its command ID. Guided run history replay includes its child normal/rogue runs and is read-only.

## Original A/B/C/D alternative

From Reset environment, run **Normal operation → Rogue agent → Memory poisoning → Full compromise**. These independently recorded scenarios still finish at **31 requests, 8 blocked, 3 investigations, 1 quarantined agent, 3 trap interactions**, with altered v5 retained and verified restoration v6. The poisoning scenario intentionally allows legitimate research to complete and leaves its high-severity investigation distinct from the contained critical incident.

## Stronger proof if asked

- Inspect actual guided step receipts: step 6 allows the summary, step 8 denies it, step 9 has valid:false, step 10 has valid:true.
- Investigations: unverified impersonation cannot contribute to another identity's verified critical correlation. Anomaly and decoy interest do not individually establish malicious intent.
- Agent Registry: ResearchAgent remains registered, status quarantined; credentials revoked and sessions disabled. Restore agent rotates credentials after checking every latest owned memory key.
- MemoryGuard: restore is disabled for altered snapshots; restoration only accepts verified history. A stolen signing key defeats integrity.
- `npm run test:restart` after a production build starts disposable production servers and verifies quarantine/replay denial, tamper detection, cursor persistence and restoration across actual process restarts.
- `GHOSTOPS_TEST_URL=http://127.0.0.1:3210 npm run test:api` resets the presenter's synthetic data and runs the original A/B/C/D HTTP verification. Do not run it in the middle of a presentation.

## Recovery and boundaries

If the agent is already contained or the story is inconsistent with other manually executed scenarios, start a new guided demo with an explicit reset. If port 3210 is occupied, choose another loopback port. For initialization errors, stop, run setup and restart. If the signing key changed, preserve evidence if needed and reset the disposable environment; the old key is required to verify old history.

Agents, documents, tools, infrastructure and fault injection are simulated. Credential/session checks, permission denial, persistence, correlation, containment and signed-memory validation/restoration are genuinely enforced. No real model follows the document, no external system is contacted or attacked, and no production-monitoring capability is claimed.
