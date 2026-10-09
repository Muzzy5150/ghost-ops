# Ghost Ops in two minutes

Ghost Ops is cybersecurity for autonomous AI agents. It checks their authenticated tool requests, detects suspicious behavior and memory changes, and blocks operations that violate policy.

An integrated agent requests a tool through the MCP gateway. Before a handler runs, Ghost Ops checks identity, session, credentials, permissions, resource restrictions and containment. SQLite records the decision and evidence. Only approved bounded handlers execute.

AgentDNA compares observed behavior with a baseline. ShadowWatch separates verified identities from impersonation claims. MemoryGuard verifies signed content and provenance. GhostTrap records interest in synthetic decoys; interest alone is not proof of malicious intent. Ghost Hunt connects explicit cross-agent evidence. Ghost Response provides controlled containment. Forensic exports can be checked for integrity and authenticity with the trusted local signing key.

The public website is an interactive recorded sample case. Actual enforcement runs in the authenticated local runtime. Say “local runtime” for that screen and “recorded session” for the public terminal.

The intended sponsor roles are Guild.ai for real agent execution, ClickHouse for sanitized telemetry analytics, and Akash for persistent compute. Count each only after its actual execution and receipt are verified. Pi is excluded from this submission. A prepared adapter is not a successful integration.

Ghost Ops controls gateway-routed tools. It cannot automatically observe or stop arbitrary operating-system operations outside those integrations. A valid signature depends on retaining and trusting the signing key; it is not independent third-party attestation.
