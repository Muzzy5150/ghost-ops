import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { lstat, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { z } from "zod";
import { localAdmin, localBase } from "./client";
import { releaseId } from "@/lib/release";
const execute = promisify(execFile);
export async function releasePreflight(options: { endpoint?: string; credentialFile?: string; serverOnly?: boolean } = {}) {
  const endpoint = localBase(options.endpoint), checks: { check: string; pass: boolean; status: "pass" | "fail" | "unverified"; recovery: string }[] = [];
  const check = (name: string, pass: boolean | undefined, recovery: string) => checks.push({ check: name, pass: pass === true, status: pass === undefined ? "unverified" : pass ? "pass" : "fail", recovery: pass === undefined ? "Serving release probe unavailable: resolve the version check first; do not infer damaged database/key/fixtures or reset them." : pass ? "none" : recovery });
  let headers: Record<string, string> | undefined;
  try { headers = await localAdmin(endpoint); check("loopback-administration", true, ""); }
  catch { check("loopback-administration", false, "Start the server normally on the configured port; do not kill a retained presenter."); }
  let health: { release: string; ready: boolean; database: { available: boolean; externalSchema: boolean }; integrity: { configured: boolean; invalidCurrentVersions: number }; fixtures: { syntheticDocumentsAndDecoys: boolean }; evidence: { exportSupported: boolean } } | undefined;
  if (headers) try {
    const response = await fetch(`${endpoint}/api/release`, { headers, redirect: "error", signal: AbortSignal.timeout(5000) });
    if (!response.ok) throw new Error();
    health = z.object({ release: z.string(), ready: z.boolean(), database: z.object({ available: z.boolean(), externalSchema: z.boolean() }), integrity: z.object({ configured: z.boolean(), invalidCurrentVersions: z.number().int().nonnegative() }), fixtures: z.object({ syntheticDocumentsAndDecoys: z.boolean() }), evidence: z.object({ exportSupported: z.boolean() }) }).parse(await response.json());
  } catch { /* Old/missing probe is an explicit failure, never guessed readiness. */ }
  check("built-release-version", health?.release === releaseId, "Server is old/unverified. Back up DB + matching key, obtain approval, then activate the verified RC; do not rebuild the running presenter's directory.");
  check("database-schema", health ? health.database.available && health.database.externalSchema : undefined, "Run nondestructive migrations after a consistent backup; first test the isolated copy.");
  check("signing-key-and-current-memory", health ? health.integrity.configured && health.integrity.invalidCurrentVersions === 0 : undefined, "Recover the matching signing key or verify/restore affected current snapshots; never replace the key to clear a failure.");
  check("synthetic-fixtures", health?.fixtures.syntheticDocumentsAndDecoys, "Initialize only a fresh disposable checkout. Do not reset historical records.");
  check("evidence-export-capability", health ? health.evidence.exportSupported && health.ready : undefined, "Resolve version/database/integrity/fixture failures; completed-case export still requires local administration.");
  let built = true;
  for (const file of ["packages/ghostops-sdk/dist/index.js", "packages/ghostops-sdk/dist/index.d.ts", "packages/ghostops-mcp/dist/cli.js", "examples/external-agent/dist/main.js"]) try { await lstat(resolve(file)); } catch { built = false; }
  check("sdk-proxy-example-build", built, "Run npm ci and npm run sdk:build in the RC checkout; no registry publication is needed.");
  if (!options.serverOnly) {
    let identityValid = false, proxyValid = false;
    try {
      if (!options.credentialFile) throw new Error();
      const stat = await lstat(options.credentialFile); if (!stat.isFile() || stat.isSymbolicLink() || stat.mode & 0o077 || stat.size > 16384) throw new Error();
      const identity = z.object({ actorId: z.string().regex(/^live-[a-zA-Z0-9_-]{1,48}$/), sessionId: z.string().uuid(), credential: z.string().regex(/^[a-f0-9]{64}$/) }).strict().parse(JSON.parse(await readFile(options.credentialFile, "utf8")));
      if (!headers || !health?.ready || health.release !== releaseId) throw new Error();
      const response = await fetch(`${endpoint}/api/state`, { headers, signal: AbortSignal.timeout(5000), redirect: "error" }); if (!response.ok) throw new Error();
      const state = await response.json();
      identityValid = state.agents.some((a: { id: string; status: string; integrationType: string }) => a.id === identity.actorId && a.status === "active" && a.integrationType === "external-node") && state.sessions.some((s: { id: string; agentId: string; active: boolean }) => s.id === identity.sessionId && s.agentId === identity.actorId && s.active);
      if (identityValid && built) {
        const output = await execute(process.execPath, [resolve("examples/external-agent/dist/main.js"), "--credential-file", resolve(options.credentialFile), "--action", "check"], { env: { PATH: process.env.PATH, NODE_ENV: "production", GHOSTOPS_URL: endpoint }, timeout: 15000, maxBuffer: 65536 });
        const connected = JSON.parse(output.stdout); const tools = connected.capabilities.tools.map((t: { name: string }) => t.name);
        proxyValid = connected.agentId === identity.actorId && connected.modelCalls === 0 && tools.includes("read_document") && tools.includes("write_summary");
      }
    } catch { /* Never print raw child diagnostics or private configuration. */ }
    check("fresh-restricted-demo-identity", identityValid, "Provision a new research integration with release:demo -- --prepare, or explicitly restore/rotate to a new private file; do not reuse revoked credentials.");
    check("real-stdio-discovery", proxyValid, "Check current credentials/grants and compiled public package links. This demo requires research read/summary grants; no fallback executor.");
  }
  return { release: releaseId, observedRelease: health?.release ?? "unverified/older server", ready: checks.every(c => c.pass), mode: options.serverOnly ? "server-only; identity not checked" : "external-demo", modelCalls: 0, checks };
}
