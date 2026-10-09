# Actual Phase 12 evidence

These are actual persisted/exported observations, not screenshots or mockups. No credentials, signing keys or SQLite database are included.

- `model-run/`: initial genuine local inference run, live OSV retrieval, deterministic protected-memory/decoy/containment proof; original and intentionally altered ZIP plus receipts.
- `model-with-scan/`: same partial autonomous run plus a real independently executed, explicitly operator-selected Semgrep follow-up. This scan was **not selected by the model**.
- `live-web-run/`: scripted decisions with actual OSV/CISA/GitHub retrieval, real Semgrep and guarded tools. No inference.
- `offline/`: disposable independent stdio MCP workflow with actual scanner/enforcement/restart/evidence checks. Sources are synthetic and model calls zero.
- `final-offline/`: repeated disposable production-server proof after the implementation checkpoint, again with actual scanner/stdio/enforcement and no external services.
- `final-model/`: second actual local run, six responses and model-selected tools under all three identities, live OSV retrieval, and an explicitly operator-selected follow-up scan plus separate deterministic containment proof. No model-selected scan or synthetic fixture exposure occurred. Historical `completed` denotes SDK completion before the final independent coverage check; it does not claim a fully autonomous research/scan workflow.

`final-model/report-preview.json` is a later refreshed exact-content preview including the operator-selected scan. It has no approval token, its GitHub target is unconfigured, and `canExecute:false`. No publication occurred. The earlier authenticated original ZIP remains preserved as captured rather than overwritten by the refreshed preview.

`verification.json` files contain exact run/request IDs, source retrieval timestamps/digests, model receipt metadata and machine-derived PENDING challenge assessments. Historical early-run source selections/report formatting are preserved as captured, not retroactively replaced by later parser refinements. Each source/scan carries its own provenance. Original ZIPs validate; intentionally tampered ZIPs must fail.

```sh
npm run evidence:verify -- artifacts/phase12-sentinel/model-with-scan/original-evidence.zip
npm run evidence:verify -- artifacts/phase12-sentinel/model-with-scan/tampered-evidence.zip
```

Matching Phase 12 key required for local HMAC authentication; it is intentionally excluded. Other checkouts/reviewers should use `--hash-only`, which establishes content consistency, **not trustworthy origin**. The disposable offline verifier key was destroyed with its isolated environment; its authenticated result was captured at verification time. No GitHub artifact URL is claimed because publication never happened. Verified sponsor technology: Semgrep only.
