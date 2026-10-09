# Current plan

## Repository cleanup and release

- Preserve the verified public workstation and all local development worktrees/services.
- Back up all existing refs in a secure verified offline Git bundle before any rewrite.
- Replace chronological repository content with concise current documentation; retain source, fixtures, tests, and reproducible forensic evidence.
- Check the complete candidate snapshot for private material and run targeted website regressions.
- Verify a Git-connected Preview and exact-commit CI before replacing `main` with a genuine single-root snapshot.
- Set GitHub default and Vercel Production to `main`; verify actual remote history, GitHub file timestamps, and the public production revision.
- Remove obsolete remote deployment branches only after checking dependencies and recoverability.

## Future work

Connect the shared frontend to a persistent authenticated Node service and bounded MCP workers. Use durable storage, separate public/privileged APIs, independent operator authentication, and protected forensic retention. Database migration and chargeable infrastructure need separate authorization. See [hosted architecture and roadmap](HOSTED_WORKSTATION.md).

Continue platform development in its existing isolated branches. The public demo remains recorded; live enforcement, unrestricted scans, inference, enrollment, and publishing are not exposed on Vercel.
