# Current plan

## Phase 13 — Shopipad visual system

- Work on `design/ghostops-shopipad`; preserve the clean initial release and normal Git ancestry.
- Use the local, read-only Shopipad frontend as the verified design reference. See [design reference](DESIGN_REFERENCE.md).
- Share black/forest/lime tokens and pixel branding with the authoritative workstation presentation.
- Serve the editorial product story at `/` and the existing interactive recorded workstation at `/terminal`.
- Preserve the approved transparent mascot; independently animate its clipped layers, pixel hem, hands, expressions, panels and sparkles along one measured scroll path.
- Verify responsive spacing, reduced motion, navigation, assets, graph, window persistence, playback and hosted restrictions.
- Push a verified design Preview, inspect its rendered interface, and fast-forward Production through the existing `main` connection. Retain the previous Production deployment for rollback.
- Preserve all other worktrees, services, databases, signing keys, forensic timestamps and the read-only Shopipad source.

## Future work

Connect the shared frontend to a persistent authenticated Node service and bounded MCP workers. Use durable storage, separate public/privileged APIs, independent operator authentication, and protected forensic retention. Database migration and chargeable infrastructure need separate authorization. See [hosted architecture and roadmap](HOSTED_WORKSTATION.md).

Continue platform development in its existing isolated branches. The public demo remains recorded; live enforcement, unrestricted scans, inference, enrollment, and publishing are not exposed on Vercel.
