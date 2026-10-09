# Cross-agent memory forensics

Agent-authored messages are always untrusted data, even if the sender is authenticated. `send_message` requires explicit delegation write/resource permissions, a same-scope active receiver and an allowed same-session document/delegation reference. `read_inbox` requires explicit read permission, receiver ownership and matching content hash. No caller can select arbitrary provenance or a different memory owner.

The bounded handler stores sender/session/receiver, immutable reference/root request IDs, source ID/trust and content hash. Reading a message marks the receiving session's subsequent operations untrusted and updates that read's source metadata. Forwarding an inbox read carries its immutable original root; it never relies on the mutable convenience `receivedRequestId`. Messages are not automatically interpreted or executed. Their private text is omitted from dashboard metadata and evidence exports.

Hunt links source context, submitted/received observations, actual memory requests, policy decisions and owner snapshots. The source being present before a deviation is **not proof it caused that deviation**. The synthetic demonstration uses scripted adversarial probes, not alleged model failures.

Protected runtime policy updates still require independent administrative authorization and cannot execute through an ordinary agent write. Permitted notes use existing signed append/version history. Memory signatures cover content and provenance. Owner snapshots are labeled **at-analysis**, and ZIP signatures **at-export**, not retroactively asserted request-time integrity. Proposed protected content is represented by a hash where recorded, never a claim that poisoning succeeded. Restoration remains the existing authorized verified historical-snapshot procedure, accessible through MemoryGuard; unusual text alone does not trigger restoration.

Message hashes detect changed text relative to the database record, not malicious host/database rewriting of both text and hash. This is distinct from keyed memory signatures. Compromise of the host/signing key defeats the local integrity boundary. No production memory stores are integrated.
