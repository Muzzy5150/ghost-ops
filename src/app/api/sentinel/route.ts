import { NextRequest,NextResponse } from "next/server";
import {requireAdmin,readBody,failure,noStore} from "@/server/http";
import {sentinelSnapshot,startSentinel,sentinelCommand} from "@/server/sentinel";
export const runtime="nodejs";
export async function GET(request:NextRequest){try{requireAdmin(request);return NextResponse.json(await sentinelSnapshot(),{headers:noStore});}catch(error){return failure(error);}}
export async function POST(request:NextRequest){try{requireAdmin(request,true);const body=await readBody(request);const result=body&&typeof body==="object"&&"action" in body?await sentinelCommand(body):await startSentinel(body);return NextResponse.json(result,{headers:noStore});}catch(error){return failure(error);}}
