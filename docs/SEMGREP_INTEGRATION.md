# Real local code security

Install CE in the ignored isolated checkout, or set `GHOSTOPS_SEMGREP_BINARY` to an operator-approved local executable:

```sh
python3 -m venv .ghostops/semgrep-venv
.ghostops/semgrep-venv/bin/python -m pip install semgrep==1.180.0
npm run test:semgrep
```

The actual verification returned one `ghostops.dynamic-eval` finding for vulnerable/sample.ts, zero for corrected/sample.ts, and one no-longer-reported fingerprint. The fixture is never executed. Local rules also identify dynamic Function construction; absence is not proof of no vulnerabilities or verified remediation.

Use Sponsor Integrations → scan → vulnerable/corrected → inspect → confirm. Approved-repository targets require server-held `GHOSTOPS_SCAN_TARGET_ROOT`; clients cannot submit paths. Runtime-artifact targets require an actual authenticated, permitted research/summary request. The handler artifact name and current content hash must match its persisted execution receipt before scanning. Scanner output links to that request/identity/session; only an existing matching incident is attached. Unrelated synthetic scans are not automatically merged into agent investigations.

Limits: copied snapshot, 50 supported JS/TS files, 64 KiB/file, 1 MiB total, recursion depth 4, symlinks refused, no arbitrary argv/shell. Fixed curated rules; CE/JSON, jobs=1, per-file timeout=3s, scanner wall timeout=30s, max-memory=256 MiB engine option, stdout/stderr cap=1 MiB. Metrics/version checks/secret validation/autofix/remote rule fetching disabled; subprocess environment excludes application credentials and proxy settings. These are process/engine limits, not an OS network sandbox or kernel-enforced aggregate memory ceiling. Git HEAD is recorded when available, but exact file hashes—not HEAD alone—identify uncommitted scanned content.

Complete paths/errors must validate before a clean result is accepted. Store identifiers, severity, lines, rule/file hashes, fingerprints and comparisons, not secret-bearing snippets. JSON ingestion only; SARIF support remains future work. Private runtime state is excluded from Turbopack tracing so scanner venv symlinks/keys/databases are not bundled.
