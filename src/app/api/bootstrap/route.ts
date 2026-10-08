import { NextRequest, NextResponse } from "next/server";
import { adminSession, csrfToken } from "@/server/config";
import { failure, localOnly, noStore } from "@/server/http";
export const runtime = "nodejs";
export async function GET(request: NextRequest) {
  try {
    localOnly(request);
    const response = NextResponse.json({ csrf: csrfToken(), mode: "isolated-simulation" }, { headers: noStore });
    response.cookies.set("ghostops-admin", adminSession(), { httpOnly: true, sameSite: "strict", secure: false, path: "/", maxAge: 8 * 3600 });
    return response;
  } catch (error) { return failure(error); }
}
