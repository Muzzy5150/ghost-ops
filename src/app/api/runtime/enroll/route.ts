import { NextRequest, NextResponse } from "next/server";
import { enrollmentSchema } from "@/lib/runtime-contract";
import { enrollRuntime } from "@/server/runtime";
import { failure, noStore, readBody, requireAdmin } from "@/server/http";
export const runtime = "nodejs";
export async function POST(request: NextRequest) {
  try { requireAdmin(request, true); return NextResponse.json(await enrollRuntime(enrollmentSchema.parse(await readBody(request))), { headers: noStore }); }
  catch (error) { return failure(error); }
}
