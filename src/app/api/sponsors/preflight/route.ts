import { NextRequest,NextResponse } from "next/server";
import { requireAdmin,readBody,failure,noStore } from "@/server/http";
import { sponsorPreflight } from "@/server/sponsors";
export const runtime="nodejs";
export async function POST(request:NextRequest){try{requireAdmin(request,true);return NextResponse.json(await sponsorPreflight(await readBody(request)),{headers:noStore});}catch(e){return failure(e);}}
