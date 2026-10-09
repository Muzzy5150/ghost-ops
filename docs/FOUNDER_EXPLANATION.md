# Ghost Ops in two minutes

Ghost Ops is cybersecurity for autonomous AI agents. It checks their authenticated tool requests, detects suspicious behavior and memory changes, and blocks operations that violate policy.

An integrated agent requests a tool through the MCP gateway. Before a handler runs, Ghost Ops checks identity, session, credentials, permissions, resource restrictions and containment. SQLite records the decision and evidence. Only approved bounded handlers execute.

AgentDNA compares observed behavior with a baseline. ShadowWatch separates verified identities from impersonation claims. MemoryGuard verifies signed content and provenance. GhostTrap records interest in synthetic decoys; interest alone is not proof of malicious intent. Ghost Hunt connects explicit cross-agent evidence. Ghost Response provides controlled containment. Forensic exports can be checked for integrity and authenticity with the trusted local signing key.

The public website is an interactive recorded sample case. Actual enforcement runs in the authenticated local runtime. Say “local runtime” for that screen and “recorded session” for the public terminal.

Three sponsors actually executed in one investigation. Guild.ai's The Smith completed the security task and requested a read-only policy check, which an authenticated local broker performed. ClickHouse stored 47 sanitized events and returned matching event IDs and 30 analytics groups. A Python worker on the existing Akash lease verified their public receipt-summary digest and rejected an altered summary. Pi is excluded.

The model initially misidentified an advisory. Source checking rejected that answer; corrected facts were verified. Agent output is evidence to review, never permission to execute a tool. Akash checks digest consistency; Ghost Ops separately authenticates forensic packages using the trusted local key.

Ghost Ops controls gateway-routed tools. It cannot automatically observe or stop arbitrary operating-system operations outside those integrations. A valid signature depends on retaining and trusting the signing key; it is not independent third-party attestation.
