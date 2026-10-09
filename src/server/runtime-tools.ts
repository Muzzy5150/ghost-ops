import { constants } from "node:fs";
import { mkdir, open, readFile, lstat } from "node:fs/promises";
import { resolve, join } from "node:path";
import type { RuntimeExecutor } from "./gateway";
import { appendMemory, hash, verifySignature } from "./memory";
import { randomUUID } from "node:crypto";
import type { Prisma } from "@/generated/prisma/client";
import { scopedAgents } from "./hunt";
import { recordEvent } from "./investigation";

/** No caller-supplied path, URL, command, executable or memory owner reaches a handler. */
export const executeLocalTool: RuntimeExecutor = async (tx, action) => {
  if (action.resource === "agents/outbox") {
    const scope = await scopedAgents(tx, action.actorId, action.targetId!); if (!scope) throw new Error("No approved synthetic organization");
    if (await tx.agentMessage.count({ where: { scopeId: scope.id } }) >= 200) throw new Error("Message capacity");
    const reference = await tx.toolRequest.findUniqueOrThrow({ where: { id: action.referenceRequestId! } });
    const parentId = (reference.execution as Prisma.JsonObject | null)?.messageId;
    const parent = typeof parentId === "string" ? await tx.agentMessage.findUnique({ where: { id: parentId } }) : null;
    const message = await tx.agentMessage.create({ data: { id: randomUUID(), requestId: action.requestId, senderId: action.actorId, senderSessionId: action.sessionId, receiverId: action.targetId!, scopeId: scope.id, referenceRequestId: reference.id, rootRequestId: parent?.rootRequestId ?? reference.id, sourceId: parent?.sourceId ?? reference.sourceId, sourceTrust: "untrusted", content: action.content!, contentHash: hash(action.content!) } });
    await recordEvent(tx, { actorId: action.actorId, sessionId: action.sessionId, requestId: action.requestId, identityVerified: true, simulated: false, module: "MemoryGuard", kind: "CROSS_AGENT_SUBMITTED", severity: "info", message: "Authenticated synthetic submission recorded. Agent-authored text remains untrusted; no permissions transferred.", details: { messageId: message.id, sourceId: message.sourceId, sourceTrust: "untrusted", referenceRequestId: reference.id, rootRequestId: message.rootRequestId, targetId: message.receiverId, contentHash: message.contentHash } });
    return { output: JSON.stringify({ messageId: message.id, sourceTrust: message.sourceTrust }), metadata: { handler: "scoped-message-submit", messageId: message.id, contentHash: message.contentHash } };
  }
  if (action.resource === "agents/inbox") {
    const message = await tx.agentMessage.findUniqueOrThrow({ where: { id: action.messageId! } });
    if (message.receiverId !== action.actorId || hash(message.content) !== message.contentHash) throw new Error("Inbox integrity/ownership");
    await tx.agentMessage.update({ where: { id: message.id }, data: { receivedRequestId: action.requestId } });
    await tx.session.update({ where: { id: action.sessionId }, data: { sourceId: message.sourceId ?? `message:${message.id}`, sourceTrust: "untrusted" } });
    await tx.toolRequest.update({ where: { id: action.requestId }, data: { sourceId: message.sourceId ?? `message:${message.id}` } });
    await recordEvent(tx, { actorId: action.actorId, sessionId: action.sessionId, requestId: action.requestId, identityVerified: true, simulated: false, module: "MemoryGuard", kind: "CROSS_AGENT_RECEIVED", severity: "info", message: "Own inbox content read as untrusted data. Verified sender does not grant tool or memory permissions.", details: { messageId: message.id, sourceId: message.sourceId, sourceTrust: "untrusted", referenceRequestId: message.referenceRequestId, rootRequestId: message.rootRequestId, senderId: message.senderId } });
    return { output: message.content, metadata: { handler: "scoped-message-read", messageId: message.id, sourceTrust: "untrusted", rootRequestId: message.rootRequestId } };
  }
  if (action.resource === "docs/research" || action.resource === "runtime/tasks" || action.resource === "infra/status") {
    const fixture = { "docs/research": "research.md", "runtime/tasks": "tasks.json", "infra/status": "status.json" }[action.resource]!;
    const output = await readFile(join(process.cwd(), "fixtures/runtime", fixture), "utf8");
    if (Buffer.byteLength(output) > 8000) throw new Error("Local fixture exceeds resource limit");
    return { output, metadata: { handler: "fixture-read", syntheticResource: true } };
  }
  if (action.resource === "docs/untrusted" || action.resource === "docs/context") {
    const source = await tx.sourceDocument.findUniqueOrThrow({ where: { id: action.resource === "docs/context" ? action.sourceId! : "untrusted-paper" } });
    if (hash(source.content) !== source.contentHash) throw new Error("Source integrity mismatch");
    return { output: source.content, metadata: { handler: "untrusted-document-read", sourceDocumentId: source.id, sourceTrust: source.trust } };
  }
  if (action.resource === "research/summary") {
    // Writable runtime data is not a build asset; never trace private workspace contents.
    const root = resolve(/* turbopackIgnore: true */ process.env.GHOSTOPS_RUNTIME_WORKSPACE ?? ".ghostops/runtime-workspace");
    await mkdir(root, { recursive: true, mode: 0o700 });
    if (!(await lstat(root)).isDirectory() || (await lstat(root)).isSymbolicLink()) throw new Error("Unsafe workspace");
    const artifact = `${hash(`${action.actorId}:${action.requestId}`)}.txt`;
    const path = join(root, artifact);
    const content = action.content ?? "";
    // Exclusive, no-follow artifact creation. An interrupted transaction may retry only
    // the exact same bytes; a changed write fails closed. Committed receipts never rerun.
    let recovered = false;
    try {
      const file = await open(path, constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL | constants.O_NOFOLLOW, 0o600);
      try { await file.writeFile(content); await file.sync(); } finally { await file.close(); }
    } catch (error) {
      if (!(error instanceof Error && "code" in error && error.code === "EEXIST")) throw error;
      const file = await open(path, constants.O_RDONLY | constants.O_NOFOLLOW);
      try {
        if ((await file.stat()).size > 16_000 || hash(await file.readFile("utf8")) !== hash(content)) throw new Error("Artifact conflict");
      } finally { await file.close(); }
      recovered = true;
    }
    return { output: `Summary saved as ${artifact}`, metadata: { handler: "restricted-workspace-write", artifact, contentHash: hash(content), recovered } };
  }
  if (action.resource === "memory/runtime-notes" || action.resource === "memory/runtime-policy") {
    const key = action.resource === "memory/runtime-notes" ? "runtime-notes" : "runtime-policy";
    if (action.operation === "write") {
      if (key !== "runtime-notes") throw new Error("Policy writes forbidden independently of permissions");
      const session = await tx.session.findUniqueOrThrow({ where: { id: action.sessionId } });
      const current = await tx.memoryVersion.findFirst({ where: { ownerId: action.actorId, key }, orderBy: { version: "desc" } });
      if (current && !verifySignature(current)) throw new Error("Restore tampered notes before appending");
      const version = await appendMemory(tx, { ownerId: action.actorId, key, content: action.content!, sessionId: session.id, sourceId: session.sourceId ?? "runtime-agent", sourceTrust: session.sourceTrust, protected: false, authorization: `authenticated-agent-session:${session.id}` });
      return { output: `Signed notes version ${version.version} saved; not executable policy.`, metadata: { handler: "signed-memory-append", memoryVersionId: version.id, protected: false } };
    }
    const memory = await tx.memoryVersion.findFirstOrThrow({ where: { ownerId: action.actorId, key }, orderBy: { version: "desc" } });
    if (!verifySignature(memory)) throw new Error("Memory integrity mismatch");
    return { output: memory.content, metadata: { handler: "signed-memory-read", memoryVersionId: memory.id, sourceTrust: memory.sourceTrust } };
  }
  throw new Error("No runtime handler for this resource");
};
