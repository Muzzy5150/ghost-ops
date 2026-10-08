# Phase 8 security model

## Authoritative boundary

An independently running client is untrusted. SDK validation is convenience, not authorization. Server-held credentials/session binding, current policy and containment are checked by the existing gateway before its bounded local handler runs. No SDK/proxy handler executes tools independently. The stdio process exposes only supported tool discovery/calls; it neither opens a listener nor connects to arbitrary upstream MCP servers.

Agent arguments cannot substitute identity, memory owner, policy, source trust or model provenance. Authenticated headers bind one issued token to its registered actor/session. Wrong credentials/session combinations produce unverified identity evidence and cannot train the victim's trusted baseline. A correctly bound revoked token can still be attributed historically, but has **no current execution or response authority**.

Automatic critical containment now checks active actor + active actor-bound session + matching nonrevoked credential in the same transaction. A reproduced pre-fix bug allowed historical critical evidence reached via a revoked old credential to re-quarantine a restored actor. The fix preserves denied old-token evidence and resolved case status, covers fresh and replay requests, and still contains a fresh critical session. Explicit operator containment remains authorized independently.

## Identity lifecycle

Operator enrollment grants explicit catalog capabilities only. Role is descriptive; actual tool/resource arrays govern execution. The SDK cannot self-register, modify grants or submit arbitrary telemetry. `Agent.integrationType` is trusted registration metadata, not proof of physical process origin. No online status is inferred from that metadata or a historical session.

Tokens are generated from 32 random bytes by the local operator CLI, stored in private exclusive/no-symlink files, sent only to the loopback server and hashed there using existing credential design. Management receipts contain no plaintext token. Rotation atomically retires all old credentials/sessions, checks latest owned memory signatures, issues new authority and audits the change. Contained identities require explicit restore. Old tokens cannot be reused. Pending private files preserve command/input idempotency after uncertain issuance; do not print or commit them.

Management uses existing loopback socket attestation, Host/proxy restrictions, local administrator cookie and CSRF. An agent bearer token does not authorize exports, enrollment, rotation or controls. **This local operator model trusts the OS user and is not independent human authentication against hostile local processes.** Production/public deployment requires a separate administrative authentication and isolation design. Remote endpoints/OAuth/multi-user tenancy are not implemented.

## Requests and evidence

Strict schemas, fixed names/resource aliases, 16 KiB input, 64 KiB SDK response caps, bounded timeouts and single-flight clients/proxies limit the surface. Redirects/remote origins/URL credentials/arbitrary paths/outbound destinations/unknown tools are rejected. Tool descriptions/outputs cannot expand grants. Owned memory aliases derive ownership server-side. Protected policy cannot be rewritten with ordinary agent credentials; notes remain signed with actual source provenance.

Request UUIDs bind exact input globally. Altered reuse conflicts; exact replay does not execute again and rechecks current authority before returning a minimized receipt. SDK does not retry mutations automatically. Abort/disconnect/timeout can happen after a server effect commits; they are not rollback guarantees. The client retains request UUID on uncertainty and reports safe failure without unguarded fallback.

Structured metadata/IDs/counts are the default telemetry; SDK logs never receive credentials, private prompts or raw tool output. Client applications must still avoid logging their own token configuration or secret-bearing permitted outputs. The demo prints minimized decisions rather than document contents. Events are actual gateway records marked local runtime, distinct from simulation. External scripted decisions are not inference; even optional external SDK receipts cannot assert server-verified provider status.

Forensic export reuses existing admin scope, minimized serialization, SHA-256 and local HMAC. Hashes alone do not prove origin. Neither local HMAC nor memory signing survives signing-key/host compromise; no external attestation claim is made. Export/verification tests use disposable keys, not presenter keys.

## Limitations

Only calls deliberately routed through protected integrations are enforced. Ghost Ops cannot intercept arbitrary files, OS tools, browser actions, network requests or separate unguarded agent connections. The adapter is a tools-only local bridge, not a universal MCP firewall. No Codex/Cursor/LangChain runtime adapters are claimed. Last observations and authorized sessions are not proof of a continuously connected process. Catalog/capacity limits are MVP bounds, not an unbounded production service. Live provider execution remains unverified and unpaid. Visual QA remains pending without permission workarounds.

Existing database/signing key were not reset/migrated in place during verification. An isolated consistent clone preserves all 17 original table payloads under the additive integration column migration. Activate a new build only after normal presenter shutdown and a consistent database + matching key backup.
