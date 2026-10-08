# Forensic packages and trust model

Exports are generated from persisted evidence, not explanations invented by a model. Terminal experiments (including failed/cancelled/interrupted runs) and existing investigations can be exported; an open investigation is explicitly a current evidence snapshot, not a completed verdict.

## Package schema

Every download is a bounded, standard **stored ZIP** with exactly:

```text
manifest.json
experiment.json
events.jsonl
policy-decisions.json
memory-evidence.json
incidents.json
summary.html
```

Manifest format 1 records package UUID, scope, creation timestamp, experiment/incident identifiers, six content filenames/byte lengths/SHA-256 hashes, limitations and an HMAC-SHA-256 authentication tag. The manifest authenticates its canonical unsigned representation under the domain `ghostops-evidence:v1:` using the server-held integrity key. The manifest cannot hash itself; its tag authenticates the file-hash list and scope. Event IDs and transaction ordinals preserve actual sequence even when timestamps coincide.

Run scope uses that run's recorded request references and relevant events; an associated investigation projection includes only included scoped evidence. Incident scope uses that case's persisted events/requests/actions. No absent event is fabricated. Requests retain actual allowed/denied reason, verified-versus-claimed attribution, phase and minimized execution metadata. Invocation records link real observed gateway request IDs. Memory evidence retains version/owner/source references and **integrity checked at export time**, not a retroactive claim about every historical moment. Protected contents and signatures are omitted.

`summary.html` is deterministic, escaped, script-free and CSP-restricted. It includes identity, chronological evidence anchors, each engine's findings, correlation reasons/explanation, recorded policy/containment actions, verified memory evidence, outcome and limitations. Interpretations remain distinct from facts; decoy interest or a behavioral anomaly alone does not prove malicious intent.

## Redaction and authorization

Administrative loopback authentication is mandatory for `/api/evidence/run/UUID` and `/api/evidence/incident/UUID`; agent credentials do not grant report access. The local operator is authorized across agents; no multi-tenant sharing model is provided. Strict kind/UUID validation accepts no caller filesystem path or archive filenames.

Projection and redaction happen **before serialization and hashing**. Credential hashes, raw secrets, private credential-binding digests, signing tags from memory records, worker/lease fields, prompts, document contents, raw tool outputs and chain of thought are not included. Untrusted event metadata is allowlisted. Bounded string redaction covers common token/Bearer/password/key patterns; it is not an assurance that arbitrary free text can never contain sensitive information. Use only synthetic local data.

Exports fail closed beyond 2 MiB archive content, 1 MiB per file, 4,000 events or 1,000 memory versions. ZIP validation rejects duplicate/unexpected/path-traversal names, mismatched headers, CRC/size inconsistencies, compression/encryption, ZIP64, extras/comments and trailing bytes. No filesystem extraction occurs. The verifier supports Ghost Ops' fixed stored profile, not arbitrary third-party ZIPs. Actual output is additionally tested with standard `unzip -t`.

## Commands

With the application running, download using Security Lab or the investigation report control, or:

```sh
GHOSTOPS_URL=http://127.0.0.1:3210 npm run evidence:export -- --run EXPERIMENT_UUID --output /absolute/new-report.zip
GHOSTOPS_URL=http://127.0.0.1:3210 npm run evidence:export -- --incident INCIDENT_UUID --output /absolute/new-case.zip
npm run evidence:verify -- /absolute/new-report.zip
```

Exports use exclusive creation and do not overwrite existing files. CLI verification returns success only after validating archive, manifest, file hashes/lengths, scope and ordered evidence. If a matching existing `GHOSTOPS_SIGNING_SECRET` or project `.ghostops/integrity.key` is available, it also verifies the tag. It never creates a verification key and never prints key values. A wrong available key fails. Without a key, output explicitly reports no authentication; force a portable hash-only check with:

```sh
npm run evidence:verify -- /absolute/new-report.zip --hash-only
```

Hash validity alone **does not establish origin**. Local HMAC proves consistency with possession of the local key, not an uncompromised host, independent timestamp or externally attested account of reality. Host/key compromise can forge records and tags. Protect and back up the original signing key with the database; do not distribute it with exported reports.

## Tampering demonstration

```sh
GHOSTOPS_URL=http://127.0.0.1:3210 npm run lab:evaluate -- --mode local --show-tamper
```

This runs eight new isolated synthetic evaluations, exports/validates each, then alters a **separate copy** of the containment report and regenerates a valid ZIP CRC. Its unchanged SHA-256 manifest fails verification. The original archive, database and policy remain unchanged. Individual unit tests also cover missing evidence, forged authentication, inconsistent scope, invalid paths and unsafe containers.

Review samples in `artifacts/phase7-evidence/` were generated by a disposable production integration test; their temporary signing key is deliberately not exported. Use `--hash-only` to review the valid sample and observe the altered copy fail. They are synthetic local evidence, not real-model receipts or evidence from the user's presenter database.
