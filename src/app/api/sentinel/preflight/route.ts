import {NextRequest,NextResponse} from "next/server";
import {requireAdmin,readBody,failure,noStore} from "@/server/http";
import {sentinelPreflight} from "@/server/sentinel";
export const runtime="nodejs";
export async function POST(request:NextRequest){try{requireAdmin(request,true);return NextResponse.json(await sentinelPreflight(await readBody(request)),{headers:noStore});}catch(error){return failure(error);}}
