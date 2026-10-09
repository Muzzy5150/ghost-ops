import { NextRequest } from "next/server";
import { requireAdmin, failure, noStore } from "@/server/http";
import { evidenceScopeSchema, exportEvidence } from "@/server/evidence";
export const runtime = "nodejs";
export async function GET(request: NextRequest, context: { params: Promise<{ kind: string; id: string }> }) {
  try {
    requireAdmin(request);
    const { kind, id } = evidenceScopeSchema.parse(await context.params);
    const result = await exportEvidence(kind, id);
    return new Response(new Uint8Array(result.zip), { headers: { ...noStore, "content-type": "application/zip", "content-disposition": `attachment; filename="ghostops-${kind}-${id}.zip"`, "x-content-type-options": "nosniff", "x-ghostops-evidence-integrity": "local-hmac-and-hashes-verified" } });
  } catch (error) { return failure(error); }
}
