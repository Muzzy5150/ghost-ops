import { createHash } from "node:crypto";
import { z } from "zod";
import { canonical } from "./canonical";
import { evidenceNames, readEvidenceZip } from "./evidence-zip";
const fileSchema = z.object({ name: z.enum(evidenceNames.filter(n => n !== "manifest.json")), sha256: z.string().regex(/^[a-f0-9]{64}$/), bytes: z.number().int().min(0).max(1024 * 1024) }).strict();
export const manifestSchema = z.object({ formatVersion: z.literal(1), packageId: z.string().uuid(), createdAt: z.string().datetime(), scope: z.enum(["run", "incident"]), subjectId: z.string().uuid(), experimentIds: z.array(z.string().uuid()).max(500), incidentIds: z.array(z.string().uuid()).max(1000), files: z.array(fileSchema).length(6), authentication: z.object({ algorithm: z.literal("HMAC-SHA256"), tag: z.string().regex(/^[a-f0-9]{64}$/) }).strict(), limitations: z.array(z.string().max(400)).max(10) }).strict();
export const contentHash = (v: Uint8Array | string) => createHash("sha256").update(v).digest("hex");
export function verifyEvidence(input: Uint8Array, authenticate?: (unsigned: string, tag: string) => boolean) {
  const files = readEvidenceZip(input);
  if (!files["manifest.json"]) throw new Error("Missing manifest");
  const manifest = manifestSchema.parse(JSON.parse(files["manifest.json"].toString("utf8")));
  const expected = new Set(manifest.files.map(f => f.name));
  if (expected.size !== 6 || Object.keys(files).length !== 7) throw new Error("Missing or unexpected evidence files");
  for (const entry of manifest.files) if (!files[entry.name] || files[entry.name].length !== entry.bytes || contentHash(files[entry.name]) !== entry.sha256) throw new Error("Evidence content hash/size mismatch");
  const { authentication, ...unsigned } = manifest;
  if (authenticate && !authenticate(canonical(unsigned), authentication.tag)) throw new Error("Manifest authentication failed");
  const experiment = JSON.parse(files["experiment.json"].toString());
  const incidents = JSON.parse(files["incidents.json"].toString()) as { id: string }[];
  if ((manifest.scope === "run" && experiment?.id !== manifest.subjectId) || (manifest.scope === "incident" && !incidents.some(i => i.id === manifest.subjectId))) throw new Error("Manifest subject inconsistency");
  if (canonical(manifest.experimentIds) !== canonical(experiment ? [experiment.id] : []) || canonical([...manifest.incidentIds].sort()) !== canonical(incidents.map(i => i.id).sort())) throw new Error("Manifest identifier inconsistency");
  for (const name of ["policy-decisions.json", "memory-evidence.json"] as const) if (!Array.isArray(JSON.parse(files[name].toString()))) throw new Error("Invalid evidence schema");
  let previous = -1; const ids = new Set<string>();
  for (const line of files["events.jsonl"].toString().split("\n").filter(Boolean)) { const event = JSON.parse(line); if (typeof event.id !== "string" || ids.has(event.id) || !Number.isSafeInteger(event.ordinal) || event.ordinal < previous) throw new Error("Event order/identifier inconsistency"); ids.add(event.id); previous = event.ordinal; }
  return { valid: true as const, hashesVerified: true, authenticated: authenticate ? true : null, packageId: manifest.packageId, scope: manifest.scope, subjectId: manifest.subjectId, files: manifest.files.length, trust: authenticate ? "Local key authenticated; host/key compromise is not excluded" : "Hashes only; trustworthy origin is NOT established" };
}
