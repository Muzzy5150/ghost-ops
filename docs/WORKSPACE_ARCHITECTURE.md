# Workspace architecture

## Ownership

`src/components/console.tsx` owns authenticated snapshot polling and security commands. It preserves administrator bootstrap/CSRF, uncertain-request retry IDs, mutation serialization, confirmed receipts and integrity-failure reporting. `workspace/workspace.tsx` owns presentation: open tools, focus, current inspected objects, presets and responsive mode. No backend files, migrations, authentication or tool policy were changed in Phase 4.

## Windows

`src/lib/workspace-model.ts` defines thirteen tool IDs, two presets, the pure reducer, resize/move constraints and strict Zod preference schema. `workspace/window.tsx` implements pointer capture on title bars and eight handles. Input/buttons/links do not start title dragging; scrolling and text selection occur in the content area. During gestures a requestAnimationFrame updates only the window element, then final geometry commits once. Focus z-indices normalize to a bounded permutation. Maximize preserves restoration geometry.

The desktop ResizeObserver reclamps scaled geometry. Minimum size is 340×220 when bounds permit; maximum is the workspace itself. Narrow displays use flow-positioned panels rather than scaled desktop windows. Mobile observes its breakpoint without saving phone-sized desktop coordinates. Task strip, rail, launcher and mobile selector are non-drag alternatives. Closed/minimized tools unmount their content; central selected IDs and layout survive, but local filters/scroll/graph viewport may reset on reopening. This is not a general-purpose OS window manager.

## Persistence

`ghostops.workspace.v1` stores only `{version,preset,bounds,windows,positions,animations}`. Window records contain whitelisted tool IDs, numeric geometry, booleans and bounded z-order. Graph keys are opaque 16-hex identifiers and coordinates, capped at 200 entries. No labels, documents, event content, credentials, csrf or signing material are stored. Two noncryptographic hashes generate preference keys; these are not integrity/security identifiers. Strict schema, 60KB read limit, duplicate-window rejection and numeric bounds recover malformed preferences to Operations. Storage failure uses session-only layout and a visible status. Persistence is debounced 150ms; wait briefly after arranging before reloading.

## Graph projection

`workspace-graph.ts` creates at most 160 nodes and 280 links per projection from returned records. Registered sessions link through stored ownership. Each observed request links its verified agent or separate claim to its session-scoped capability and requested resource. Forged session strings never attach to registered session nodes. Compact edges are directly backed by the same recorded actor/resource request. Memory ownership comes from version metadata; latest chain nodes carry current computed integrity. Incident links preserve verified versus claimed attribution. Focused incident records are processed first when limits apply. There are no temporal-proximity or inferred-association edges.

The source snapshot is bounded (180 recent events, 120 runtime requests, 50 incidents with complete returned timelines, 80 versions/interactions, 30 sessions). Aggregate counters are database totals, but the graph is a bounded evidence view, not an exhaustive infrastructure inventory. Edge aggregation separates permitted/denied and verified/claimed observations; evidence IDs remain available. Session-scoped tools prevent misleading cross-agent tool paths. Recent replay denials override the projected historical request outcome without altering stored receipts. Graph positions never alter relationships or security state.

The React Flow 12.12 canvas is client-only/lazy, uses stable custom node types, disabled user-created connections, pan/zoom, fit/reset, keyboard movement and persisted node coordinates. Optional relationship animation is off by default and disabled for reduced motion. Virtualized viewport rendering plus record limits avoids unbounded canvas work; no extra graph layout or 3D dependency exists.

## Forensics and tools

`incident-desk.tsx` prioritizes actual chronological events, policy outcomes and containment; the original complete investigation view remains expandable. Timeline clicks populate `inspectors.tsx`, which resolves events from recent data or returned full incident timelines, exposes safe handler metadata and navigates back to actual agents/cases/memory. Unverified claims remain separate in entity matching. Existing memory verify/restore and agent controls invoke the original API and display results only after response/refresh.

`event-terminal.tsx` filters the existing feed by engine/severity/actor/provenance/search, sorts by persisted ordinal and supports expansion, display-only pause and auto-scroll. `behavior.tsx` compares verified recent session requests with trusted historical baseline counts, not probabilities. Engine/demonstration components retain their workflows and reflow through window-width CSS container queries.

## Keyboard and responsive use

- ⌘/Ctrl K: tool launcher; Escape closes it. Native help dialog traps modal focus.
- Alt 1 / Alt 2: Operations / Incident Room.
- Focus title bar: Alt arrows move; Alt Shift arrows resize by 20px. Maximize/restore also has a button and double-click.
- Rail/task buttons open/focus; mobile Active tool selector reaches every tool.
- Graph zoom/fit controls and accessible entity directory provide alternatives to pointer selection.

Tests use pure reducers, actual persisted backend snapshots and a synthetic Happy DOM environment. They do not substitute for Chrome/Firefox touch, hit-testing, screenshot or performance verification. Browser visual QA remains blocked by saved site permissions.
