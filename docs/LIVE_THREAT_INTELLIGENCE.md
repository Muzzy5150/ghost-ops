# Live public intelligence

Implemented fixed destinations:

| Source | Interface | Interpretation |
| --- | --- | --- |
| OSV | POST `https://api.osv.dev/v1/query`; validated identifier GET `/v1/vulns/ID` | Provider-reported declared npm version match; not installed exposure/exploitability |
| CISA KEV | `https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json` | Catalog inclusion only; local repository relevance unestablished |
| GitHub Advisories | GET `https://api.github.com/advisories?ecosystem=npm&affects=PACKAGE@VERSION&per_page=5` | Public declared-version advisory evidence; no GitHub credentials needed |

The current interfaces were checked against [OSV documentation](https://google.github.io/osv.dev/api/), [CISA's catalog](https://www.cisa.gov/known-exploited-vulnerabilities-catalog), and [GitHub's advisory REST documentation](https://docs.github.com/en/rest/security-advisories/global-advisories).

Only HTTPS `api.osv.dev`, `www.cisa.gov`, and `api.github.com` are allowed. Model output cannot supply a URL. Redirects are rejected, including same-host redirects; no custom ports, userinfo, fragments or internal destinations. Fetch timeout: ten seconds. Streaming/body limits: 512 KiB, or 6 MiB for the full KEV catalog. Structured results are further bounded to 5–10 entries. Per-run/provider frequency is at least ten seconds; monitoring minimum is fifteen minutes.

Receipts retain canonical URL, provider, HTTP result, UTC retrieval time, raw-body SHA-256, ETag when supplied, advisory IDs/aliases, available dates and captured fields. CISA `dateAdded` is KEV addition, **not the vulnerability publication date**. Default KEV selection sorts by addition date, not the source array's positional order. No version/date is fabricated.

Every source becomes an untrusted SourceDocument with its own content digest. Subsequent guarded operations and authenticated handoffs preserve source references. Descriptions are data, not policy. Publishing/export omit advisory narrative where metadata suffices. Public advisory and Semgrep findings remain separate; matching them does not prove causation or exploitability.

Actual October 9 retrievals succeeded from all three sources, including OSV `GHSA-29mw-wpgm-hmr9` / `CVE-2020-28500` and `GHSA-35jh-r3h4-6jhm` / `CVE-2021-23337`. Full returned aliases, timestamps and digests are in `../artifacts/phase12-sentinel/live-web-run/verification.json`. These are historical retrievals, not a claim the catalog is unchanged today. Offline `SYNTHETIC-NOT-A-CVE` receipts explicitly say `synthetic-fixture`; injected test HTTP says `mock-source`.
