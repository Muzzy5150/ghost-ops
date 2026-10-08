import { createHash, randomUUID } from "node:crypto";
import type { MemoryVersion, Prisma } from "@/generated/prisma/client";
import { mac, secureEqual } from "./config";

export const hash = (content: string) => createHash("sha256").update(content).digest("hex");
type Tx = Prisma.TransactionClient;
type SignedMemory = Omit<MemoryVersion, "signature" | "integrity">;
export function memoryPayload(m: SignedMemory) {
  return JSON.stringify([m.id, m.ownerId, m.key, m.version, m.contentHash, m.content, m.parentId, m.sourceId, m.sourceTrust, m.sessionId, m.authorization, m.protected, m.restoredFromId, m.createdAt.toISOString()]);
}
export function verifySignature(m: MemoryVersion) {
  return hash(m.content) === m.contentHash && secureEqual(m.signature, mac(`memory:${memoryPayload(m)}`));
}
export async function appendMemory(tx: Tx, input: { ownerId: string; key: string; content: string; sourceId: string; sourceTrust: string; sessionId?: string; restoredFromId?: string }) {
  if (await tx.memoryVersion.count() >= 1000) throw new Error("Memory history capacity reached; reset the synthetic environment");
  const parent = await tx.memoryVersion.findFirst({ where: { ownerId: input.ownerId, key: input.key }, orderBy: { version: "desc" } });
  const data: SignedMemory = {
    id: randomUUID(), ownerId: input.ownerId, key: input.key, version: (parent?.version ?? 0) + 1,
    content: input.content, contentHash: hash(input.content), parentId: parent?.id ?? null,
    sourceId: input.sourceId, sourceTrust: input.sourceTrust, sessionId: input.sessionId ?? null,
    authorization: "local-administrator", protected: true, restoredFromId: input.restoredFromId ?? null, createdAt: new Date()
  };
  return tx.memoryVersion.create({ data: { ...data, signature: mac(`memory:${memoryPayload(data)}`), integrity: "verified" } });
}
export async function restoreSnapshot(tx: Tx, id: string) {
  const snapshot = await tx.memoryVersion.findUniqueOrThrow({ where: { id } });
  if (!verifySignature(snapshot)) throw new Error("Cannot restore an unverified snapshot");
  return appendMemory(tx, { ownerId: snapshot.ownerId, key: snapshot.key, content: snapshot.content, sourceId: "verified-snapshot", sourceTrust: "trusted", restoredFromId: snapshot.id });
}
