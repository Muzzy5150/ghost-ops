import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { failure, noStore, requireAdmin } from "@/server/http";
import { verifySignature, hash } from "@/server/memory";
import { releaseId } from "@/lib/release";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(request: NextRequest) {
  try {
    requireAdmin(request);
    const result = await db.$transaction(async tx => {
      // Select the additive column too: an unmigrated DB must not appear ready.
      await tx.agent.findFirst({ select: { integrationType: true } });
      const memories = await tx.memoryVersion.findMany({ orderBy: { version: "desc" }, take: 1001 });
      if (memories.length > 1000) throw new Error("Memory capacity exceeded");
      const latest = memories.filter((m, i) => memories.findIndex(v => v.ownerId === m.ownerId && v.key === m.key) === i);
      const invalid = latest.filter(m => !verifySignature(m)).length;
      const source = await tx.sourceDocument.findUnique({ where: { id: "untrusted-paper" } });
      const decoys = await tx.honeypot.count({ where: { active: true, resource: { in: ["decoy/admin", "decoy/credentials"] } } });
      const fixtures = !!source && source.trust === "untrusted" && source.contentHash === hash(source.content) && decoys === 2;
      return { release: releaseId, ready: latest.length > 0 && invalid === 0 && fixtures,
        database: { available: true, externalSchema: true }, integrity: { configured: true, currentVersions: latest.length, invalidCurrentVersions: invalid },
        fixtures: { syntheticDocumentsAndDecoys: fixtures }, evidence: { formatVersion: 1, authentication: "local-HMAC-SHA256", exportSupported: true },
        integration: { transports: ["stdio", "loopback-json-http"], capabilities: ["tools/list", "tools/call"] }, modelInferenceRequired: false };
    });
    return NextResponse.json(result, { headers: noStore });
  } catch (error) { return failure(error); }
}
