# Trust boundaries and security model

## Local transport and administration

`scripts/server.ts` listens only on `127.0.0.1`. Before handing a request to Next.js, it checks the actual socket peer is loopback and rejects inbound `Forwarded`, `X-Forwarded-*` transport headers and a client-supplied internal attestation header. It overwrites the internal attestation with a server-derived HMAC. API routes require that attestation; direct `next start` cannot bootstrap an administrative session.

Host validation rejects DNS rebinding to arbitrary hosts. Browser origins must exactly match the HTTP loopback Host. Cross-site and same-site fetch metadata is rejected; state-changing management requires an explicit matching Origin. Bootstrap issues an HttpOnly, SameSite Strict eight-hour cookie; writes also require an independent CSRF token. These derive from the private local key. Cookie exposure is local HTTP only, so Secure is false; do not serve this design on a public network.

Any trusted local OS user can bootstrap administration. This is deliberately **not** an independent administrator identity layer. Do not weaken the bind or add a reverse proxy and assume Host validation authenticates a remote user. Production exposure requires a separately implemented administrative identity/authorization layer, TLS, correct proxy/socket attestation, role separation, and rate limiting.

## Agents and untrusted inputs

Agent credentials are high-entropy HMAC-derived synthetic tokens. Only HMAC digests are persisted; raw tokens and digests never appear in dashboard responses. The session must exist, be active, belong to the actor, and be bound to the presented credential. Quarantine checks the registered agent state, revokes all credentials, and disables all sessions before the next request can execute. Authorized restoration rotates credentials and validates the latest memory before resuming.

Ingestion requires a strict Zod action schema and a Bearer credential. A claimed actor identity is evidence, not proof of authentication. Valid credentials cannot bypass permission or resource checks. Tools, operations, resource names, and optional destinations must match explicit allowlists. Resource paths are catalogue IDs, never actual filesystem paths. No arbitrary command, code evaluation, real HTTP executor, or MCP tool runtime is present.

Source-document trust is looked up from a server-owned record; agents cannot set it to trusted. Ingested instructions are stored and returned as data, never interpreted or executed. Simulator code explicitly submits attempted hostile actions through the gateway to test defenses. It does not assert real LLM compromise.

## Memory integrity

SHA-256 detects content changes; an HMAC signs ID, owner, key, version, content, hash, parent, source identity, source trust, session, authorization, protected state, restoration origin, and timestamp. Integrity status is recomputed in dashboard reads. Agent memory reads fail closed on invalid signatures. Protected updates are blocked independently of instructions in an ingested document.

Restoration verifies the selected snapshot using the server-held key and appends a new signed version pointing to its parent and restoration source. Historical tampering remains visible. The server-held key is private, mode `0600`, outside SQLite. The key must be backed up with the database. Theft of this key defeats signatures and the derived local authentication tokens. The local OS/database administrator is trusted; there is no external anchoring of the version chain or immutable remote audit storage.

## Evidence and deterministic response

Events, findings, decisions, incidents, evidence references, interactions, runs, and containment are persisted transactionally. Rules are transparent; severity is categorical, never a scientifically validated probability. Critical correlation requires same-actor/same-session behavioral findings, memory findings, and trap interest. A rogue actor is recorded as unknown, not inserted as an authorized registry identity. An authenticated identity with linked compromise signals remains registered and receives suspected-compromise trust.

Trap contact can be recorded even for a denied request; this does not return a decoy secret or execute its operation. All five decoys contain only inert synthetic data. Trap interest alone does not prove malicious intent.

One local process serializes mutation transactions. Request IDs include an action/credential fingerprint; command IDs include the strict management payload fingerprint. Exact retries return prior receipts, while changed reuse fails. Containment checks current actor state and credential generation so repeated responses do not duplicate actions and a later post-restoration containment gets a fresh audit record. Reset preserves command receipts so replaying an old reset cannot erase newer data.

## Limits

JSON body: 16 KiB, enforced while streaming (including absent Content-Length). Content: 4,000 characters; IDs: 100 characters; resource/destination: 160 characters. HTTP request timeout: 15s; header timeout: 10s; maximum header count: 40. The local demo permits 2,000 tool requests and 10,000 command receipts. Administrative restoration is bounded to 1,000 memory versions. Capacity violations return `429`. Input is never echoed into generic error logs.

Dashboard reads bound recent collections but query complete totals separately. Incident timelines are bounded indirectly by total request capacity. This is not distributed, multi-tenant, externally rate-limited, tamper-proof logging infrastructure. A trusted administrator can reset synthetic records or modify/erase unsigned evidence in SQLite. Agent enrollment for a production runtime is not implemented.

## Dependencies

Prisma 7.10 is stable; Prisma 8 release candidates are deliberately excluded. The lockfile pins all resolved packages. `deepmerge-ts` and `mysql2` overrides remediate transitive advisories in Prisma's CLI dependency graph; migrations, tests, and build confirm current compatibility. Production audit reports zero vulnerabilities. Full audit retains an unpatched `braces` stack-exhaustion advisory in development lint dependencies; lint inputs are developer-controlled. Recheck audits when package updates become available.
