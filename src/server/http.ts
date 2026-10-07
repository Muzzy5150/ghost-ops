import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { adminSession, csrfToken, secureEqual } from "./config";
import { ConflictError } from "./gateway";

export class HttpError extends Error { constructor(public status: number, message: string) { super(message); } }
export function localOnly(request: NextRequest) {
  const host = request.headers.get("host") ?? "";
  if (!/^(localhost|127\.0\.0\.1|\[::1\])(?::\d{1,5})?$/.test(host)) throw new HttpError(403, "Management is restricted to loopback hosts");
  if (request.headers.has("x-forwarded-host") || request.headers.has("x-forwarded-for") || request.headers.has("forwarded")) throw new HttpError(403, "Proxy access is disabled");
  const origin = request.headers.get("origin");
  if (origin && origin !== `http://${host}`) throw new HttpError(403, "Cross-origin request rejected");
  if (["cross-site", "same-site"].includes(request.headers.get("sec-fetch-site") ?? "")) throw new HttpError(403, "Cross-site request rejected");
}
export function requireAdmin(request: NextRequest, mutate = false) {
  localOnly(request);
  if (!secureEqual(request.cookies.get("ghostops-admin")?.value ?? "", adminSession())) throw new HttpError(401, "Local administrative session required");
  if (mutate && (!request.headers.get("origin") || !secureEqual(request.headers.get("x-ghostops-csrf") ?? "", csrfToken()))) throw new HttpError(403, "Same-origin CSRF token required");
}
export async function readBody(request: NextRequest) {
  if (!request.headers.get("content-type")?.startsWith("application/json")) throw new HttpError(415, "JSON content type required");
  if (Number(request.headers.get("content-length")) > 16_384) throw new HttpError(413, "Request body exceeds 16 KiB");
  const reader = request.body?.getReader();
  if (!reader) throw new HttpError(400, "Request body required");
  let total = 0;
  const parts: Uint8Array[] = [];
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > 16_384) { await reader.cancel(); throw new HttpError(413, "Request body exceeds 16 KiB"); }
    parts.push(value);
  }
  try { return JSON.parse(Buffer.concat(parts).toString("utf8")); }
  catch { throw new HttpError(400, "Invalid JSON"); }
}
export function failure(error: unknown) {
  if (error instanceof HttpError) return NextResponse.json({ error: error.message }, { status: error.status });
  if (error instanceof ZodError) return NextResponse.json({ error: "Invalid input", issues: error.issues.map(i => ({ path: i.path, message: i.message })) }, { status: 400 });
  if (error instanceof ConflictError) return NextResponse.json({ error: error.message }, { status: 409 });
  // Domain errors intentionally contain no user-supplied content or secret values.
  const safe = error instanceof Error && /contained|restore|restor|active agent credential|unverified snapshot|Agent or incident not found/i.test(error.message);
  return NextResponse.json({ error: safe ? (error as Error).message : "Operation failed; confirm the local database is initialized and the target exists." }, { status: 400 });
}
export const noStore = { "Cache-Control": "no-store" };
