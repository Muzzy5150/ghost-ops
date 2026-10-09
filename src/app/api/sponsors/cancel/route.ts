import {NextRequest,NextResponse} from "next/server";
import {z} from "zod";
import {requireAdmin,readBody,failure,noStore} from "@/server/http";
import {cancelSponsorRun} from "@/server/sponsors";
export const runtime="nodejs";
export async function POST(request:NextRequest){try{requireAdmin(request,true);const {runId}=z.object({runId:z.string().uuid()}).strict().parse(await readBody(request));return NextResponse.json(await cancelSponsorRun(runId),{headers:noStore});}catch(e){return failure(e);}}
