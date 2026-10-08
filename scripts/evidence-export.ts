import { writeFile } from "node:fs/promises";
import { z } from "zod";
import { localAdmin, localBase } from "../src/runtime/client";
import { verifyEvidence } from "../src/lib/evidence-verification";
const args = process.argv.slice(2), value = (flag: string) => args[args.indexOf(flag) + 1];
try {
  const kind = args.includes("--run") ? "run" : "incident", id = z.string().uuid().parse(value(kind === "run" ? "--run" : "--incident"));
  if (!args.includes("--output")) throw new Error("Output filename required");
  const base = localBase(), response = await fetch(`${base}/api/evidence/${kind}/${id}`, { headers: await localAdmin(base), redirect: "error", signal: AbortSignal.timeout(15000) });
  if (!response.ok) throw new Error("Authenticated export denied");
  const bytes = Buffer.from(await response.arrayBuffer()); verifyEvidence(bytes);
  await writeFile(value("--output"), bytes, { mode: 0o600, flag: "wx" });
  console.log("Export saved exclusively; verify it locally with npm run evidence:verify -- PACKAGE.zip. Hashes alone do not establish origin.");
} catch { console.error("Evidence export failed; check scope, local authorization, terminal run and a new output filename. No existing file overwritten."); process.exitCode = 1; }
