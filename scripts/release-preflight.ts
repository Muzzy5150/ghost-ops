import { releasePreflight } from "../src/runtime/release-preflight";
try {
  const args = process.argv.slice(2), index = args.indexOf("--credential-file");
  const result = await releasePreflight({ credentialFile: index >= 0 ? args[index + 1] : undefined, serverOnly: args.includes("--server-only") });
  console.log(JSON.stringify(result, null, 2)); if (!result.ready) process.exitCode = 1;
} catch { console.error("Preflight failed safely: use a loopback origin and private identity file; no secrets printed."); process.exitCode = 1; }
