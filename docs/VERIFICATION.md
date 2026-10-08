# Verification record

Verified in Node v24.10.0 / npm 11.19.0 on macOS, 2026-10-07.

## Completed

- Committed SQLite migration applied to the local database and isolated Vitest databases.
- TypeScript checking and ESLint pass.
- 26 Vitest tests pass: 18 security/unit, 7 integration, 1 component-render test for all eight sections.
- Optimized Next.js production build succeeds with all four API routes.
- Production HTTP verification on `127.0.0.1:3210` executes normal, rogue, memory poisoning, and full compromise through `/api/control` and the same ingestion gateway.
- Exact final scenario counts: 31 requests, 8 blocked, 3 incidents, one ResearchAgent quarantined; signed memory restored and verified.
- HTTP negatives: no administrative session, missing CSRF, hostile Origin, hostile Host, forged proxy headers, forged internal transport attestation, strict-schema rejection, and oversized bodies all rejected.
- Old agent credentials remain rejected after authorized restoration. Invalid credentials rejected over HTTP. Exact command retry does not duplicate containment.
- `npm audit --omit=dev`: zero vulnerabilities after tested transitive overrides.

## Fixed during verification

- Repeated manual quarantine after a new finding originally duplicated an audit action. Containment now recognizes already-contained state independently of incident association, and credential generations distinguish a later fresh containment.
- Next.js injects forwarded headers into requests. Rejecting them inside a route denied legitimate local traffic. The custom transport now checks incoming headers and actual socket before Next.js injects its own headers; API routes verify transport attestation.
- Node fetch ignores a forged Host override. The negative Host test now sends an actual wire Host header via `node:http`; the application rejects it.
- Secret redaction tests ensure neither credential digests nor memory signatures appear in snapshots.

## Unverified browser checks

The browser tool refused access to the local application, reporting that site permission was declined. No alternate browser or indirect browser automation was attempted. **Rendered desktop/mobile visual appearance and live browser interaction are not verified.** Production HTTP and static component rendering do not substitute for these visual checks.

Manual checklist for the presenter:

- Desktop at 1440×900: confirm navigation, six metrics, network topology, engine links, and recent activity are readable without clipped content.
- Mobile at 390×844: open/close menu, confirm heading controls fit, inspect two-column metrics and stacked panels, scroll wide tables horizontally, and verify no page-wide horizontal overflow.
- Run A/B/C/D using actual dashboard buttons; polling should update counts within 2.5 seconds.
- Search activity; change agent tabs; filter critical investigations; expand an evidence event.
- Select a tampered memory version (restore disabled), select verified history (restore enabled), verify the latest signature.
- Restore the contained ResearchAgent; verify status active and run normal operation again.
- Open timeline replay and scrub with next/previous and the range slider; counts/actions should remain unchanged.
- Verify keyboard focus and reduced-motion preference; confirm the trust-boundary explanation opens and closes.

## Known dependency limitation

Full `npm audit` reports the unpatched `braces` advisory through development lint tooling. Production dependency audit is clean. This limitation is documented in README and SECURITY; no forced downgrade or unsupported replacement was used to hide it.
