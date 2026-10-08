import { afterEach, expect, it } from "vitest";
import { randomBytes, randomUUID, createHmac } from "node:crypto";
import { createServer, type Server, type RequestListener } from "node:http";
import { mkdtemp, readFile, stat, writeFile, access, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { NextRequest } from "next/server";
import { GET } from "../src/app/api/release/route";
import { adminSession, transportToken } from "../src/server/config";
import { command } from "../src/server/service";
import { db } from "../src/server/db";
import { backupPresenter, verifyPresenterBackup } from "../src/runtime/presenter-backup";
import { releasePreflight } from "../src/runtime/release-preflight";
import { releaseId } from "../src/lib/release";
const execute = promisify(execFile);
let server: Server | undefined, directory: string | undefined;
afterEach(async () => { if (server) { server.closeAllConnections(); await new Promise<void>(r => server!.close(() => r())); server = undefined; } if (directory) { await rm(directory, { recursive: true }); directory = undefined; } });
async function listen(handler: RequestListener) { server = createServer(handler); await new Promise<void>(r => server!.listen(0, "127.0.0.1", r)); return `http://127.0.0.1:${(server.address() as { port: number }).port}`; }
const request = () => new NextRequest("http://127.0.0.1:3210/api/release", { headers: { host: "127.0.0.1:3210", "x-ghostops-transport": transportToken(), cookie: `ghostops-admin=${adminSession()}` } });
it("release readiness requires existing local administrator authority", async () => {
  expect((await GET(new NextRequest("http://127.0.0.1:3210/api/release"))).status).toBe(403);
  expect((await GET(new NextRequest("http://127.0.0.1:3210/api/release", { headers: { host: "127.0.0.1:3210", "x-ghostops-transport": transportToken() } }))).status).toBe(401);
});
it("release readiness checks real schema, fixtures and current signatures without payloads", async () => {
  await command({ commandId: randomUUID(), action: "initialize" });
  const result = await (await GET(request())).json(); expect(result).toMatchObject({ release: releaseId, ready: true, modelInferenceRequired: false, database: { externalSchema: true }, integrity: { invalidCurrentVersions: 0 } });
  expect(JSON.stringify(result)).not.toContain("signature"); expect(JSON.stringify(result)).not.toContain("content");
});
it("current memory tampering prevents release readiness", async () => {
  const memory = await db.memoryVersion.findFirstOrThrow({ orderBy: { version: "desc" } });
  await db.memoryVersion.update({ where: { id: memory.id }, data: { content: "Controlled release-check tamper" } });
  try { expect(await (await GET(request())).json()).toMatchObject({ ready: false, integrity: { invalidCurrentVersions: 1 } }); }
  finally { await db.memoryVersion.update({ where: { id: memory.id }, data: { content: memory.content } }); }
});
it("old presenter cannot accidentally pass version-aware preflight", async () => {
  const endpoint = await listen((req, res) => { if (req.url === "/api/bootstrap") { res.setHeader("set-cookie", "ghostops-admin=fixture; HttpOnly"); res.end(JSON.stringify({ csrf: "fixture" })); } else { res.writeHead(404); res.end(); } });
  const result = await releasePreflight({ endpoint, serverOnly: true }); expect(result.ready).toBe(false); expect(result.checks.find(c => c.check === "built-release-version")?.pass).toBe(false); expect(result.observedRelease).toBe("unverified/older server");
});
it("consistent backup preserves data and matching key in private files", async () => {
  directory = await mkdtemp(join(tmpdir(), "ghostops-release-backup-"));
  const key = process.env.GHOSTOPS_SIGNING_SECRET!;
  const payload = `${Date.now() + 60000}.${randomBytes(16).toString("hex")}`, tag = createHmac("sha256", key).update(`local-admin-session:v2:${payload}`).digest("hex");
  const endpoint = await listen((_req, res) => { res.setHeader("set-cookie", `ghostops-admin=${payload}.${tag}; HttpOnly`); res.end("{}"); });
  const output = join(directory, "backup"), before = await db.memoryVersion.count();
  const result = await backupPresenter({ endpoint, database: process.env.DATABASE_URL!.slice(5), output, key });
  expect(result).toMatchObject({ valid: true, protectedPermissions: true, invalidCurrentVersions: 0 }); expect(result.tables.MemoryVersion).toBe(before);
  expect((await stat(output)).mode & 0o777).toBe(0o700);
  for (const file of ["manifest.json", "database.sqlite", "integrity.key"]) expect((await stat(join(output, file))).mode & 0o777).toBe(0o600);
  expect(JSON.stringify(result)).not.toContain(key);
  await writeFile(join(output, "integrity.key"), "wrong-key".repeat(8), { mode: 0o600 }); await expect(verifyPresenterBackup(output)).rejects.toThrow();
});
it("wrong active key creates no backup or replacement key", async () => {
  directory = await mkdtemp(join(tmpdir(), "ghostops-release-wrong-key-"));
  const endpoint = await listen((_req, res) => { res.setHeader("set-cookie", `ghostops-admin=${Date.now() + 60000}.${"a".repeat(32)}.${"b".repeat(64)}`); res.end("{}"); });
  const output = join(directory, "must-not-exist");
  await expect(backupPresenter({ endpoint, database: process.env.DATABASE_URL!.slice(5), output, key: "wrong".repeat(12) })).rejects.toThrow(/match/);
  await expect(access(output)).rejects.toThrow();
});
it("interrupted evidence download leaves no falsely successful output", async () => {
  directory = await mkdtemp(join(tmpdir(), "ghostops-export-disconnect-"));
  const endpoint = await listen((req, res) => {
    if (req.url === "/api/bootstrap") { res.setHeader("set-cookie", "ghostops-admin=fixture; HttpOnly"); res.end(JSON.stringify({ csrf: "fixture" })); }
    else { res.writeHead(200, { "content-type": "application/zip", "content-length": "5000" }); res.write("PK-partial"); setTimeout(() => res.destroy(), 20); }
  });
  const output = join(directory, "original.zip");
  await expect(execute(process.execPath, ["--import", "tsx", "scripts/evidence-export.ts", "--incident", randomUUID(), "--output", output], { env: { ...process.env, GHOSTOPS_URL: endpoint }, timeout: 10000 })).rejects.toMatchObject({ code: 1 });
  await expect(access(output)).rejects.toThrow();
  expect(await readFile("scripts/evidence-export.ts", "utf8")).toContain('flag: "wx"');
});
