# Vercel deployment

The existing private GitHub repository `Muzzy5150/ghost-ops` is connected to the existing Vercel project `ghost-ops` in `muzzy5150s-projects`. Production tracks `main`. The public workstation is [ghost-ops-pi.vercel.app](https://ghost-ops-pi.vercel.app).

## Configuration

- Root: `apps/website`; framework: Next.js; Node.js: 24.x.
- Install: `npm ci --no-audit --no-fund`; build: `npm run build`.
- Leave output override unset; the Next.js adapter handles `output: 'export'`.
- Include source files outside the root for the explicit presentation export from `src/`.
- Public source is disabled. No runtime secrets or backend environment variables are needed.
- Standard Protection keeps previews and immutable deployment URLs authenticated while production aliases are public.

Never deploy the root local service to this project. The website has no API routes or privileged backend imports. Recorded and illustrative data are labeled; operational actions are disabled.

## Verification and release

```sh
cd apps/website
npm ci
npm run build
npm run typecheck
npm run lint
npm test
npm run test:browser
```

Use a Git-connected Preview of the exact reviewed candidate, inspect build metadata and authenticated browser behavior, and review both GitHub CI jobs before updating Production. Protected HTTP checks must stop at authentication redirects; do not bypass protection or extract browser sessions. The correctly authenticated official Vercel CLI supports project inspection when connector permissions are insufficient.

After release, verify the public alias and exact Git revision using `scripts/verify-hosted.mjs`, then run public browser regressions. Failed candidate builds must leave the previous working deployment available. Existing project, repository, local services, databases, and keys are preserved.
