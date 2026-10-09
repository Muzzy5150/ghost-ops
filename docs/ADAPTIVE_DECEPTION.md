# Adaptive synthetic deception

The approved catalog contains an inert credential document, mock restricted administrator resource and synthetic memory trap. None contain usable credentials, execute shell commands, or contact a network destination.

The authenticated operator deploys a **scoped catalog overlay** using a verified request event. Adaptive selection is deterministic: memory request → memory template; credential request → credential template; other eligible capability request → administrator template. Explicit selection is also supported. Actor/session/request binding is revalidated. Deployment retains the selected trap ID, triggering event, reason, operator marker and timestamps.

This MVP reuses registered shared synthetic resources. It does **not** inject new instructions, dynamically expand permissions or hide real production resources. Exposing a catalog entry means marking the inert decoy active; unsupported operations remain denied by gateway policy before a handler. The same registered decoy may predate the overlay. UI and export describe overlays honestly rather than claiming a novel external honeypot infrastructure deployment.

At most three overlays per scope can be active. Cleanup retires only that scope's overlay and records `cleanedAt`; it never disables shared traps used by other demonstrations. Automatic deployment is not enabled; selection requires an operator command. Automatic containment may use a registered decoy observation only under explicitly enabled response rules.

GhostTrap records actual request, actor binding, policy outcome, trap interaction/event identifiers and investigation links. An invalid actor's claim is recorded in ShadowWatch, not attached to a legitimate verified Hunt history. Interest in a decoy is **not** proof of malicious intent.
