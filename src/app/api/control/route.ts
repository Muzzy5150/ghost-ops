import { NextRequest, NextResponse } from "next/server";
import { commandSchema } from "@/lib/schemas";
import { command } from "@/server/service";
import { failure, noStore, readBody, requireAdmin } from "@/server/http";
export const runtime = "nodejs";
export async function POST(request: NextRequest) {
  try { requireAdmin(request, true); return NextResponse.json(await command(commandSchema.parse(await readBody(request))), { headers: noStore }); }
  catch (error) { return failure(error); }
}
