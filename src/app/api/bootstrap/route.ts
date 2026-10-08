import { NextRequest, NextResponse } from "next/server";
import { adminSession, validAdminSession, csrfToken } from "@/server/config";
import { failure, localOnly, noStore } from "@/server/http";
export const runtime = "nodejs";
export async function GET(request: NextRequest) {
  try {
    localOnly(request);
    const existing = request.cookies.get("ghostops-admin")?.value ?? "";
    const session = validAdminSession(existing) ? existing : adminSession();
    const response = NextResponse.json({ csrf: csrfToken(session), mode: "isolated-simulation" }, { headers: noStore });
    response.cookies.set("ghostops-admin", session, { httpOnly: true, sameSite: "strict", secure: false, path: "/", maxAge: Math.max(1, Math.floor((Number(session.split(".")[0]) - Date.now()) / 1000)) });
    return response;
  } catch (error) { return failure(error); }
}
