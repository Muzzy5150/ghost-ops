import { beforeAll, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { NextRequest } from "next/server";
import { labStartSchema } from "../src/lib/lab-contract";
import { startExperiment, executeExperiment } from "../src/server/lab";
import { callRuntime } from "../src/server/runtime";
import { exportEvidence } from "../src/server/evidence";
import { verifyEvidence } from "../src/lib/evidence-verification";
import { evidenceZip, readEvidenceZip } from "../src/lib/evidence-zip";
import { canonical } from "../src/lib/canonical";
import { mac, secureEqual, transportToken } from "../src/server/config";
import { db } from "../src/server/db";
import { GET } from "../src/app/api/evidence/[kind]/[id]/route";
let runId: string, incidentId: string, packageBytes: Buffer;
const auth = (text: string, tag: string) => secureEqual(mac(`ghostops-evidence:v1:${text}`), tag);
beforeAll(async () => {
  const started = await startExperiment(labStartSchema.parse({ commandId: randomUUID(), scenario: "memory-poisoning", mode: "local" })); runId = started.runId;
  await executeExperiment(runId, "http://127.0.0.1:3210", (name, resource, content, requestId, who) => callRuntime(who.actorId, who.sessionId, who.credential, name, { requestId, resource, ...(content ? { content } : {}) }));
  const run = await db.experimentRun.findUniqueOrThrow({ where: { id: runId } }); incidentId = (run.results as { incidents: string[] }).incidents[0]; packageBytes = (await exportEvidence("run", runId)).zip;
});
it("exports seven standard files with real ordered events, policy decisions and verified memory metadata", () => {
  expect(verifyEvidence(packageBytes, auth)).toMatchObject({ valid: true, authenticated: true, files: 6, subjectId: runId });
  const files = readEvidenceZip(packageBytes); expect(Object.keys(files)).toHaveLength(7);
  const memory = JSON.parse(files["memory-evidence.json"].toString()); expect(memory.some((m: { integrityAtExport: string }) => m.integrityAtExport === "verified")).toBe(true);
  const events = files["events.jsonl"].toString().trim().split("\n").map(line => JSON.parse(line)); expect(events.every((e, i) => !i || e.ordinal >= events[i - 1].ordinal)).toBe(true);
});
it("hash-only verification explicitly does not establish authenticated origin", () => {
  expect(verifyEvidence(packageBytes)).toMatchObject({ valid: true, authenticated: null }); expect(verifyEvidence(packageBytes).trust).toContain("NOT established");
});
it("rejects modified evidence even when ZIP CRC is legitimately regenerated", () => {
  const files = readEvidenceZip(packageBytes); files["events.jsonl"] = Buffer.from("altered evidence\n"); expect(() => verifyEvidence(evidenceZip(files), auth)).toThrow("hash/size");
});
it("rejects missing and unknown files", () => {
  const files = readEvidenceZip(packageBytes); delete files["memory-evidence.json"]; expect(() => verifyEvidence(evidenceZip(files), auth)).toThrow("Missing");
  expect(() => evidenceZip({ "../../credential.json": "not allowed" })).toThrow("filename");
});
it("rejects forged manifest authentication even if all attacker-recalculated hashes match", () => {
  const files = readEvidenceZip(packageBytes), manifest = JSON.parse(files["manifest.json"].toString()); manifest.createdAt = new Date(0).toISOString(); files["manifest.json"] = Buffer.from(canonical(manifest));
  expect(() => verifyEvidence(evidenceZip(files), auth)).toThrow("authentication"); expect(verifyEvidence(evidenceZip(files)).authenticated).toBeNull();
});
it("rejects the wrong signing key and validates manifest identifier consistency", () => {
  expect(() => verifyEvidence(packageBytes, () => false)).toThrow("authentication");
  const files = readEvidenceZip(packageBytes), manifest = JSON.parse(files["manifest.json"].toString()); manifest.subjectId = randomUUID(); files["manifest.json"] = Buffer.from(canonical(manifest));
  expect(() => verifyEvidence(evidenceZip(files))).toThrow("subject inconsistency");
});
it("redacts private event fields, raw memory content, tool output and credential/signature material before hashing", async () => {
  const event = await db.securityEvent.findFirstOrThrow({ where: { runId } });
  await db.securityEvent.update({ where: { id: event.id }, data: { details: { credential: "private-fixture-credential", prompt: "private prompt must not export", content: "private memory content", response: "private response", reason: "api_key=sk-privatefixture123456789" } } });
  const result = await exportEvidence("run", runId), files = readEvidenceZip(result.zip), text = Object.values(files).map(b => b.toString()).join("\n");
  for (const value of ["private-fixture-credential", "private prompt must not export", "private memory content", "private response", "sk-privatefixture123456789", "isolated-vitest-signing-key"]) expect(text).not.toContain(value);
  expect(text).toContain("REDACTED"); expect(text).not.toContain('"signature":'); expect(text).not.toContain('"fingerprint":'); expect(text).not.toContain('"credentialId":');
  expect(result.verification.authenticated).toBe(true);
});
it("creates deterministic-template incident reports with linked evidence and no invented events", async () => {
  const result = await exportEvidence("incident", incidentId), files = readEvidenceZip(result.zip); expect(verifyEvidence(result.zip, auth).scope).toBe("incident");
  const actual = await db.securityEvent.findMany({ where: { incidentId }, orderBy: { ordinal: "asc" } }); const exported = files["events.jsonl"].toString().trim().split("\n").map(l => JSON.parse(l)); expect(exported.map(e => e.id)).toEqual(actual.map(e => e.id));
  expect(files["summary.html"].toString()).toContain("Executive summary"); expect(files["summary.html"].toString()).not.toContain("<script");
});
it("refuses active/unknown run exports and invalid scope identifiers", async () => {
  const pending = await startExperiment(labStartSchema.parse({ commandId: randomUUID(), scenario: "normal", mode: "offline" }));
  await expect(exportEvidence("run", pending.runId)).rejects.toThrow("terminal"); await expect(exportEvidence("run", randomUUID())).rejects.toThrow("terminal"); await expect(exportEvidence("run", "../unsafe")).rejects.toThrow();
});
it("requires independent admin authorization, not an agent bearer credential", async () => {
  const request = new NextRequest(`http://127.0.0.1:3210/api/evidence/run/${runId}`, { headers: { host: "127.0.0.1:3210", "x-ghostops-transport": transportToken(), authorization: "Bearer private-fixture-credential" } });
  expect((await GET(request, { params: Promise.resolve({ kind: "run", id: runId }) })).status).toBe(401);
});
it("bounded ZIP rejects CRC corruption, trailing data, unsupported compression and oversized packages", () => {
  const altered = Buffer.from(packageBytes); altered[40] ^= 1; expect(() => readEvidenceZip(altered)).toThrow();
  expect(() => readEvidenceZip(Buffer.concat([packageBytes, Buffer.from("trailing")]))).toThrow();
  expect(() => evidenceZip({ "events.jsonl": "x".repeat(1024 * 1024 + 1) })).toThrow("limits");
  const method = Buffer.from(packageBytes); method.writeUInt16LE(8, 8); expect(() => readEvidenceZip(method)).toThrow();
});
