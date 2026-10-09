# GHOST OPS

**Autonomous AI Counterintelligence.**

Ghost Ops is a security workstation for investigating AI agent behavior, identity claims, memory changes, and tool access. Its local MCP gateway checks authorization before supported operations execute and records decisions in a forensic timeline. Investigators can explore an interactive agent network, inspect correlated evidence, compare memory versions, and review containment decisions through the same window-based interface used by the public demonstration.

## Core Capabilities

- **AgentDNA:** behavioral baselines and explainable deviation monitoring.
- **ShadowWatch:** identity verification and rogue-agent indicators.
- **MemoryGuard:** signed memory versions and integrity inspection.
- **GhostTrap:** inert deception resources and honeypot evidence.
- **Ghost Hunt:** cross-agent investigation and evidence relationships.
- **MCP security gateway:** scoped credentials, policy checks, and bounded handlers.
- **Web Sentinel:** approved security intelligence retrieval and investigation.
- **Forensic evidence verification:** manifest integrity and local-key authentication.

## Live Demo

[Open the Ghost Ops workstation](https://ghost-ops-pi.vercel.app).

The publicly hosted workstation is an interactive recorded-data demonstration. Explore the React Flow network, move and resize windows, switch between Operations and Incident Room, inspect evidence, and play back a sanitized synthetic investigation. Illustrative profiles and recorded events are explicitly labeled. Layout preferences persist in your browser.

Live backend enforcement is not hosted publicly. Provisioning, quarantine, memory restoration, scans, inference, and publishing are unavailable in this demonstration. Sponsor panels describe integration status; they do not claim active cloud monitoring.

## Technology

TypeScript, Next.js, React, Tailwind CSS, React Flow, and Dagre power the workstation. The local service uses Prisma with SQLite, Zod validation, the official MCP SDK, and separately enabled model adapters. TypeScript SDK and tools-only MCP proxy packages live under `packages/`. Vercel hosts the standalone static website in `apps/website`, reusing authoritative presentation components from `src/`.

## Quick Start

Use Node.js 24 and a fresh clone with isolated local state. Repository access is required.

```sh
git clone https://github.com/Muzzy5150/ghost-ops.git
cd ghost-ops
npm ci
npm run setup
npm run sdk:build
npm run dev -- --port 3210
```

Open `http://127.0.0.1:3210`. Use the provided server wrapper; direct `next start` does not establish administrative transport authority. Setup initializes local data, so do not run it against an existing investigation database. No external service or paid inference is required for offline operation.

## Documentation

- [Guide index and repository map](docs/README.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Developer SDK](docs/DEVELOPER_SDK.md)
- [Hosted workstation and backend roadmap](docs/HOSTED_WORKSTATION.md)
- [Security boundaries](docs/SECURITY.md)

## Security Scope

Enforcement applies to supported gateway-routed operations. Ghost Ops does not intercept unrelated OS activity or arbitrary agent connections. Detection rules are explainable indicators, not validated malicious-intent probabilities. Signing-key or host compromise defeats local evidence authentication. Keep credentials, databases, and signing keys private; model inference and external transfers require explicit opt-in.
