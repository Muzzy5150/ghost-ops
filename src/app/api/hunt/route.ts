import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, readBody, failure, noStore } from "@/server/http";
import { huntCommand, huntSnapshot } from "@/server/hunt";
export const runtime = "nodejs";
export async function GET(request: NextRequest) {
  try { requireAdmin(request); return NextResponse.json(await huntSnapshot(), { headers: noStore }); } catch (error) { return failure(error); }
}
export async function POST(request: NextRequest) {
  try { requireAdmin(request, true); return NextResponse.json(await huntCommand(await readBody(request)), { headers: noStore }); } catch (error) { return failure(error); }
}
