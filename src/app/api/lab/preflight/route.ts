import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, readBody, failure, noStore } from "@/server/http";
import { preflightExperiment } from "@/server/preflight";
export const runtime = "nodejs";
export async function POST(request: NextRequest) {
  try { requireAdmin(request, true); return NextResponse.json(await preflightExperiment(await readBody(request)), { headers: noStore }); }
  catch (error) { return failure(error); }
}
