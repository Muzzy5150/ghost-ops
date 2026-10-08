# Phase 5 visual QA — sign-off pending

## Actual inspection result

The browser runtime documentation was refreshed, then the existing Ghost Ops tab at `http://127.0.0.1:3210/` was selected. The tool rejected it because the saved localhost preference still blocks access. The user's earlier authorization does not override that saved permission. No alternate URL, browser surface, headless screenshot path, CDP connection or permission bypass was used.

**No Phase 5 screenshots were captured or inspected.** Operations, Incident Room, inspector, AgentDNA, MemoryGuard, GhostTrap, Live Events, laptop/tablet/mobile rendered appearance, true touch gestures, pixel clipping and visual performance are not signed off. DOM tests, production build and HTTP asset checks are not equivalent to visual inspection.

Official React Flow/Dagre source documentation was readable through web tools. This does not prove a rendered reference appearance. The previously denied secondary reference was not bypassed or copied.

## Automated checks versus visual checks

Synthetic Happy DOM exercises actual React Flow selection, node mouse dragging/click suppression, keyboard coordinate changes, canvas mouse pan, zoom controls, expansion/search/filtering and exact evidence highlights. Window gestures/docking/resize/focus/persistence and mobile navigation are tested in synthetic DOM. Pure layout tests verify independent rectangles and stable coordinates. These checks cannot validate actual CSS size, physical hit targets, browser touch or screen-reader behavior.

Code-level checks target 304×218 nodes, 18px names, 13–15px normal UI text, compact metadata, wrapped controls, single-panel mobile fallback, and independent graph/terminal area allocation. These are implementation facts, not screenshot findings.

## Minimum action for real screenshots

1. Enable the saved browser/site permission for **http://127.0.0.1:3210** in the connected browser tool settings, then tell Codex it has changed. A chat “yes” alone has not changed the saved setting.
2. Alternatively, manually open the local URL and attach screenshots. Keep browser zoom at **100%** and do not include private model tasks, credentials or configuration.
3. Capture **1920×1080**, **1440×900**, **1280×800**, **768×1024** and **390×844**. Use Reset layout (UI only), not Reset environment, if preserving evidence.
4. At 1440×900 capture Operations; selected ResearchAgent Overview; AgentDNA comparison; Incident Room with selected critical case/event; MemoryGuard altered/restored comparison; GhostTrap selected decoy; expanded Live Events.
5. On tablet/mobile capture the network and tool selector, MemoryGuard, incident evidence and Demo Control. Drag/pan/zoom only inside the graph; verify page-level overflow and off-screen controls.

## Manual acceptance checklist

- Nodes readable at initial focus without browser zoom; a connected agent/tool neighborhood is visible, not a fit-all tiny cluster.
- Fit keeps labels readable; pan, center selection, search/expand and Arrange make hidden entities reachable.
- Ports/edges are visible, no clipped control/overlapping node label; denied/unverified text agrees with color.
- Inspector is closed by default, compact when opened, tabs scroll and graph remains accessible.
- Window movement/resizing/docking/minimize/maximize/restore works; titles stay inside bounds; reload restores geometry and opaque node coordinates.
- Incident timeline selects actual evidence and highlights only supported links; owners/cases/sessions resolve correctly on edge click.
- Diff text wraps, additions/deletions stay readable, altered snapshots cannot restore, confirmed results come from backend receipts.
- Terminal filters/search/pause work; scrolling upward or expanding older events prevents follow from disrupting inspection.
- Mobile shows one full-height tool, every engine/demo reachable, touch pan/pinch reliable, no page-wide overflow.
- Reduced motion suppresses highlights; keyboard focus visible; contrast and actual assistive-tech behavior checked.

Do not call Phase 5 visually accepted until these screens are actually inspected and any defects fixed.
