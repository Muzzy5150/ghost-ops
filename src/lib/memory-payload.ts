import type { MemoryVersion } from "@/generated/prisma/client";
/** Pure, unchanged serialization shared by the signer and read-only backup checks. */
export function memoryPayload(m: Omit<MemoryVersion, "signature" | "integrity">) {
  return JSON.stringify([m.id, m.ownerId, m.key, m.version, m.contentHash, m.content, m.parentId, m.sourceId, m.sourceTrust, m.sessionId, m.authorization, m.protected, m.restoredFromId, m.createdAt.toISOString()]);
}
