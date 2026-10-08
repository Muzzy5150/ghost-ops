# Two-minute Ghost Ops demonstration

## Before presenting

```sh
npm ci
npm run setup
npm run build
npm start -- --port 3210
```

Open `http://127.0.0.1:3210`. Use Demo Control → Reset environment → Reset demo records. Reset deletes only disposable synthetic records, then reseeds three agents, five traps, and two verified policy versions. Command receipts and the private signing key remain. Verify the overview shows no observed requests.

Keep the viewport at least 1280px wide for the live presentation. No API key, login provider, or Internet service is needed once dependencies are installed.

## Exact flow and narration

| Time | Action | Narration / proof |
| --- | --- | --- |
| 0:00–0:20 | Demo Control → Run normal operation. Briefly open Overview. | “These three authorized agents do their actual synthetic tasks through a enforcing gateway. Eighteen operations are permitted. Their baselines contain six trusted observations each; no incident occurs.” |
| 0:20–0:35 | Demo Control → Run rogue scenario. | “An unknown actor reaches for a fake credential vault. Identity verification blocks execution, while the decoy interaction records the actor, session, request, and evidence. Unknown is distinct from compromised.” |
| 0:35–0:55 | Run memory poisoning. Inspect latest backend receipt. | “An untrusted document tries to rewrite persistent policy and request a deployment. Both are rejected. The research summary still succeeds. A deliberately altered test snapshot fails integrity validation and is restored from a verified version.” |
| 0:55–1:15 | Run full investigation. | “Now the registered research identity shows linked behavioral deviation, memory manipulation, and honeypot interest. The deterministic rule correlates them into one critical investigation and automatically quarantines the agent.” |
| 1:15–1:40 | Investigations → select critical Correlated agent compromise. Scroll its timeline and expand the blocked summary event. | “The complete sequence is recorded here, including the source document and policy decisions. This otherwise authorized summary receives AGENT_QUARANTINED. Containment actually disables credentials and sessions.” |
| 1:40–2:00 | MemoryGuard → select latest verified version, then tampered version, then latest again. Click Verify integrity on latest. | “The altered snapshot remains as evidence. Restoration appended a new signed version from verified history. The content and provenance now verify. Detect the rogue. Trace the behavior. Protect the memory.” |

Final counts after A → B → C → D: **31 requests, 8 blocked, 3 investigations, 1 registered agent quarantined**, 3 decoy interactions, and a verified latest memory version. An active high-severity poisoning investigation is intentionally distinct from the contained critical compromise investigation.

## Show stronger proof if asked

- Demo Control → latest Full Compromise receipt: last request is `allowed: false`, `reason: AGENT_QUARANTINED`; `tamperDetected` and `restorationVerified` are true.
- Investigations → expand events: full evidence IDs, request/session IDs, rules, source-document references, and synthetic resource names are actual persisted data.
- Agent Registry → ResearchAgent: status quarantined; trusted baseline still frozen; sessions disabled.
- MemoryGuard: tampered v5 stays in history; verified restoration v6 is appended when executing the complete A/B/C/D sequence from reset.
- ShadowWatch → Restore ResearchAgent: a new credential and session are created. Prior credentials stay revoked. Use API verification for the explicit old-credential denial assertion.
- Demo Control → Run history → Replay: scrub stored evidence one event at a time. This is read-only and does not repeat tool effects or containment.

## Recovery

If ResearchAgent is already contained before presentation, reset the disposable environment. If port 3210 is occupied, use another explicit local port. If the UI reports database initialization errors, stop the server, run `npm run setup`, and restart. If signing material changed, the old protected memory cannot verify; preserve any desired evidence and reset this synthetic environment.

## Honest demonstration boundaries

The security checks and persistence are real. Agent runtimes, tool effects, documents, infrastructure, and decoys are simulated. The fault injection intentionally modifies only test memory. No prompt is evaluated by a real model, no external system is scanned or attacked, and honeypot interest alone does not prove malicious intent.
