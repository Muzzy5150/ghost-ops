import assert from "node:assert/strict";
import { spawn, execFileSync, type ChildProcess } from "node:child_process";
import { createServer } from "node:net";
import { createRequire } from "node:module";
import { mkdtemp, readFile, rm, mkdir, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { setTimeout as delay } from "node:timers/promises";
import { backupPresenter, verifyPresenterBackup } from "../src/runtime/presenter-backup";
import { localAdmin } from "../src/runtime/client";
import { releasePreflight } from "../src/runtime/release-preflight";
import { releaseId } from "../src/lib/release";
const args = process.argv.slice(2); if (!args.includes("--backup")) throw new Error("Provide the verified private presenter backup directory; no source state modified");
const backup = resolve(args[args.indexOf("--backup") + 1]), original = await verifyPresenterBackup(backup), directory = await mkdtemp(join(tmpdir(), "ghostops-release-upgrade-"));
type Store = { backup(path: string): Promise<unknown>; close(): void };
const Database = createRequire(import.meta.url)("better-sqlite3") as new (path: string, options: { readonly: boolean; fileMustExist: boolean }) => Store;
const reservation = createServer(); await new Promise<void>(r => reservation.listen(0, "127.0.0.1", r)); const port = (reservation.address() as { port: number }).port; await new Promise<void>(r => reservation.close(() => r()));
const endpoint = `http://127.0.0.1:${port}`; let server: ChildProcess | undefined;
const env = { ...process.env, NODE_ENV: "production" as const, DATABASE_URL: `file:${join(directory, "clone.sqlite")}`, GHOSTOPS_SIGNING_SECRET: (await readFile(join(backup, "integrity.key"), "utf8")).trim(), GHOSTOPS_URL: endpoint, GHOSTOPS_MODEL_ENABLED: "0", OPENAI_API_KEY: "" };
async function start() { server = spawn(process.execPath, ["--import", "tsx", "scripts/server.ts", "--port", String(port)], { env, stdio: "ignore" }); for (let n = 0; n < 100; n++) { if (server.exitCode !== null) throw new Error("Isolated RC server exited; retained presenter untouched"); try { return await localAdmin(endpoint); } catch { await delay(200); } } throw new Error("Isolated RC readiness timeout"); }
async function stop() { if (!server || server.exitCode !== null) return; const child = server; await new Promise<void>((r, reject) => { const timer = setTimeout(() => { child.kill("SIGKILL"); reject(new Error("Isolated shutdown timeout")); }, 10000); child.once("exit", () => { clearTimeout(timer); r(); }); child.kill("SIGTERM"); }); }
try {
  const store = new Database(join(backup, "database.sqlite"), { readonly: true, fileMustExist: true }); try { await store.backup(join(directory, "clone.sqlite")); } finally { store.close(); }
  execFileSync(process.execPath, ["node_modules/prisma/build/index.js", "migrate", "deploy"], { env, stdio: "pipe" });
  for (let restart = 0; restart < 2; restart++) {
    const headers = await start(); assert.equal((await releasePreflight({ endpoint, serverOnly: true })).ready, true);
    const response = await fetch(`${endpoint}/api/state`, { headers }); assert.equal(response.status, 200); const state = await response.json();
    assert.equal(state.stats.requests, original.tables.ToolRequest); assert.equal(state.stats.incidents, original.tables.Incident); assert.equal(state.memories.length, original.tables.MemoryVersion);
    assert(state.agents.some((a: { status: string }) => a.status === "quarantined"));
    await stop();
  }
  await start(); const upgraded = await backupPresenter({ database: join(directory, "clone.sqlite"), output: join(directory, "upgraded-backup"), endpoint, key: env.GHOSTOPS_SIGNING_SECRET });
  for (const [table, count] of Object.entries(original.tables)) if (table !== "_prisma_migrations") assert.equal(upgraded.tables[table], count, `Historical ${table} row count changed`);
  assert.equal(upgraded.invalidCurrentVersions, 0); assert.equal(upgraded.invalidHistoricalVersions, original.invalidHistoricalVersions);
  const result = { release: releaseId, migratedCloneReady: true, normalRestartReady: true, originalRowCountsPreserved: true, currentMemorySignaturesVerified: true, alteredHistoricalSnapshotsPreserved: original.invalidHistoricalVersions, originalTables: original.tables, sourceDatabaseModified: false, modelCalls: 0 };
  if (args.includes("--artifacts")) { const output = resolve(args[args.indexOf("--artifacts") + 1]); await mkdir(output, { mode: 0o700 }); await writeFile(join(output, "upgrade-verification.json"), JSON.stringify(result, null, 2), { mode: 0o600, flag: "wx" }); }
  console.log("PASS isolated presenter-backup migration, RC readiness, current memory signatures, unchanged historical table counts and normal restart. Altered historical evidence preserved; original database/key/process untouched. Model calls: 0.");
} finally { await stop(); await rm(directory, { recursive: true }); }
