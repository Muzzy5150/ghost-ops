import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { chmodSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

function loadSecret() {
  if (process.env.GHOSTOPS_SIGNING_SECRET) {
    if (process.env.GHOSTOPS_SIGNING_SECRET.length < 32) throw new Error("Signing secret requires at least 32 characters");
    return process.env.GHOSTOPS_SIGNING_SECRET;
  }
  const dir = resolve(process.cwd(), ".ghostops");
  mkdirSync(dir, { recursive: true, mode: 0o700 });
  const file = resolve(dir, "integrity.key");
  if (!existsSync(file)) {
    try { writeFileSync(file, randomBytes(48).toString("hex"), { mode: 0o600, flag: "wx" }); }
    catch (error) { if (!existsSync(file)) throw error; }
  }
  chmodSync(file, 0o600);
  const persisted = readFileSync(file, "utf8").trim();
  if (persisted.length < 32) throw new Error("Persisted integrity key is invalid; recover the original key or reinitialize the disposable demo");
  return persisted;
}
const secret = loadSecret();
export function mac(value: string) { return createHmac("sha256", secret).update(value).digest("hex"); }
export function secureEqual(a: string, b: string) {
  const x = Buffer.from(a), y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}
export function credentialFor(id: string) { return mac(`agent-credential:${id}`); }
export function credentialDigest(value: string) { return mac(`credential-digest:${value}`); }
const adminLifetime = 8 * 3600_000;
export function adminSession(now = Date.now()) {
  const payload = `${now + adminLifetime}.${randomBytes(16).toString("hex")}`;
  return `${payload}.${mac(`local-admin-session:v2:${payload}`)}`;
}
export function validAdminSession(value: string, now = Date.now()) {
  const match = /^(\d{13})\.([a-f0-9]{32})\.([a-f0-9]{64})$/.exec(value);
  if (!match) return false;
  const expires = Number(match[1]);
  return expires > now && expires <= now + adminLifetime && secureEqual(match[3], mac(`local-admin-session:v2:${match[1]}.${match[2]}`));
}
export function csrfToken(session: string) { return mac(`local-admin-csrf:v2:${session}`); }
export function transportToken() { return mac("loopback-transport:v1"); }
