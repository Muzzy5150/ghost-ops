import { readFileSync, existsSync, statSync } from "node:fs";
import { resolve } from "node:path";
import { createHmac, timingSafeEqual } from "node:crypto";
import { verifyEvidence } from "../src/lib/evidence-verification";
import { evidenceLimit } from "../src/lib/evidence-zip";
try {
  const args = process.argv.slice(2), path = args.find(a => !a.startsWith("--"));
  if (!path || args.some(a => a.startsWith("--") && a !== "--hash-only")) throw new Error("Usage: evidence:verify -- PACKAGE.zip [--hash-only]");
  if (statSync(path).size > evidenceLimit + 8192) throw new Error("Archive exceeds verification limit");
  const keyPath = resolve(process.cwd(), ".ghostops/integrity.key");
  const key = args.includes("--hash-only") ? undefined : process.env.GHOSTOPS_SIGNING_SECRET ?? (existsSync(keyPath) ? readFileSync(keyPath, "utf8").trim() : undefined);
  if (key && key.length < 32) throw new Error("Invalid verification key");
  const authenticate = key ? (unsigned: string, tag: string) => { const expected = createHmac("sha256", key).update(`ghostops-evidence:v1:${unsigned}`).digest(); const actual = Buffer.from(tag, "hex"); return expected.length === actual.length && timingSafeEqual(expected, actual); } : undefined;
  console.log(JSON.stringify(verifyEvidence(readFileSync(path), authenticate), null, 2));
} catch { console.error("FAIL evidence verification: invalid package, altered/missing evidence, inconsistent manifest, invalid authentication or unavailable input. No secret values printed."); process.exitCode = 1; }
