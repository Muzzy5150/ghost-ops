# Phase 5 — dark node-editor workstation

The network is the primary work surface, not a small illustration inside a dashboard. This phase changes presentation and interaction only: no server engine, route, migration, permission or presenter database was rewritten or reset.

## Design system

Near-black canvas, graphite title bars, steel borders and restrained cyan selection. Amber denotes claims/decoys and red denotes categorical severity or denied operations. State also has textual labels: color alone does not communicate enforcement. Body/control typography is generally 13–15px; agent names are 18px inside graph nodes and 21px in inspection. Technical provenance/timestamps use 11–12px monospace. Engine panels reflow using container queries.

The compact header names the workspace and actual polling connection. The 64px rail has larger icons, native tooltips/accessible names, an optional expanded tool-name mode, and thirteen operational tools. No marketing hero, synthetic graph activity, copied assets or reference branding was introduced.

The official [React Flow examples](https://reactflow.dev/examples) and [Dagre example](https://reactflow.dev/examples/layout/dagre) were consulted as source documentation, not rendered visual inspection. The secondary reference remained inaccessible from the previously saved denial; no claims about its appearance are made.

## Network architecture

`security-node.tsx` supplies memoized 304×218px nodes with distinct identity/capability/memory/decoy/case treatments, symbols, readable names, structured facts and provenance. Invalid credentials create separate claim nodes, never verified registry history. Local runtime means actual integrated local activity, not verified model inference. Memory ownership is labeled as ownership, not fabricated access.

`workspace-graph.ts` adds an actual actor→session-scoped tool projection to the preserved request, ownership and case links. `graph-explorer.ts` selects a bounded neighborhood (nine connected entities plus up to six identity roots), exposes explicit expansion and filters, and uses pinned `@dagrejs/dagre` 3.1.1 for deterministic left-to-right positioning. Dagre receives an independent dimensions object for each node; a regression checks non-overlap.

Initial focus uses a relevant registered actor and a few actual neighbors. Fit operations clamp to 0.75–1× zoom, intentionally allowing panning rather than shrinking all labels. Manual zoom remains 0.5–1.8×. Search focuses a visible match or expands to a matching hidden record. Selection, keyboard movement, drag suppression, zoom/pan, focus, fit-selection, directory inspection and explicit arrange are functional.

Layout runs on first mount, user scope changes or Arrange. Metadata/count updates do not reorganize existing coordinates. New topology appends new nodes until arranged. Saved manual coordinates override generated coordinates. No graph connection editor is enabled; moving nodes cannot change authority or evidence. Graph projections remain bounded and not exhaustive inventories.

Denied paths are red, verified requests steel/cyan, unverified bindings dashed amber. Edge labels appear around selected entities or selected evidence to avoid label clutter. Edge clicks resolve actual events/receipts, memory snapshots, registered sessions or case files. Timeline selection highlights links by exact evidence/request ID plus matching actor/session/verification/provenance—not time proximity. Evidence selection may reveal otherwise hidden nodes, explicitly retaining the actual stored path.

Optional node highlights respond only to increasing persisted event ordinals on already observed nodes, never initial seeding or timer-generated activity. Motion starts disabled and is suppressed for reduced-motion preferences. No continuous edge animation is enabled.

## Workbench and security tools

Operations opens only graph and terminal. At taller desktop sizes the graph receives about 67–72% of the area, full width; the inspector is closed. Below 650px usable height the terminal is parked/minimized and the graph fills the desktop. Incident Room uses a large left graph and right timeline/memory stack; evidence opens contextually. All tools remain reachable from rail, launcher and task strip.

Windows retain pointer/keyboard move/resize, eight resize handles, bounded focus ordering, minimize/maximize/restore/reopen. New title controls dock to the left/right half; moves snap within 14px of viewport edges. These are arrangement operations, not security actions.

The compact contextual inspector opens Overview first, then tabs for AgentDNA, Permissions, Sessions, Memory, Events and Investigations. Overview contains identity/status, runtime, active session count, current memory state, verified case count and last observation. Complete response controls use the original backend.

AgentDNA now uses two clearly separated visual lanes: trusted historical baseline and bounded observed permitted/denied requests, with actual resource expansion and categorical new-capability labels. Different exposure windows are explicitly disclosed; no compromise probability is implied.

MemoryGuard gains a bounded order-preserving LCS diff, side-by-side/unified modes, explicit additions/deletions, signed-version history and source trust. Repeated content is compared by position, not set membership. The comparison is capped at 160 segments per snapshot and full selected content remains visible. Text changes alone are not an attack verdict. Verify/restore authorization is unchanged.

GhostTrap retains the synthetic resource explorer, now with larger recognizable decoys and recorded policy/provenance/claimed-identity context in interaction history. Missing receipts say so; no outcome is guessed. The event terminal has readable rows, compact/expanded modes, existing filters/pause, explicit Follow, and scroll/expansion protection when investigating older events.

## Accessibility and responsive behavior

Keyboard launcher: Ctrl/⌘ K; Alt 1/2 presets. Title bars support Alt arrows to move and Alt Shift arrows to resize. Standard window controls and graph directory offer non-drag alternatives. Graph nodes support keyboard movement. Focus outlines, real button/select labels, textual outcomes, native tooltips and reduced-motion handling remain.

Widths ≤900px use one full-height active tool, selected through the mobile selector or rail, not shrunken desktop windows. Graph pan/zoom remains available. Toolbars wrap, diffs/behavior lanes stack, and wide evidence tables scroll within panels. Mobile does not overwrite desktop geometry. Actual touch/hit-testing and screen-reader QA are pending.

The React best-practices skill guided conditional graph loading, stable node types, memoized evidence projection, effect-event contextual focus, transient drag state and minimal validated local persistence. No full 3D renderer or unrelated UI framework was added.
