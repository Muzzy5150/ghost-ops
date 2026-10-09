import { NextRequest, NextResponse } from "next/server";
import { cancelExperiment } from "@/server/lab";
import { requireAdmin, readBody, failure, noStore } from "@/server/http";
export const runtime = "nodejs";
export async function POST(request: NextRequest) {
  try { requireAdmin(request, true); return NextResponse.json(await cancelExperiment(await readBody(request)), { headers: noStore }); }
  catch (error) { return failure(error); }
}
