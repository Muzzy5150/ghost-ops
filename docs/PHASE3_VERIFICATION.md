# Phase 3 verification

Environment: local macOS, Node 24.10.0 / npm 11.19.0. Existing history preserved; additive runtime migration adds execution metadata and incident provenance.

## Results

- Baseline independently rerun: all 52 Phase 2 tests passed before implementation.
- Current suite: 73 passing tests (18 original security, 25 adversarial, 7 integration, 3 rendering, 20 runtime).
- TypeScript checking and ESLint pass with no warnings/errors.
- Optimized production build passes; six API endpoints, including MCP and runtime enrollment.
- Production runtime verifier passes original A/B/C/D HTTP scenarios and security negatives before enrollment, then actual MCP/CLI runtime execution, restart persistence, memory restoration, reset preservation and the exact presenter script.
- Original disposable production restart verifier passes containment, rotated credentials, replay denial and ten-step story resume/restoration.
- Production dependency audit: zero advisories. Full audit retains the same five high entries in one unpatched development-only braces chain; no forced downgrade.
- Build file traces inspected: no private runtime workspace, key, client credential, database or environment asset references in MCP/enrollment traces. Dynamic writable workspace tracing warning fixed.

Runtime tests verify authenticated real reads/writes, handler spies for denied unknown/revoked/quarantined calls, impersonation isolation, credential/session binding, minimized receipts, duplicate/replay checks under withdrawn authority, separate simulated/live origins, owner-bound signed notes, protected-memory denial, untrusted source provenance, legitimate post-denial work, multi-signal correlation, explicit tamper/verified restoration, normal false positives, reset preservation, strict/oversized inputs, unauthorized enrollment, path/network restrictions, MCP protocol execution, operational handler failure, tampered note append denial, enrollment idempotency, discovery auth, hostile Origin and forged event-method rejection.

The production verifier launches separate real agent CLI processes, reads the resulting artifact and compares its actual bytes to the returned extractive summary. Denied writes leave directory contents unchanged and execution metadata absent. An existing MCP client makes another request after a new server process starts and still receives AGENT_QUARANTINED. Historical replay also remains denied. After administrator restoration the original client returns CREDENTIAL_REVOKED. No raw runtime credential appears in the snapshot.

Clean checkout of implementation commit `758729a`, exported with git archive into an isolated temporary directory, passed `npm ci`, fresh setup/migration/seed, typecheck, lint, all 73 tests, production build, complete runtime HTTP verifier, original production restart verifier and zero-advisory production audit. That checkout's shell used Node 26.4.0 / npm 11.17.0; the primary workspace used Node 24.10.0 / npm 11.19.0. Native SQLite and official MCP packages worked in both executed environments. Node 22 minimum is not an independently executed test matrix. Installation emitted existing development deprecation/allow-scripts notices and the same five development advisory entries; no forced remediation or unverified major upgrade was applied.

## Genuine execution versus simulation

**Verified:** running local MCP client, official maintained protocol, actual bounded fixture/file/SQLite handlers, authenticated session attribution, all four security engines, actual enforcement, persisted evidence, containment across restart, signed memory integrity and restoration.

**Scripted:** offline task selection, malicious-call regression probes, synthetic agents/resources/documents/status/decoys, explicit administrator fault injection. Those calls exercise real handlers/gateway logic; their decision-making is not presented as AI inference.

**Implemented but not remotely verified:** opt-in official OpenAI Agents SDK model loop, provider compatibility, model refusal/injection behavior and inference response reporting. **Actual model calls executed: zero.** No account, external infrastructure, personal data, production system or existing Codex session was connected.

**Visual checks:** static rendering covers all eight views and additional live-session/memory provenance. Retried the authorized site after upgrading: the in-app browser was unavailable, and selecting the existing Chrome Ghost Ops tab was explicitly rejected by its saved site permission. No workaround attempted. Desktop/mobile browser inspection remains unverified; HTTP/rendering tests are not visual validation. See VERIFICATION.md's manual checklist.

## Existing workspace application

Created a private consistent database/key backup at `.ghostops/phase3-backup` before the additive migration. Counts were independently compared afterward: all original 3 agents, 31 requests, 85 events, 3 incidents and 6 memory versions were preserved. Restarted the supported production server on 3210, provisioned `live-phase3`, and executed the exact live demo CLI against the real presenter database without resetting old records. The local runtime completed its real-tool stages, protected write/trap denials, quarantine proof and verified restoration. It remains contained with altered history retained. Private credentials, key, backup and summary artifacts are gitignored, not delivered in commits.

Actual new presenter runtime totals: 10 MCP requests, 4 denied, one critical contained `live-phase3` investigation plus a separate unknown-actor investigation. Runtime policy v1 remains verified, controlled altered v2 is tampered, restored v3 is verified. Those are appended to, not replacements for, the Phase 2 presenter records. The production app remains running on http://127.0.0.1:3210.

## Limitations

Loopback trusted-OS administration, single-process serialization, no OS sandbox/independent admin login, unsigned mutable event storage, signing-root compromise, session-local rule correlation and unvalidated statistical thresholds remain. Same-identity runtime credential redelivery/rotation, arbitrary MCP resource methods/servers, native Codex/Cursor interception, cloud integrations and production concurrency are future work. Filesystem/DB crash recovery is bounded to exact summary artifacts, not a general atomic effects guarantee.
