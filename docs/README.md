# Documentation

## Start here

- [Architecture](ARCHITECTURE.md): frontend, gateway, persistence, and trust boundaries.
- [Security](SECURITY.md): local administration and enforcement scope.
- [Developer SDK](DEVELOPER_SDK.md), [external agents](EXTERNAL_AGENT_INTEGRATION.md), and [MCP proxy](MCP_PROXY.md).
- [Hosted workstation](HOSTED_WORKSTATION.md): recorded mode, shared components, and persistent backend roadmap.
- [Vercel deployment](VERCEL_DEPLOYMENT.md) and [CI](GITHUB_CICD.md).
- [Verification](DEPLOYMENT_VERIFICATION.md) and [current plan](PLAN.md).

## Investigation and execution

[AgentDNA](AGENTDNA_V2.md), [Ghost Hunt](GHOST_HUNT.md), [Ghost Response](GHOST_RESPONSE.md), [memory forensics](MEMORY_FORENSICS.md), [adaptive deception](ADAPTIVE_DECEPTION.md), [Security Lab](SECURITY_LAB.md), [forensic evidence](FORENSIC_EVIDENCE.md), and [benchmark methodology](SECURITY_BENCHMARKS.md).

[MCP gateway](MCP_GATEWAY.md), [local runtime](REAL_AGENT_INTEGRATION.md), [model execution](MODEL_EXECUTION.md), [autonomous agent execution](AUTONOMOUS_AGENT_EXECUTION.md), and [Web Sentinel](WEB_SENTINEL.md). External intelligence retrieval, inference, scans, and publishing each retain their own approval requirements.

## Optional integrations

[Semgrep](SEMGREP_INTEGRATION.md), [ClickHouse](CLICKHOUSE_TELEMETRY.md), [MongoDB](MONGODB_INTELLIGENCE.md), [Senso](SENSO_PROVENANCE.md), [additional integrations](ADDITIONAL_SPONSORS.md), and [GitHub report publishing](GITHUB_REPORT_PUBLISHING.md). Interfaces and mock receipts are not proof of deployed sponsor services.

## Repository map

| Path | Purpose |
| --- | --- |
| `src/` | Authoritative workstation, local APIs, gateway, engines, and runtime |
| `apps/website/` | Static recorded workstation, its lockfile, and frontend checks |
| `packages/` | TypeScript SDK and MCP stdio proxy |
| `examples/` | Independent external-agent example |
| `prisma/` | Schema and reproducible migrations; no databases |
| `tests/`, `fixtures/` | Platform regressions and bounded synthetic inputs |
| `scripts/` | Local server, verification, evidence, and operator tools |
| `artifacts/` | Preserved minimized forensic packages, including deliberately tampered samples |
| `deploy/` | Optional deployment examples; no hosted backend claim |
| `.github/` | Pinned, least-privilege CI workflows |

## Historical records

Superseded phase logs, release checklists, and visual-review reports were removed from the active snapshot. Complete original history is retained in a verified private offline Git bundle, never in the public website or repository. Historical references in older technical guides describe that archived work, not current release status. Reproducible forensic packages remain under `artifacts/`; original evidence timestamps and bytes are unchanged.
