# Phase 4 / Ghost Ops operations desktop

## Design direction

An original analyst's workbench: graphite background, rectangular operational windows, narrow utility rail, compact status line and parked-tool task strip. Operational cyan and muted green support orientation; amber and red are reserved for warnings/denials/severity. Sans-serif UI text contrasts with monospaced event ordinals, tools, hashes and identifiers. No promotional hero, fabricated telemetry, 3D engine or copied assets.

AgentryPad was requested as inspiration. Web access returned no usable content; browser access was explicitly rejected. No specific reference details were observed or assumed. The implemented design follows the user's functional requirements independently.

## Layout

- **Operations:** network and chronological terminal on the left, persistent agent inspector on the right.
- **Incident Room:** timeline-first case desk and related network on the left, evidence and memory forensic tools on the right.
- All engines, registry, runtime receipts, system summary and the preserved guided demo open as tools. Window title bars have minimize/maximize/restore/hide controls. The task strip focuses/reopens parked tools.
- Desktop supports dragging eight resize edges/corners, bounded movement, and saved geometry. At 900px and below, a single active tool selector replaces floating placement. Desktop coordinates survive mobile use.

## Evidence language

Graph links mean recorded ownership, observed requests or persisted incident attribution. Operations map aggregates direct actor/resource request evidence; Sessions & tools expands session-scoped capabilities. Claims use distinct dashed identities/sessions and never become victim history. Incident focus dims unrelated links rather than inventing associations. Node positions are layout, not evidence.

SIM identifies synthetic observations. LOCAL identifies actual local runtime observations, not proof of model inference. Permissions and containment remain server-side. Categorical severity, anomaly findings and honeypot interest do not prove malicious intent. Graph and inspector empty states report missing bounded evidence honestly.

MemoryGuard shows signed provenance and a sentence-based before/after comparison; it is not a full code-diff editor. GhostTrap shows actual deployed inert resources and recorded interactions, not external intrusion animations. AgentDNA shows trusted counts, observed resources, minute buckets and session comparison with explicit non-comparable exposure-window limitations.

## Interaction and accessibility

Visible focus outlines; semantic buttons/selects; native modal help; keyboard launcher, presets and title-bar movement/resize; accessible graph entity list; non-drag mobile navigation. Reduced-motion disables relationship animation; animations are off by default. Terminal display pause does not pause monitoring or enforcement. Labels and denial text accompany colors.

React best-practices review influenced conditional graph loading, stable node component types, derived graph state rather than effect-driven copies, memoized projections, bounded collections and frame-local window gestures.

## Actual verification boundary

Automated geometry, projection, escaped rendering and synthetic DOM interactions are tested. Production backend/MCP/demo verification is separate. No screenshots or real viewport inspection were obtained because saved browser permissions still block the local site. Do not describe this document as visual sign-off; see PHASE4_VISUAL_QA.md.
