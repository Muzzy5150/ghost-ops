import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFileSync } from "node:child_process";
import { afterAll } from "vitest";
const directory = mkdtempSync(join(tmpdir(), "ghostops-test-"));
process.env.DATABASE_URL = `file:${join(directory, "test.db")}`;
process.env.GHOSTOPS_RUNTIME_WORKSPACE = join(directory, "workspace");
process.env.GHOSTOPS_SIGNING_SECRET = "isolated-vitest-signing-key-not-a-production-secret";
execFileSync(process.execPath, ["node_modules/prisma/build/index.js", "migrate", "deploy"], { env: process.env, stdio: "pipe" });
afterAll(async () => {
  const { db } = await import("../src/server/db");
  await db.$disconnect();
  rmSync(directory, { recursive: true });
});
