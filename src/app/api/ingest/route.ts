import { NextRequest, NextResponse } from "next/server";
import { actionSchema } from "@/lib/schemas";
import { ingest } from "@/server/service";
import { failure, HttpError, localOnly, noStore, readBody } from "@/server/http";
export const runtime = "nodejs";
export async function POST(request: NextRequest) {
  try {
    localOnly(request);
    const authorization = request.headers.get("authorization") ?? "";
    if (!/^Bearer [a-zA-Z0-9_.:-]{8,256}$/.test(authorization)) throw new HttpError(401, "Bearer agent credential required");
    const result = await ingest(actionSchema.parse(await readBody(request)), authorization.slice(7));
    return NextResponse.json(result, { status: result.allowed ? 200 : 403, headers: noStore });
  } catch (error) { return failure(error); }
}
