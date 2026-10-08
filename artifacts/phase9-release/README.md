# Actual release verification evidence

These are generated from the isolated release verifiers, not UI mockups or direct event insertion.

- `presenter-upgrade/upgrade-verification.json`: actual matching presenter-backup clone, additive migration, RC readiness/current signature checks, unchanged historical row counts and normal restart. No database/signing key is included.
- `external-mcp/original-evidence.zip`: actual persisted cross-process incident after MCP enforcement, correlation, quarantine and restart.
- `external-mcp/tampered-evidence.zip`: isolated copy with changed HTML and updated ZIP checksum but unchanged signed manifest; verification must fail.
- `external-mcp/verification.json`: actual creation-time authenticated verification result, case/agent IDs and key limitation. No agent credentials or signing key are included.

The external verifier used a **disposable private signing key**, which was not exported. Its matching HMAC validation passed at creation; later reviewers can independently check hashes, **not reauthenticate origin without that key**:

```sh
npm run evidence:verify -- artifacts/phase9-release/external-mcp/original-evidence.zip --hash-only
npm run evidence:verify -- artifacts/phase9-release/external-mcp/tampered-evidence.zip --hash-only
# Second command must exit nonzero. Hash-only success is not proof of origin.
```

The retained presenter's secret-bearing database/key backup is separate, private and Git-ignored under `.ghostops/backups/phase9-presenter-20261008/`. Never attach that directory to a submission. No genuine provider inference or browser inspection occurred.
