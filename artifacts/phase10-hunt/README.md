# Actual Phase 10 evidence review

These are minimized exports from actual isolated HTTP/MCP runs, not screenshots, fabricated records or provider inference. No credentials, signing keys or private issuance files are included.

| Directory | Verified code | Meaning |
| --- | --- | --- |
| This directory | `dba8943` | Initial 299-test implementation proof; 60 requests in 981 ms. |
| `final/` | `75998a6` | 303-test epoch/identity hardening proof; 60 requests in 971 ms. |
| **`verified/`** | **`ffc4cf2`** | Final 309-test code proof; 60 requests in 948 ms. Use this package for current review. |

Each contains `verification.json`, `performance.json`, `hunt-original.zip` and **intentionally altered** `hunt-tampered.zip`. The original authenticated with the matching private isolated key; altered contents were rejected. Automatic quarantine survived a normal server restart; approved restoration resumed real permitted MCP access. All decisions were scripted; all guarded handlers and denials were real. Source/submission evidence does not prove hidden influence or malicious intent.

The ephemeral signing keys were never exported and were removed with their test fixtures. From a built Phase 10 checkout, independently check content integrity:

```sh
npm run evidence:verify -- /absolute/path/to/artifacts/phase10-hunt/verified/hunt-original.zip --hash-only
# Expected nonzero exit; intentionally modified evidence:
npm run evidence:verify -- /absolute/path/to/artifacts/phase10-hunt/verified/hunt-tampered.zip --hash-only
```

Hash-only verification does not establish origin. To demonstrate authenticated verification, run a fresh isolated `hunt:demo` and verify its original with that instance's matching private key as documented in `docs/MULTI_AGENT_THREAT_DEMO.md`. Never use the retained presenter's unrelated key for these samples.
