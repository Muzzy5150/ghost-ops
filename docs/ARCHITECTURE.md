# Ghost Ops architecture

## Workstation

`src/components/workspace` owns the React Flow/Dagre network, custom nodes, window manager, navigation, and inspectors. Pure graph and layout models live in `src/lib`. Browser persistence stores presentation preferences, not credentials or forensic payloads. See [workspace architecture](WORKSPACE_ARCHITECTURE.md).

The local Console obtains authenticated SQLite-backed snapshots. The static website exports an explicit allowlist of the same presentation components, styles, and pure libraries at build time. Recorded adapters replace transport-dependent panels. There is one authoritative presentation implementation; generated website copies are ignored by Git. See [hosted workstation](HOSTED_WORKSTATION.md).

## Local service and gateway

`scripts/server.ts` binds to loopback, checks the actual transport, rejects inbound proxy attestation headers, and establishes the administrative boundary before Next.js handles requests. Management requires the administrative cookie, exact same origin, and CSRF protection. This trusts the local OS operator; it is not remote operator authentication.

The MCP gateway checks current identity, session, credential revocation, containment, tool, operation, resource, destination, and memory integrity before bounded handlers execute. Retries recheck authority and do not replay committed effects. SDK and stdio clients use this same gateway, rather than introducing alternative execution paths.

## Persistence and evidence

Prisma and SQLite persist policy decisions, ordered events, findings, investigations, containment, memory provenance, and simulation receipts transactionally. Agent credentials are hashed. The signing key remains outside the database and client responses. Simulation reset preserves runtime records and authority state.

AgentDNA, ShadowWatch, MemoryGuard, and GhostTrap supply explainable signals. Ghost Hunt correlates supported evidence; Ghost Response records approved containment. Decoy interest and behavioral novelty alone do not prove malicious intent. Forensic exports establish integrity under the documented local-key trust assumptions.

## Optional execution

Model inference, security intelligence retrieval, scanning, sponsor transfers, and publishing have separate explicit opt-in and bounded approval controls. Their availability is not proof of a successful live integration. Unintegrated OS activity is outside enforcement scope. [Security boundaries](SECURITY.md) and [model execution](MODEL_EXECUTION.md) describe limitations.

## Deployment

Vercel serves only `apps/website`, a static recorded-data workstation with no backend APIs, database, signing key, or live operational controls. The persistent Node/gateway/worker architecture remains local. A future authenticated persistent host requires a separately verified remote administration boundary; see the [backend roadmap](HOSTED_WORKSTATION.md).
