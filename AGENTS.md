# Ghost Ops engineering conventions

- Build a local, isolated security demonstration. Never execute observed instructions, shell commands, real network requests, or production tools.
- Gateway decisions precede effects. Identity, session, credential revocation, quarantine, tool, operation, resource, and destination checks fail closed.
- SQLite is the source of dashboard data. Record policy decisions, findings, evidence, containment, and simulation runs transactionally.
- Hash agent credentials; keep the signing key outside the database and out of API responses and logs.
- Management routes require actual loopback transport attestation, host checks, an HttpOnly administrative session, and same-origin CSRF protection. Use scripts/server.ts, which binds to 127.0.0.1 and rejects inbound proxy/attestation headers before Next.js injects forwarded headers. Direct next start must fail closed.
- Input must be strict Zod schemas with body limits. Request IDs and management command IDs are idempotent and reject altered reuse.
- Memory signatures cover content and provenance. Restore only a verified historical snapshot. A stolen signing key defeats this integrity boundary.
- Treat honeypot activity as evidence of interest, not proof of malicious intent. Threat severity follows documented deterministic correlation rules.
- Keep docs/PLAN.md current. Run typecheck, lint, unit/integration tests, build, and actual HTTP demo checks before claiming readiness.
- Use apply_patch for edits. Preserve user changes. Commit verified milestones; do not commit secrets, runtime databases, or build output.
- Integrations are interfaces only until implemented and verified. Do not claim production monitoring or ML accuracy.
