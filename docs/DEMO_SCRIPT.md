# Two-minute Ghost Ops demonstration

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
