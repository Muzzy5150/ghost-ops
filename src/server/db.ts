import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "@/generated/prisma/client";
const globalDb = globalThis as unknown as { ghostDb?: PrismaClient; ghostQueue?: Promise<unknown> };
export const db = globalDb.ghostDb ?? new PrismaClient({ adapter: new PrismaBetterSqlite3({ url: process.env.DATABASE_URL ?? "file:./prisma/ghostops.db" }) });
globalDb.ghostDb = db;

// Single local process: serialize mutations so simulation, reset, and response cannot interleave.
// Each command also uses a database transaction; persistence idempotency survives restarts.
export function serialized<T>(work: () => Promise<T>): Promise<T> {
  const next = (globalDb.ghostQueue ?? Promise.resolve()).then(work, work);
  globalDb.ghostQueue = next.catch(() => undefined);
  return next;
}
