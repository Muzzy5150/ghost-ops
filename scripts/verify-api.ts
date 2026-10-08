import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { request as httpRequest } from "node:http";
import { credentialFor } from "../src/server/config";

const base = process.env.GHOSTOPS_TEST_URL ?? "http://127.0.0.1:3000";
if (!/^http:\/\/(127\.0\.0\.1|localhost):\d+$/.test(base)) throw new Error("API verification is restricted to local loopback servers");
const bootstrap = await fetch(`${base}/api/bootstrap`);
assert.equal(bootstrap.status, 200, `Bootstrap: ${await bootstrap.clone().text()}`);
const csrf = (await bootstrap.json()).csrf;
const cookie = bootstrap.headers.get("set-cookie")!.split(";")[0];
const headers = { cookie, origin: base, "x-ghostops-csrf": csrf, "content-type": "application/json" };
async function state() { const response = await fetch(`${base}/api/state`, { headers: { cookie } }); assert.equal(response.status, 200); return response.json(); }
async function control(action: string, targetId?: string, commandId = randomUUID()) {
  const response = await fetch(`${base}/api/control`, { method: "POST", headers, body: JSON.stringify({ action, targetId, commandId }) });
  const data = await response.json();
  assert.equal(response.status, 200, JSON.stringify(data));
  return data;
}
// This script intentionally resets the local synthetic demo environment.
await control("reset");
assert.equal((await state()).stats.requests, 0);
let result = (await control("normal")).result;
assert.equal(result.allowed, 18);
assert.equal(result.blocked, 0);
assert.equal((await state()).incidents.length, 0);
console.log("PASS A: 18 authorized gateway operations, baseline established, no incidents.");
result = (await control("rogue")).result;
assert.equal(result.blocked, 2);
assert.equal((await state()).stats.unknown, 1);
console.log("PASS B: unknown identity blocked, decoy evidence correlated, actor denied.");
result = (await control("poisoning")).result;
assert.equal(result.allowed, 3);
assert.equal(result.blocked, 2);
assert.equal(result.tamperDetected, true);
assert.equal(result.restorationVerified, true);
console.log("PASS C: protected memory write blocked, legitimate research completed, tamper rollback verified.");
const commandId = randomUUID();
result = (await control("compromise", undefined, commandId)).result;
assert.equal(result.blocked, 4);
assert.equal(result.requests.at(-1).reason, "AGENT_QUARANTINED");
assert.equal(result.restorationVerified, true);
let snapshot = await state();
const incident = snapshot.incidents.find((i: { severity: string }) => i.severity === "critical");
assert.equal(incident.status, "contained");
assert.equal(incident.actorId, "research");
assert.equal(snapshot.agents.find((a: { id: string }) => a.id === "research").status, "quarantined");
const actionCount = snapshot.actions.length;
assert.equal((await control("compromise", undefined, commandId)).replayed, true);
assert.equal((await state()).actions.length, actionCount);
console.log("PASS D: linked critical incident, automatic quarantine, approved task blocked, verified memory restored, replay idempotent.");

const post = (path: string, body: unknown, additional: Record<string, string> = {}) => fetch(`${base}${path}`, { method: "POST", headers: { "content-type": "application/json", ...additional }, body: JSON.stringify(body) });
const rawStatus = (headers: Record<string, string>) => new Promise<number>((resolve, reject) => {
  const request = httpRequest(`${base}/api/bootstrap`, { headers }, response => { response.resume(); resolve(response.statusCode!); });
  request.on("error", reject);
  request.end();
});
assert.equal((await fetch(`${base}/api/state`)).status, 401);
assert.equal((await post("/api/control", { commandId: randomUUID(), action: "reset" })).status, 401);
assert.equal((await post("/api/control", { commandId: randomUUID(), action: "reset" }, { cookie, origin: base })).status, 403);
assert.equal((await post("/api/control", { commandId: randomUUID(), action: "reset" }, { ...headers, origin: "https://evil.invalid" })).status, 403);
// Node fetch ignores an overridden Host header; test the wire header using node:http.
assert.equal(await rawStatus({ host: "evil.invalid" }), 403);
assert.equal((await fetch(`${base}/api/bootstrap`, { headers: { "x-forwarded-host": "localhost" } })).status, 403);
assert.equal((await fetch(`${base}/api/bootstrap`, { headers: { "x-forwarded-for": "127.0.0.1" } })).status, 403);
assert.equal(await rawStatus({ "x-ghostops-transport": "forged-attestation" }), 403);
assert.equal(await rawStatus({ "x-forwarded-port": "443" }), 403);
assert.equal((await post("/api/control", { commandId: randomUUID(), action: "reset", arbitrary: true }, headers)).status, 400);
assert.equal((await post("/api/control", { commandId: randomUUID(), action: "reset", data: "a".repeat(17000) }, headers)).status, 413);
console.log("PASS management: anonymous, missing-CSRF, cross-origin, hostile host, proxy, invalid-schema and oversized requests denied.");

await control("restore-agent", "research");
const action = { requestId: randomUUID(), actorId: "research", sessionId: "research-session-v1", tool: "documents", operation: "read", resource: "docs/research" };
let response = await post("/api/ingest", action, { authorization: `Bearer ${credentialFor("research-credential-v1")}` });
assert.equal(response.status, 403);
assert.equal((await response.json()).reason, "CREDENTIAL_REVOKED");
response = await post("/api/ingest", { ...action, requestId: randomUUID() }, { authorization: "Bearer invalid-credential" });
assert.equal(response.status, 403);
assert.equal((await response.json()).reason, "INVALID_CREDENTIAL");
console.log("PASS restoration: old credential remains revoked, invalid credentials rejected over actual HTTP.");
// Leave a compelling, predictable demo state for inspection.
await control("reset");
await control("normal");
await control("rogue");
await control("poisoning");
await control("compromise");
snapshot = await state();
console.log(`VERIFIED: ${snapshot.stats.requests} requests, ${snapshot.stats.blocked} blocked, ${snapshot.stats.incidents} incidents, ${snapshot.stats.quarantined} quarantined. No OpenAI key required.`);
