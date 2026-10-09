# AgentDNA V2: explainable local behavior

The legacy engine remains intact. V2 adds **operator-frozen versioned baselines**, not automatic machine-learning training. Each version references real request IDs, tool/resource counts, same-session tool transitions and learning/evaluation windows.

Learning requires at least four non-simulated, identity-verified permitted operations from sessions with no low-or-higher finding and no untrusted source context. It uses Gateway event ordinals, not ambiguous timestamp ordering. Invalid identities, denied operations and already suspicious sessions cannot enter trusted learning. The legacy baseline also no longer trains requests that produced behavioral signals. Excluding an entire flagged session is deliberately conservative: a benign novel operation can make that session ineligible for a new trusted baseline.

Learning window: 4–200 observations, default 100. Evaluation window: 2–20 prior same-session gateway observations, default 10. Clean observations can span sessions; transitions never bridge session boundaries. Later sessions are compared to the stored version; there is no silent retraining.

## Deterministic rules

| Rule | Explanation |
| --- | --- |
| UNSEEN_TOOL_V2 | Tool/operation absent from the frozen baseline |
| UNSEEN_RESOURCE_V2 | Requested resource absent from the frozen baseline |
| SEQUENCE_DRIFT_V2 | Previous → current same-session transition absent from baseline |
| POST_SOURCE_POLICY_VIOLATION_V2 | Recorded untrusted source precedes an actual policy denial |
| PRIVILEGED_DENIAL_BURST_V2 | At least three denied admin/credential/deployment/protected-memory requests in the bounded current-session window |

Permitted novelty produces a low-severity observation; denied deviations are medium. Findings reference the baseline version, source, authorization outcome, previous request and (for bursts) window evidence. These are transparent rules, **not calibrated probabilities or proof of compromise**. V2 findings alone cannot authorize a Ghost Response plan. Destination restrictions remain independently enforced by the existing gateway; the synthetic runtime permits no outbound destinations.

Inspect actual distributions/history in existing AgentDNA, and V2 findings/source chains in Ghost Hunt. There is no claim of production false-positive accuracy or generalized learned agent intent.
