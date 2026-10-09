# Deployment verification

## Retained evidence

The public workstation implementation was verified at source revision `c430056ab62d3df2ae5bfe1f9e5b28026ab1586c`, with both GitHub CI jobs passing in run `37987837887`. The cleanup retains its frontend implementation unchanged. [The original HTTP receipt](evidence/hosted-workstation-production.json) records that release; it is historical evidence, not an assertion about a later deployment.

Verified workstation checks cover React Flow rendering and selection, custom node dimensions, window drag/resize/minimize and reload persistence, navigation and inspectors, recorded playback, mobile interaction, disabled operational controls, and absence of backend requests.

Static boundary checks compare exported presentation files to authoritative source, bind the minimized recording to preserved synthetic evidence, and reject privileged imports, APIs, credentials, databases, signing keys, and fabricated recency labels in public output.

## Cleanup release checks

Run website build, typecheck, lint, seven static/boundary tests, and five Chromium regressions. Review GitHub CI for the exact fresh root commit. Inspect its Git-connected Preview through normal authenticated access before replacing Production. For the released alias, verify metadata SHA, pages/assets/security headers, absent privileged endpoints and private files, then rerun browser regressions against that public URL.

The cleanup changes documentation and file hygiene, not runtime behavior. Existing platform evidence applies to unchanged code; CI still runs the platform pipeline. No new repository-wide security audit or historical adversarial rerun is required.
