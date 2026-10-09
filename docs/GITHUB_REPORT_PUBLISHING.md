# Exact-approved GitHub reporting

Default: **dry-run**. No repository/token was selected and no issue was published during Phase 12 verification. Do not treat a local ZIP/report as the real-world publishing milestone.

Only the fixed operator-configured owner/repository and `create-issue` operation exist. There are no model-selected repositories, arbitrary URLs, comments, PRs, administrative operations or autonomous repeat publications. Use an operator-controlled demonstration repository and narrow GitHub credentials, preferably fine-grained Issues write plus required repository metadata/read access. Set tokens privately, never in source/chat/logs.

```sh
export GHOSTOPS_GITHUB_OWNER=YOUR_AUTHORIZED_OWNER
export GHOSTOPS_GITHUB_REPO=YOUR_AUTHORIZED_DEMO_REPOSITORY
export GHOSTOPS_GITHUB_SCOPE=security-report
export GHOSTOPS_GITHUB_PUBLISH_ENABLED=1
# Set GHOSTOPS_GITHUB_TOKEN using your private credential mechanism.
```

The API follows GitHub's [issue creation documentation](https://docs.github.com/en/rest/issues/issues#create-an-issue). The existence of a token/configuration is not proof of target access. Insufficient access fails safely without exposing provider errors.

## Operator workflow

```sh
export GHOSTOPS_URL=http://127.0.0.1:3214
npm run sentinel:run -- --preview --run RUN_UUID
# Only after reading the EXACT title, body, owner/repository and digest:
npm run sentinel:run -- --publish --run RUN_UUID
```

The second command makes a fresh preview and requires interactive `PUBLISH OWNER/REPO DIGEST`. No noninteractive publishing flag exists. The UI requires typed `APPROVE PUBLICATION` with the exact preview visible. Approvals expire after two minutes and bind run ID, final title/body SHA-256, configured target/token binding and signing key. Changing content/target/configuration invalidates old approval; changing the selected UI run/form also clears its preview, including a late in-flight response.

Management requires the existing actual loopback/Host attestation, HttpOnly local admin cookie and CSRF. It atomically claims a draft, issues a single private approval reference and submits the operation using OperationsAgent's authenticated MCP identity. The gateway checks current identity/session, permissions, quarantine, run scope and publication grant. Authority and target binding are checked again immediately before POST. The model can propose a publication but cannot mint approval.

The result is verified only after exact issue ID/title/body/expected URL read-back succeeds. Stored evidence includes target/operation, digest, approval reference, response status, external ID/URL/time, agent/session/request, and read-back outcome. Caller metadata cannot create a genuine publication receipt; mocked responses say `mock-github` and do not pass readiness.

Replay never redispatches a prior tool request. Local dispatch markers precede external writes. A deterministic marker searches the last 100 issues to avoid obvious duplicate reports; this is **not a universal exactly-once guarantee**. A timeout/disconnect/restart after dispatch yields `uncertain`; inspect the external target rather than blindly retrying. Accepted external writes cannot be undone by cancellation. No deletion/rollback is implemented.

Reports describe provider-reported declared-version matches and independent scanner patterns, cite captured sources/file hashes/HEAD, and explicitly disclaim proven exploitability. Untrusted advisory narrative is omitted from publication where metadata suffices. This is an approved research/test report, not an unsupported vulnerability disclosure.
