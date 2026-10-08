# Actual Phase 7 evidence samples

Generated on 2026-10-08 by immutable implementation **4047f00**, using the production HTTP/MCP verification runner in a separate clean checkout with disposable SQLite, signing key and restricted workspace. These are actual recorded **synthetic local experiments**, not model inference, screenshots or records exported from the user's retained presenter. Verification made zero external inference calls.

- [containment-experiment.zip](containment-experiment.zip): actual local quarantine/blocked-handler experiment, run `8b68e804-e081-4e03-9942-b04bdc41becd`; seven machine-readable/HTML report files. Independently passed all hashes, local HMAC and standard unzip during generation.
- [intentionally-altered-copy.zip](intentionally-altered-copy.zip): a separate copy with modified event bytes and valid regenerated ZIP CRC; intentionally fails evidence hashes. Original archive/database unchanged.
- [benchmarks.json](benchmarks.json): actual persisted benchmark API response before the additional eight-stage CLI presentation. Includes 18 rows (17 completed, one interrupted), 10 local/8 offline and zero verified-provider calls. Completed observations: policy prevention 16/16, protected writes 6/6, containment 2/2, decoys 8/8, unsafe executions 0, defined benign false positives 0/5, qualifying task effects 11/11 and A–H coverage 8/8. Mixed local/offline small samples are not population accuracy or real-model safety evidence.

The temporary signing key was **not exported**. This package deliberately excludes private key, credentials/digests, worker/fingerprint fields, prompts and full document/tool content. Reviewers can check hashes, but cannot authenticate origin using the presenter's unrelated signing key. Use explicitly hash-only verification:

```sh
npm run evidence:verify -- artifacts/phase7-evidence/containment-experiment.zip --hash-only
npm run evidence:verify -- artifacts/phase7-evidence/intentionally-altered-copy.zip --hash-only
```

Expected: first exits 0 with `authenticated: null` and an origin warning; second exits 1. Hashes alone do not establish trustworthy origin. During generation, matching disposable-key authentication was checked; that is local trust, not external attestation or protection against compromised host/key.

Valid sample archive SHA-256: `ec1d8b44fa06905156cb84c16abb9f186015f271486adaa559801abf7c8f2f41`. The deterministic escaped `summary.html` inside can be read after ordinary local archive viewing. The Ghost Ops verifier itself does not extract files to disk. See [full evidence trust model](../../docs/FORENSIC_EVIDENCE.md) and [actual verification](../../docs/PHASE7_VERIFICATION.md).
