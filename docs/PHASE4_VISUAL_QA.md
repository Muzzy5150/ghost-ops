# Phase 4 visual QA / explicit limitation

## Observed browser result

On 2026-10-07, reference inspection through web access returned no usable content. Browser creation for https://www.agentrypad.com was explicitly rejected. After the user replied “yes” to allowing localhost checks, binding the existing http://127.0.0.1:3210 tab was again rejected because a **saved site preference blocks browser access**.

No alternate browser surface, headless automation, raw CDP, indirect screenshot, permission bypass or external deployment was used. **Screenshots inspected: zero.** Large desktop, laptop, tablet and mobile rendered visual checks are all **unverified**. Synthetic DOM/component tests verify logic but not actual CSS layout, touch behavior, legibility or compositor performance.

Minimum action for future automated visual QA: the user must change the tool's saved blocking site permission for http://127.0.0.1:3210 to allow access. A conversational authorization alone has not changed that setting. Reference access is optional and should remain separate; the redesign uses original assets/layout.

## Presenter manual checklist (not yet signed off)

| Viewport | Check |
| --- | --- |
| 1920×1080 | Operations network, terminal and inspector readable; drag/resize eight handles; maximize/restore; no inaccessible windows |
| 1366×768 | Preset controls, title bars, task strip and dense timeline readable; fit/zoom graph; overlapping minimum-size windows remain focusable |
| 820×1180 | Single Active tool panel; every engine and demo accessible; graph touch pan/zoom; mobile navigation does not rewrite desktop arrangement |
| 390×844 | No page-wide overflow; filters/controls reachable; tool selector, case evidence, memory provenance and restoration usable; tables scroll within panels |

At each size inspect Operations, agent inspector, Incident Room, MemoryGuard, GhostTrap, runtime receipts and Demo Control. Capture screenshots only after actual browser access; do not manufacture them from static HTML.

## Functional visual walkthrough

1. Reset layout only; move/resize a window, reload after 150ms and compare positions. Minimize/hide/reopen and test foreground ordering.
2. Select graph agent, open AgentDNA and select a case. Click an actual timeline event; confirm floating evidence and graph focus refer to the same persisted incident.
3. Check unverified claims stay visibly distinct from verified registry/session history. SIM versus LOCAL is readable; no model inference is implied.
4. Search/filter terminal, pause display, execute a permitted backend action elsewhere, resume and inspect the newly stored event. Monitoring must continue while display is paused.
5. Run the original guided ten-step demo; inspect actual denial, quarantine, controlled tamper and verified restoration receipts. Resetting simulation preserves runtime records.
6. Toggle relationship motion and OS reduced motion; animation should stop. Use keyboard title-bar controls, launcher, entity directory and mobile selector without dragging.
7. Return from phone/tablet to desktop, confirm geometry restored and essential controls remain accessible. Check empty/error/stale-backend states.

## Code/DOM findings already addressed

- Window geometry uses one bounded positioning system, with frame-local gesture updates.
- Mobile no longer persists phone-sized desktop coordinates.
- Graph keeps unverified claims/session strings outside registered histories and scopes tool nodes by session.
- Compact graph uses recorded direct requests, not invented network links.
- Timeline selection and case/network focus synchronize centrally.
- Node drag drafts clear at commit, so Reset layout can reset positions.
- Untrusted strings remain escaped; runtime receipt lists scoped to an agent exclude forged claims.

These are code/automated interaction findings, not visual findings from screenshots. Remaining visual risks include graph legibility at small fit scales, overlapping minimum-size preset windows on short desktops, dense filter wrapping, touch hit areas and long evidence text. Use maximize/zoom/Active tool controls as available alternatives; actual visual sign-off is still required before claiming Phase 4's visual acceptance criteria are fully met.
