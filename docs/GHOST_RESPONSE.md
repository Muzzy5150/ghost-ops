# Ghost Response

Ghost Response is deterministic local orchestration. No model or untrusted text can grant administrative authority.

## Modes and actions

- **OBSERVE** (default): persist a recommended plan without changing security state. Approve is rejected.
- **APPROVAL_REQUIRED**: authenticated local operator explicitly approves a quarantine or credential-revocation plan.
- **AUTOMATIC**: operator explicitly enables a synthetic scope; only bounded quarantine executes automatically. Revocation is not automatic.

The workbench can record/review findings, adjust scope observation/configuration, freeze baselines, update a case, select an approved decoy, request response review, quarantine/revoke, inspect actual enforcement receipts, export a forensic report and navigate to the existing signed memory-restoration controls. These are not arbitrary user-defined executable playbooks. This MVP does **not** automatically restore memory, run shell probes, or allow a model to choose privileged actions. Legacy deterministic containment remains independent and can still enforce its existing critical correlation policy.

## Qualifying evidence

A plan requires a currently active non-simulated identity, active credential-bound session, actual verified policy denial after the scope's activation ordinal, and registered active decoy interaction linked to those denied requests in that same session. An anomaly alone cannot qualify. The identity must be explicitly in the selected scope. Scope grouping itself is not causal evidence. A persisted ordinal barrier, not same-millisecond timestamp guessing, prevents newly created scopes from adopting older denials as response authorization.

Preview records action, affected identity/session, credential epoch (server-side), scope revision/mode, evidence IDs, authorization requirement, expected future gateway denial, reversibility and verification procedure. Ten-minute expiry and per-scope hourly execution limit apply (1–8, default four). Approval revalidates current identity, credential, mode/revision, expiry and triggering evidence. Changed/restored/reconfigured plans become stale rather than executing. Plan/command identifiers prevent duplicate effects.

Execution reuses `contain` and records a receipt with `enforcementVerified: false`. Only a **real subsequent guarded request**, matching the plan's credential epoch and current quarantine/revocation state, with the expected denial and null handler receipt can mark it verified. Generating a plan or changing a badge is not enforcement proof. If the client sends no follow-up, the status remains executed/unverified.

Authorized restoration uses existing memory verification and credential rotation. Old sessions remain revoked; historical denials cannot re-quarantine a restored current epoch or falsely verify its old plan. Fresh qualifying activity from the new epoch can produce a new plan. Rate limits count persisted executed plans across restarts.

Delivery timeout is uncertain, not a promise of rollback. The Hunt UI locks subsequent commands and offers exact-ID retry or explicit history inspection. Never retry with a fresh ID to guess whether containment happened.
