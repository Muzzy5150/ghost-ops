import { NextRequest,NextResponse } from "next/server";
import { requireAdmin,readBody,failure,noStore } from "@/server/http";
import { sponsorSnapshot,sponsorExecute } from "@/server/sponsors";
export const runtime="nodejs";
export async function GET(request:NextRequest){try{requireAdmin(request);return NextResponse.json(await sponsorSnapshot(),{headers:noStore});}catch(e){return failure(e);}}
export async function POST(request:NextRequest){try{requireAdmin(request,true);return NextResponse.json(await sponsorExecute(await readBody(request)),{headers:noStore});}catch(e){return failure(e);}}
