import type { AgentAction } from "./schemas";

/** Future integration contracts; no production executor or framework adapter ships in MVP. */
export interface AgentRuntimeAdapter {
  readonly runtime: "mcp" | "codex" | "cursor" | "openai" | "other";
  normalizeObservation(observation: unknown): AgentAction;
}
export interface PolicyGatewayClient {
  submit(action: AgentAction, credential: string): Promise<{ allowed: boolean; reason: string; requestId: string }>;
}
export interface TraceExporter {
  exportEvidence(evidence: { eventId: string; sessionId: string; requestId?: string; timestamp: string; attributes: Record<string, string | boolean | number> }): Promise<void>;
}
export interface MemoryStoreAdapter {
  readVersion(ownerId: string, key: string, version: number): Promise<{ content: string; contentHash: string; provenance: Record<string, string> }>;
  // Future implementations must verify signatures and independent admin authority before commit.
  appendVerifiedVersion(input: { ownerId: string; key: string; content: string; parentId: string; authorizationReceipt: string }): Promise<string>;
}
