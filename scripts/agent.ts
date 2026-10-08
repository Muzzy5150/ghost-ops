import { randomBytes, randomUUID } from "node:crypto";
import { mkdir, readFile, open } from "node:fs/promises";
import { join } from "node:path";
import { z } from "zod";
import { enrollmentSchema, runtimeIdentitySchema } from "../src/lib/runtime-contract";
import { LocalAgentClient, localBase } from "../src/runtime/client";
import { runLocalAgent } from "../src/runtime/agent";

const args = process.argv.slice(2);
const value = (flag: string, fallback: string) => args.includes(flag) ? args[args.indexOf(flag) + 1] : fallback;
const actorId = enrollmentSchema.shape.actorId.parse(value("--id", "live-research"));
const directory = process.env.GHOSTOPS_CLIENT_DIR ?? join(process.cwd(), ".ghostops", "clients");
const path = join(directory, `${actorId}.json`);
const base = localBase();
try {
  if (args.includes("--provision")) {
    await mkdir(directory, { recursive: true, mode: 0o700 });
    // Persist a private pending receipt before HTTP. A timeout can retry the same
    // enrollment without generating a second credential or losing the first one.
    let pending: z.infer<typeof enrollmentSchema>;
    let file;
    try {
      file = await open(path, "wx", 0o600);
      pending = { commandId: randomUUID(), actorId, credential: randomBytes(32).toString("hex") };
      await file.writeFile(JSON.stringify(pending)); await file.sync();
    } catch (error) {
      if (!(error instanceof Error && "code" in error && error.code === "EEXIST")) throw error;
      pending = enrollmentSchema.parse(JSON.parse(await readFile(path, "utf8")));
      if (pending.actorId !== actorId) throw new Error("Enrollment identity mismatch");
      file = await open(path, "r+");
    }
    try {
      const bootstrap = await fetch(`${base}/api/bootstrap`, { redirect: "error", signal: AbortSignal.timeout(10_000) });
      if (!bootstrap.ok) throw new Error("Local administration unavailable");
      const csrf = z.object({ csrf: z.string() }).parse(await bootstrap.json()).csrf;
      const cookie = bootstrap.headers.get("set-cookie")?.split(";")[0];
      if (!cookie) throw new Error("Local administrative cookie missing");
      const response = await fetch(`${base}/api/runtime/enroll`, { method: "POST", redirect: "error", headers: { cookie, origin: base, "content-type": "application/json", "x-ghostops-csrf": csrf }, body: JSON.stringify(pending), signal: AbortSignal.timeout(10_000) });
      if (!response.ok) throw new Error(`Enrollment rejected (${response.status}); existing identities are never implicitly restored`);
      const enrollment = z.object({ actorId: z.string(), sessionId: z.string().uuid() }).parse(await response.json());
      const saved = JSON.stringify({ ...enrollment, credential: pending.credential });
      await file.write(saved, 0, "utf8"); await file.truncate(Buffer.byteLength(saved)); await file.sync();
      console.log(`Provisioned ${actorId}. Private credential file: ${path}. No signing key shared with client.`);
    } finally { await file.close(); }
  } else {
    const identity = runtimeIdentitySchema.parse(JSON.parse(await readFile(path, "utf8")));
    const client = new LocalAgentClient(identity, base);
    try {
      await client.connect();
      const result = await runLocalAgent(client, value("--task", "Read the approved research document and write a summary."), args.includes("--model"));
      console.log(JSON.stringify(result, null, 2));
    } finally { await client.close(); }
  }
} catch { console.error("Local agent operation failed. Check provisioning, current permissions, model opt-in configuration and server availability. Secret values are never printed."); process.exitCode = 1; }
