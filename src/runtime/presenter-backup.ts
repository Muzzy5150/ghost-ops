import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { chmod, lstat, mkdir, readFile, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { dirname, join, resolve } from "node:path";
import { z } from "zod";
import { memoryPayload } from "@/lib/memory-payload";
import { localBase } from "./client";
type Store = { prepare(sql: string): { all(): Record<string, unknown>[] }; backup(path: string): Promise<unknown>; close(): void };
const Database = createRequire(import.meta.url)("better-sqlite3") as new (path: string, options: { readonly: boolean; fileMustExist: boolean }) => Store;
const digest = (input: string | Buffer) => createHash("sha256").update(input).digest("hex");
const equal = (a: string, b: string) => a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b));
const manifestSchema = z.object({ formatVersion: z.literal(1), createdAt: z.string().datetime(), source: z.string(), databaseSha256: z.string().regex(/^[a-f0-9]{64}$/), keySource: z.enum(["explicit-environment", "private-file"]), authenticatedPresenterKey: z.literal(true), tables: z.record(z.string(), z.number().int().nonnegative()) }).strict();
async function privateFile(path: string, maximum: number) { const stat = await lstat(path); if (!stat.isFile() || stat.isSymbolicLink() || stat.mode & 0o077 || stat.size > maximum || process.getuid && stat.uid !== process.getuid()) throw new Error("Private regular file required"); return readFile(path); }
function inspectDatabase(path: string, key: string) {
  const store = new Database(path, { readonly: true, fileMustExist: true });
  try {
    if (store.prepare("PRAGMA quick_check").all().some(row => row.quick_check !== "ok")) throw new Error("SQLite integrity failed");
    const names = store.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'").all().map(row => String(row.name));
    const tables = Object.fromEntries(names.map(name => { if (!/^[a-zA-Z_]+$/.test(name)) throw new Error("Unsupported table name"); return [name, Number(store.prepare(`SELECT count(*) AS n FROM "${name}"`).all()[0].n)]; }));
    const memories = store.prepare('SELECT * FROM "MemoryVersion" ORDER BY version DESC').all(); if (memories.length > 1000) throw new Error("Memory verification limit");
    const valid = (row: Record<string, unknown>) => {
      const memory = { ...row, protected: Boolean(row.protected), createdAt: new Date(row.createdAt as string | number) } as unknown as Parameters<typeof memoryPayload>[0];
      return digest(String(row.content)) === row.contentHash && equal(String(row.signature), createHmac("sha256", key).update(`memory:${memoryPayload(memory)}`).digest("hex"));
    };
    const latest = memories.filter((row, i) => memories.findIndex(m => m.ownerId === row.ownerId && m.key === row.key) === i);
    const invalidCurrent = latest.filter(row => !valid(row)).length;
    return { tables, currentVersions: latest.length, invalidCurrentVersions: invalidCurrent, invalidHistoricalVersions: memories.filter(row => !valid(row)).length };
  } finally { store.close(); }
}
export async function verifyPresenterBackup(directory: string) {
  const stat = await lstat(directory); if (!stat.isDirectory() || stat.isSymbolicLink() || stat.mode & 0o077) throw new Error("Private backup directory required");
  const manifest = manifestSchema.parse(JSON.parse((await privateFile(join(directory, "manifest.json"), 16384)).toString()));
  const database = await privateFile(join(directory, "database.sqlite"), 128 * 1024 * 1024), key = (await privateFile(join(directory, "integrity.key"), 4096)).toString().trim();
  if (key.length < 32 || digest(database) !== manifest.databaseSha256) throw new Error("Backup content/key mismatch");
  const state = inspectDatabase(join(directory, "database.sqlite"), key);
  if (JSON.stringify(state.tables) !== JSON.stringify(manifest.tables) || state.invalidCurrentVersions) throw new Error("Backup table/current memory integrity mismatch");
  return { valid: true, protectedPermissions: true, matchingKeyAndCurrentMemory: true, ...state };
}
/** Explicit trusted operator action. Never imports config or generates a new key. */
export async function backupPresenter(options: { database: string; output: string; endpoint?: string; keyFile?: string; key?: string }) {
  const endpoint = localBase(options.endpoint), source = resolve(options.database), directory = resolve(options.output);
  const key = options.key ?? (await privateFile(resolve(options.keyFile ?? ".ghostops/integrity.key"), 4096)).toString().trim();
  if (key.length < 32) throw new Error("Matching key required");
  const response = await fetch(`${endpoint}/api/bootstrap`, { redirect: "error", signal: AbortSignal.timeout(5000) });
  if (!response.ok) throw new Error("Presenter authentication unavailable");
  const cookie = response.headers.get("set-cookie")?.split(";")[0].split("=").slice(1).join("=") ?? "";
  const match = /^(\d{13}\.[a-f0-9]{32})\.([a-f0-9]{64})$/.exec(cookie);
  if (!match || Number(match[1].split(".")[0]) <= Date.now() || !equal(match[2], createHmac("sha256", key).update(`local-admin-session:v2:${match[1]}`).digest("hex"))) throw new Error("Key does not match active presenter; no backup created");
  await mkdir(dirname(directory), { recursive: true, mode: 0o700 }); await mkdir(directory, { mode: 0o700 });
  const sourceStore = new Database(source, { readonly: true, fileMustExist: true });
  try { await sourceStore.backup(join(directory, "database.sqlite")); } finally { sourceStore.close(); }
  await chmod(join(directory, "database.sqlite"), 0o600);
  await writeFile(join(directory, "integrity.key"), key, { mode: 0o600, flag: "wx" });
  const state = inspectDatabase(join(directory, "database.sqlite"), key);
  const manifest = { formatVersion: 1, createdAt: new Date().toISOString(), source, databaseSha256: digest(await readFile(join(directory, "database.sqlite"))), keySource: options.key ? "explicit-environment" : "private-file", authenticatedPresenterKey: true, tables: state.tables };
  await writeFile(join(directory, "manifest.json"), JSON.stringify(manifest, null, 2), { mode: 0o600, flag: "wx" });
  return { directory, ...await verifyPresenterBackup(directory) };
}
