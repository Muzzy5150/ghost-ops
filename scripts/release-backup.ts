import { randomUUID } from "node:crypto";
import { resolve } from "node:path";
import { backupPresenter, verifyPresenterBackup } from "../src/runtime/presenter-backup";
const args = process.argv.slice(2), value = (name: string, fallback?: string) => args.includes(name) ? args[args.indexOf(name) + 1] : fallback;
try {
  if (args.includes("--verify")) console.log(JSON.stringify(await verifyPresenterBackup(resolve(value("--verify")!)), null, 2));
  else {
    if (!args.includes("--database")) throw new Error("Identify the actual presenter database first");
    console.log(JSON.stringify(await backupPresenter({ database: value("--database")!, output: value("--output", `.ghostops/backups/rc-${randomUUID()}`)!, keyFile: value("--key-file"), key: process.env.GHOSTOPS_SIGNING_SECRET }), null, 2));
  }
} catch { console.error("Backup failed safely: check actual DB path, matching active key, private files and a new output directory. Never replace the key; partial private backups are not usable until verification passes. No secrets printed or source migration performed."); process.exitCode = 1; }
