# GHOST OPS — hackathon submission

**One line:** Evidence-driven security for AI-agent tools: authenticate the actor, enforce the boundary, investigate the behavior and verify the record.

**Tagline:** Detect the rogue. Trace the behavior. Protect the memory.

## Problem

An AI agent can ingest outside instructions, request tools and persist memory. A legitimate identity does not guarantee legitimate behavior. A log-only dashboard can describe an unsafe action after it happens; it cannot prevent a prohibited handler from running. Agent memory and claimed identity also require explicit trust boundaries.

## Solution

Ghost Ops is a local defensive gateway and evaluation workbench. Independently running Node applications connect through the TypeScript SDK or supported MCP stdio proxy. Server-side identity/session, resource permissions, quarantine and revocation are checked before bounded local handlers execute. Four engines produce explainable evidence:

- **AgentDNA:** verified behavioral history, unusual tools/resources/sequences and deviations. Novelty is not proof of compromise.
- **ShadowWatch:** verified versus claimed identities, capability denials and current containment authority.
- **MemoryGuard:** protected policy-write authorization, source provenance, signed version history, tamper detection and verified restoration.
- **GhostTrap:** isolated synthetic decoy interactions, linked policy outcomes and investigations. Decoy interest alone does not prove malicious intent.

SQLite persists tool decisions, sessions, findings, containment and investigations. Security Lab runs versioned controlled evaluations. Deterministic reports export actual records as a bounded ZIP with content hashes and a locally authenticated manifest.

## Architecture and technologies

External Node agent → official MCP client → stdio security adapter → authenticated loopback MCP gateway → existing bounded handler → four engines / incident correlation → dashboard and forensic export.

Next.js App Router, React/TypeScript, SQLite/Prisma, Zod, official MCP TypeScript SDK, optional OpenAI Agents SDK, Vitest, React Flow and Dagre. Public `@ghostops/sdk` and `@ghostops/mcp` 0.1.0 packages build with declarations and install independently from local tarballs. No publication or cloud account is required.

## Actual demonstration

An external agent program starts in its own OS process. It discovers permitted MCP tools and completes a harmless document/summary/notes workflow. A restricted operation is denied before its handler runs. Untrusted-document/protected-memory/decoy observations correlate into an investigation. Quarantine prevents another call, including through the already initialized transport. A downloaded report authenticates with the matching local key; an altered copy fails verification while the original remains unchanged.

**The demo scripts the actor's choices. MCP traffic, bounded tool effects, authorization, persistence, memory signatures, correlation, containment and evidence verification are real.** No genuine provider inference has been verified; mocked SDK responses are not presented as inference.

## Technical achievements and verification

The release suite passes **268 tests across 21 files**, plus typecheck, zero-warning lint and production build. Genuine independent tarball installation and separate agent/proxy/server processes verify permissions, identity isolation, exact replay, current revocation, quarantine across restart, restoration and fresh critical containment. A prior historical-session re-quarantine defect is explicitly reverified: revoked old evidence cannot recontain restored current authority, but new qualifying activity can.

A consistent backup of the retained presenter and its matching key was privately verified. An isolated copy upgrades and restarts with unchanged original records/current signatures; intentionally altered historical snapshots are preserved. Existing Security Lab evaluations, guided demos, memory restoration and forensic/tamper workflows pass. Production dependency audit is clean; existing development-only advisory entries remain. See [release verification](RELEASE_VERIFICATION.md) for precise evidence and qualifications.

## Limits and roadmap

Only operations routed through supported Ghost Ops tools are enforced. Unrelated OS/filesystem/browser/network actions and unguarded agent connections are outside scope. This is a tools-only local MCP integration, not a universal Codex/Cursor firewall or arbitrary upstream MCP proxy. Local administration trusts the OS operator; public/multi-user deployment is unsupported. Local HMAC/signatures do not survive host/key compromise. Controlled results are not real-world detection accuracy. Visual sign-off and genuine-provider verification remain pending.

Future work: explicit real-provider evaluation with fresh approval, broader tested framework adapters, independently authenticated production administration, stronger deployment isolation, production memory adapters and independent evidence attestation. These are not current product claims.

## Judge Q&A

**How is this different from a logging dashboard?** The gateway decides before executing. Forbidden and quarantined requests have persisted denials with no handler execution; the dashboard explains those stored decisions.

**How is unauthorized execution prevented?** Credentials bind a registered actor to its session. The server checks current authority, tool/operation/resource grants and signed memory where applicable, then dispatches only a fixed bounded handler. SDK/UI assertions cannot grant permission.

**What if a legitimate agent is compromised?** Identity remains registered, but verified behavior/memory/decoy evidence can justify suspected-compromise containment. Quarantine revokes guarded authority. Ghost Ops does not terminate or control unrelated OS processes.

**How does memory poisoning detection work?** Untrusted source provenance persists. Protected writes require independent operator authority; ordinary agent requests are denied. HMAC covers content and version provenance; altered records fail integrity checks. This is not universal semantic detection of every malicious sentence.

**Why honeypots?** Synthetic decoy contact adds traceable investigative context and corroborates other signals without risking real credentials. It is not proof of malicious intent by itself.

**How do developers connect?** Install the local TypeScript SDK/proxy tarballs, provision narrow credentials with the operator CLI, and route supported calls through MCP. The external example imports only public packages, never private server/database code.

**How authentic is the evidence?** SHA-256 detects content changes relative to the manifest; HMAC authenticates it relative to this local key. Verification rejects altered files/manifest inconsistencies. Neither proves an uncompromised host or independent third-party attestation.

**What can't Ghost Ops protect?** Any operation not routed through its supported gateway, stolen signing keys/host compromise, arbitrary third-party MCP servers and currently unimplemented framework/runtime integrations.
