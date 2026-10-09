# Additional sponsor boundaries

## Guild.ai

Official SDK/tools documentation describes @guildai/agents-sdk and a hosted sandbox whose network access goes through integrations, not arbitrary fetch/axios/node:http. A local loopback Ghost Ops listener is not reachable from that hosted sandbox by importing our package. A real hosted example requires an authorized account, supported platform MCP/integration registration and a deliberately secured reachable service—none was provided or deployed. Status RESEARCH ONLY, not an empty installed adapter. Ask engineers about authenticated private MCP access, credential/session binding, tool capability registration, execution/cancellation receipts and egress restrictions.

## ElevenLabs

Optional documented TTS convert adapter with explicit voice/model/key and per-action confirmation. Server generates a short deterministic count/evidence-based summary of a selected persisted incident, not raw logs/private prompts. Set GHOSTOPS_SPONSOR_EGRESS=1, GHOSTOPS_ELEVENLABS_ENABLED=1, ELEVENLABS_API_KEY, GHOSTOPS_ELEVENLABS_VOICE and GHOSTOPS_ELEVENLABS_MODEL. Manual narration is muted initially; use playback/stop controls. Response type/size validated; audio returned transiently, only hash/byte count persisted. Replaying a command never generates more paid speech. Mock HTTP verified; no provider voice generated. Provider credit/retention policy applies; no enterprise zero-retention claim.

## Akash

deploy/akash contains a synthetic readiness-only Node worker, Dockerfile and SDL 2.0 example. No gateway administration, database, signing key or model is included. No image build/push, manifest tooling validation, lease, deployment or charge occurred. Replace image placeholder only after approved publication; operator/provider must validate resource/pricing choices and fund the lease. Public endpoint exposes synthetic /health only; do not repurpose it to expose Ghost Ops administration. Status deployment-preparation, not live Akash integration.

## AWS

Local `otlp` action projects actual minimized persisted events to an OTLP JSON log envelope. It does not upload anything, use AWS credentials, call CloudWatch/AgentCore or prove AWS enforcement. AWS AgentCore observability is a prospective consumer via a separately configured least-privilege collector; no IAM/resources provisioned. No cost/data transfer from local projection. Actual AWS verification remains pending.

## Pi Security / Induction Labs

Official websites were inspected, but a usable public authenticated API/SDK was not established. Both RESEARCH ONLY. Pi refers to the product-security knowledge platform, not a coding agent. Ask Pi for supported findings/export schema, scoped auth, retention/deletion, evidence references, fix-status webhooks and sandbox account. Ask Induction about public research artifacts/model licensing/API, environments and safe evaluation access. No invented service endpoints, sponsor-tech usage or unrestricted autonomous exploitation. Existing offline scenario coverage is Ghost Ops functionality, not Induction technology.
