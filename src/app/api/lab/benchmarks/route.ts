import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, failure, noStore } from "@/server/http";
import { benchmarkMetrics, evaluationBundles } from "@/server/benchmarks";
export const runtime = "nodejs";
export async function GET(request: NextRequest) {
  try { requireAdmin(request); return NextResponse.json(benchmarkMetrics(await evaluationBundles()), { headers: noStore }); }
  catch (error) { return failure(error); }
}
