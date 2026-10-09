import { after, NextRequest, NextResponse } from "next/server";
import { labStartSchema } from "@/lib/lab-contract";
import { requireAdmin, readBody, failure, noStore } from "@/server/http";
import { startExperiment, executeExperiment, experimentSnapshot } from "@/server/lab";
export const runtime = "nodejs";
export async function GET(request: NextRequest) {
  try { requireAdmin(request); return NextResponse.json(await experimentSnapshot(), { headers: noStore }); }
  catch (error) { return failure(error); }
}
export async function POST(request: NextRequest) {
  try {
    requireAdmin(request, true);
    const result = await startExperiment(labStartSchema.parse(await readBody(request)));
    if (!result.replayed) {
      // Base is strictly loopback; validated host/transport came from scripts/server.ts.
      const port = new URL(request.url).port || "80";
      after(() => executeExperiment(result.runId, `http://127.0.0.1:${port}`));
    }
    return NextResponse.json(result, { headers: noStore });
  } catch (error) { return failure(error); }
}
