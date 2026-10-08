import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, existsSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { resolve, join } from "node:path";
// Consistent read-only backup; no signing secret is read or copied and no source migration runs.
type Store = { prepare: (sql: string) => { all: () => Record<string, unknown>[] }; backup: (path: string) => Promise<unknown>; close: () => void };
const Database = createRequire(import.meta.url)("better-sqlite3") as new (file: string, options?: { readonly: boolean; fileMustExist: boolean }) => Store;
const source = resolve(process.env.GHOSTOPS_MIGRATION_SOURCE ?? "prisma/ghostops.db");
if (!existsSync(source)) throw new Error("Explicit migration source SQLite file is missing; no user state changed");
const directory = mkdtempSync(join(tmpdir(), "ghostops-lab-migration-")), clonePath = join(directory, "clone.db");
const original = new Database(source, { readonly: true, fileMustExist: true });
try { await original.backup(clonePath); } finally { original.close(); }
const digest = (rows: unknown) => createHash("sha256").update(JSON.stringify(rows)).digest("hex");
function fingerprints(previous?: Record<string, { columns: string[]; hash: string }>) {
  const store = new Database(clonePath, { readonly: true, fileMustExist: true });
  try {
    const names = store.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name != '_prisma_migrations' ORDER BY name").all().map(r => String(r.name));
    return Object.fromEntries(names.map(name => { assert(/^[a-zA-Z_]+$/.test(name)); const columns = previous?.[name]?.columns ?? store.prepare(`PRAGMA table_info("${name}")`).all().map(c => String(c.name)); assert(columns.every(c => /^[a-zA-Z_]+$/.test(c))); return [name, { columns, hash: digest(store.prepare(`SELECT ${columns.map(c => `"${c}"`).join(",")} FROM "${name}" ORDER BY rowid`).all()) }]; }));
  } finally { store.close(); }
}
try {
  const before = fingerprints();
  execFileSync(process.execPath, ["node_modules/prisma/build/index.js", "migrate", "deploy"], { env: { ...process.env, DATABASE_URL: `file:${clonePath}` }, stdio: "pipe" });
  const after = fingerprints(before);
  for (const [table, record] of Object.entries(before)) assert.equal(after[table].hash, record.hash, `${table} original records altered by migration`);
  for (const table of ["ExperimentRun", "ExperimentObservation", "ModelInvocation"]) assert(table in after);
  console.log(`PASS additive migration on a consistent clone: all ${Object.keys(before).length} existing table payloads unchanged. Source database was read-only; no key accessed.`);
} finally { rmSync(directory, { recursive: true }); }
