import { NextRequest, NextResponse } from "next/server";
import { snapshot } from "@/server/service";
import { failure, noStore, requireAdmin } from "@/server/http";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(request: NextRequest) {
  try { requireAdmin(request); return NextResponse.json(await snapshot(), { headers: noStore }); }
  catch (error) { return failure(error); }
}
