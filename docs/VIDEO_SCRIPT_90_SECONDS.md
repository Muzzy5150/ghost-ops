# 90-second product walkthrough

Use a 1440-pixel browser window. Hide notifications, bookmarks, credentials and unrelated tabs. Record the browser and a terminal showing only sanitized receipts. Use QuickTime “New Screen Recording” or your existing OBS setup. Do not record private identity files, signing keys or sponsor configuration. No video has been captured by this guide.

| Time | Screen and action | Narration |
|---|---|---|
| 0–10 | Open https://ghost-ops-pi.vercel.app; scroll one section. | “AI agents can use powerful tools. How do you know when one has been compromised? Ghost Ops checks the tools they are allowed to use.” |
| 10–25 | Open the genuine local runtime at http://127.0.0.1:3215. Open Runtime sessions and select the submission agent. Show a completed allowed request. | “This is the local runtime. Each request carries a verified agent identity and session. Policy is checked before a bounded tool executes.” |
| 25–40 | Select the persisted denied request; open its incident and evidence. | “This controlled forbidden request was denied before its handler ran. It is an explicit security test, not an invented model failure.” |
| 40–55 | Open Sponsor Integrations → Submission execution evidence. Open the three receipts briefly. | “Guild ran the investigator. ClickHouse reconciled 47 real events. Our Akash worker checked the shared evidence summary and rejected a changed copy.” |
| 55–70 | Show the investigation graph, chronological evidence, quarantine receipt and blocked follow-up. | “Ghost Ops links the investigation to its authenticated requests. Scoped containment blocks the next guarded action.” |
| 70–85 | Show evidence verification output: original authenticated; modified copy rejected. | “The evidence package verifies successfully. An intentionally altered copy fails verification.” |
| 85–90 | Return to homepage or terminal branding. | “Ghost Ops: autonomous AI counterintelligence. Enforcement applies to tools connected through our gateway.” |

## Preflight and recovery

Run from `GhostOps-submission`, Node 24. Check `http://127.0.0.1:3215` before recording. The original presenter at port 3210 is separate and must remain untouched.

The run is `4dab14dd-0a73-4c76-9305-6c34ad86f74d`. In a second terminal, run the following commands individually at the corresponding recording beats. Each command prints sanitized receipts and writes a new private evidence directory. These choices are operator-scripted; the requests and effects are actual authenticated MCP operations.

```sh
export PATH="$HOME/.nvm/versions/node/v24.10.0/bin:$PATH"
export GHOSTOPS_URL=http://127.0.0.1:3215
node --import tsx scripts/submission-control.ts --step approved --run 4dab14dd-0a73-4c76-9305-6c34ad86f74d --identity .ghostops/recording-agent.json
node --import tsx scripts/submission-control.ts --step denied --run 4dab14dd-0a73-4c76-9305-6c34ad86f74d --identity .ghostops/recording-agent.json
node --import tsx scripts/submission-control.ts --step contain --run 4dab14dd-0a73-4c76-9305-6c34ad86f74d --identity .ghostops/recording-agent.json
node --import tsx scripts/submission-control.ts --step export --run 4dab14dd-0a73-4c76-9305-6c34ad86f74d --identity .ghostops/recording-agent.json
```

Expected output: `AUTHORIZED`; then `PROTECTED_MEMORY_WRITE_REQUIRES_ADMIN` and `TOOL_NOT_PERMITTED`; then `AGENT_QUARANTINED`; finally `authenticated: true` and `tamperRejected: true`. Never display the identity file itself.

In the browser, choose **Operations → Arrange**, select ResearchAgent in the inspector, and filter the timeline to Local runtime. After the denied command, choose the new incident from **Focus network investigation**, then **Incident Room**. Click a timeline event and **Inspect persisted evidence** to show the authorization decision. Use **Open Web Sentinel** to inspect actual source and invocation receipts. Keep only the necessary panel open for each beat.

All three sponsor receipts are persisted. Guild trace: `https://app.guild.ai/sessions/01a122d9-1384-351a-0000-5f4cefefda20`. Akash health: `https://5gbbs34frdf1f63hdvol7ldjnc.ingress.cpu.dal.aes.akash.pub/health`. Say “completed execution receipt” for these records. The Guild bridge is operator-mediated and read-only; Akash verifies public digests, not private signatures.

To refresh real analytics and worker evidence after recording new policy decisions, run these explicit operator commands before the final export:

```sh
node --import tsx scripts/submission-analytics.ts --run 4dab14dd-0a73-4c76-9305-6c34ad86f74d
node --import tsx scripts/submission-akash.ts --run 4dab14dd-0a73-4c76-9305-6c34ad86f74d
```

The count may increase as actual events accumulate. The 47-event receipt is an exact completed result, not a live counter. No Docker download or new lease is needed.

For another take after quarantine, rotate the owned actor into a new private file, then use that new filename in the commands:

```sh
node --import tsx scripts/external.ts --action restore --id live-web-0-7e263307 --output .ghostops/recording-take2.json
```

Never overwrite evidence or reset another database. If a sponsor is disconnected, omit its success claim. If a live request fails, show the persisted verified result with its precise timestamp and call it recorded evidence. The public `/terminal/` is always a recorded sample case.

Allow 20 minutes for rehearsal, recording, playback review and upload. Watch the entire final recording and check audio, readable text, duration and absence of secrets before submission.
