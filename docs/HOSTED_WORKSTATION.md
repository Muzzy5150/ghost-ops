# Public workstation parity

The previous apps/website app was a separate marketing/showcase frontend. The public terminal now renders the real src/components/workspace/workspace.tsx through a presentation-only export, with no local Console transport or backend.

## Parity checklist

- Same Ghost Ops branding, design tokens, typography, React Flow, Dagre, 304 × 218 custom nodes, edges and network controls.
- Same window manager, presets, launcher, rail, inspectors, event terminal, drag/resize, minimize/maximize and versioned browser layout preferences.
- Same AgentDNA, ShadowWatch, MemoryGuard, GhostTrap and Incident Room components. Operational buttons are disabled.
- Ghost Hunt / Ghost Response, Security Lab, Web Sentinel, sponsor and developer panels use recorded-only adapters instead of privileged clients.
- Homepage editorial story; /terminal workstation; /about product overview; /docs and /developers local setup; /demo guided recording.
- Playback reveals the recorded timeline; illustrative graph identities/profiles/memory remain a fixed snapshot, not a reconstruction of private runtime data.
- No fabricated recency. The minimized recording's original precise UTC timestamps are preserved. Illustrative metadata references that recording, never new activity.

## Shared presentation boundary

apps/website/scripts/prepare-workbench.mjs exports an explicit allowlist of presentation components, pure graph/layout libraries and the three original stylesheets into gitignored generated/. Source files are tested byte-for-byte against src, which remains authoritative for both applications. Backend panels are replaced with recorded adapters. This avoids a second maintained copy of thousands of UI lines.

The website has a structural presentation contract extracted from Phase 12 State without server imports, and a wholly illustrative workstation-state.ts fixture. Existing recorded-case.json retains synthetic evidence IDs, ordinals and timestamps. Actor mappings, profiles and memory badges are illustrative, not authenticated attribution or cryptographic verification. No presenter database is read to prepare this dataset.

Exported imports never reach server/, runtime/, Prisma or the local Console transport. Public controls cannot provision, quarantine, restore, scan, infer, publish or issue external requests. No API routes/functions are exported. Authenticated downloads report that the local backend is required and never claim success.

Vercel remains the existing ghost-ops project in muzzy5150s-projects with private Muzzy5150/ghost-ops connected: root apps/website, Node 24, Next.js default output adapter. Include source files outside root for the explicit presentation export, with public source disabled. No runtime environment variables or backend credentials are required. Keep Preview authentication; use Standard Protection for reviewed public Production aliases.

## Persistent backend roadmap (not provisioned)

Keep this frontend and replace the recorded adapter with an authenticated data transport. A persistent host such as Railway can run the bounded Node MCP gateway and separate long-lived workers. After separate migration authorization, PostgreSQL can hold transactional decisions, incidents, containment and memory provenance. Keep signing keys in a managed secret store outside the database/client responses. Store forensic packages in access-controlled durable object storage with retention policies.

Use an operator identity provider, secure HttpOnly sessions, CSRF checks, explicit roles and per-operation authorization. External agents require distinct hashed, revocable, narrowly scoped credentials and sessions. No public enrollment or shared operator token. Public demonstration and privileged management APIs should have separate origins, permissions and deployment configurations.

Do not simply relax the loopback administration boundary for remote access. Implement and verify a dedicated remote operator boundary while retaining gateway decisions before effects. Workers need bounded concurrency, restart recovery, command idempotency and fail-closed enforcement. No database migration, chargeable service or worker activation is part of this release.
