import { execFile } from "node:child_process";
import {createHash} from "node:crypto";
import { constants } from "node:fs";
import { lstat, readdir, realpath, mkdtemp, mkdir, writeFile, rm, open } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve, relative, dirname } from "node:path";
import { z } from "zod";
import { db, serialized } from "./db";
import { hash } from "./memory";
import { recordEvent } from "./investigation";
import { ConflictError, CapacityError } from "./gateway";
import type { SponsorAction } from "@/lib/sponsor-contract";
import type { Prisma } from "@/generated/prisma/client";

export function scannerExecutable(env:Record<string,string|undefined>=process.env) { return env.GHOSTOPS_SEMGREP_BINARY ?? resolve(/* turbopackIgnore: true */ ".ghostops/semgrep-venv/bin/semgrep"); }
/** Explicit executable argv, no shell, no inherited credentials/proxy/trace settings. */
export function scannerProcess(args: string[], cwd: string) {
  const env: NodeJS.ProcessEnv = { NODE_ENV: "production", PATH: process.env.PATH, LANG: "en_US.UTF-8", HOME: cwd, SEMGREP_SEND_METRICS: "off", SEMGREP_ENABLE_VERSION_CHECK: "0", OTEL_SDK_DISABLED: "true", DO_NOT_TRACK: "1" };
  return new Promise<string>((success, failure) => execFile(scannerExecutable(), args, { cwd, env, timeout: 30000, killSignal: "SIGKILL", maxBuffer: 1024 * 1024, encoding: "utf8" }, (error, stdout) => error ? failure(new Error("Scanner unavailable, failed, timed out or exceeded output limit; details omitted")) : success(stdout)));
}
const resultSchema = z.object({ version: z.string().min(1).max(80), errors: z.array(z.unknown()).max(1000), results: z.array(z.object({ check_id: z.string().min(1).max(200), path: z.string().max(500), start: z.object({line:z.number().int().positive()}), end:z.object({line:z.number().int().positive()}), extra:z.object({severity:z.enum(["INFO","WARNING","ERROR"])}) })).max(1000), paths:z.object({scanned:z.array(z.string()).max(100)}) });
export type CodeFinding = { fingerprint:string; rule:string; file:string; startLine:number; endLine:number; severity:string; fileHash:string };
export function ingestScanner(output: unknown, files: {path:string;hash:string}[]) {
  const parsed = resultSchema.parse(output);
  if (parsed.errors.length || parsed.paths.scanned.length !== files.length || !files.every(f => parsed.paths.scanned.includes(f.path))) throw new Error("Incomplete scanner coverage; no clean result claimed");
  const findings = parsed.results.map(r => {
    const file = files.find(f => f.path === r.path);
    if (!file || r.path.startsWith("/") || r.path.split("/").includes("..") || !/^ghostops\./.test(r.check_id)) throw new Error("Scanner returned an unapproved rule/path");
    return { fingerprint:hash(JSON.stringify([r.check_id,r.path,r.start.line,r.end.line])),rule:r.check_id,file:r.path,startLine:r.start.line,endLine:r.end.line,severity:r.extra.severity,fileHash:file.hash };
  });
  return { version:parsed.version, findings:[...new Map(findings.map(f=>[f.fingerprint,f])).values()] };
}
export function compareScans(previous: CodeFinding[], current: CodeFinding[]) {
  const prior=new Set(previous.map(f=>f.fingerprint)), next=new Set(current.map(f=>f.fingerprint));
  return { added:current.filter(f=>!prior.has(f.fingerprint)).map(f=>f.fingerprint), retained:current.filter(f=>prior.has(f.fingerprint)).map(f=>f.fingerprint), noLongerReported:previous.filter(f=>!next.has(f.fingerprint)).map(f=>f.fingerprint), limitation:"Absent in this complete scan is not proof of a verified remediation or absence of other vulnerabilities" };
}
async function safeBytes(path: string) {
  const file = await open(path, constants.O_RDONLY | constants.O_NOFOLLOW);
  try { const stat=await file.stat(); if (!stat.isFile() || stat.size>65536) throw new Error("Unsupported or oversized scan file"); return await file.readFile(); } finally { await file.close(); }
}
export async function scanCode(input: SponsorAction) {
  const directory = await mkdtemp(join(tmpdir(),"ghostops-scan-"));
  await mkdir(join(directory,"source"));
  const files:{path:string;hash:string}[]=[];
  let totalBytes=0;
  let commit:string|null=null;
  let linked: {id:string;actorId:string;sessionId:string;incidentId:string|null}|null=null;
  try {
    const copy = async (source:string,name:string) => { const bytes=await safeBytes(source);totalBytes+=bytes.length; if(files.length>=50 || totalBytes>1048576) throw new CapacityError("Scan target capacity exceeded"); const path=`source/${name}`; files.push({path,hash:createHash("sha256").update(bytes).digest("hex")}); await mkdir(join(directory,dirname(path)),{recursive:true}); await writeFile(join(directory,path),bytes,{mode:0o600}); };
    if(input.target === "runtime-artifact") {
      const request=await db.toolRequest.findUnique({where:{id:input.requestId!}});
      const execution=request?.execution as Prisma.JsonObject|null;
      if(!request?.identityVerified || request.simulated || !request.allowed || request.resource!=="research/summary" || execution?.handler!=="restricted-workspace-write" || typeof execution.artifact!=="string" || !/^[a-f0-9]{64}\.txt$/.test(execution.artifact)) throw new ConflictError("A verified permitted runtime artifact is required");
      const root=resolve(/* turbopackIgnore: true */ process.env.GHOSTOPS_RUNTIME_WORKSPACE??".ghostops/runtime-workspace"); if((await lstat(root)).isSymbolicLink()) throw new Error("Unsafe runtime workspace");
      await copy(join(root,execution.artifact),"artifact.ts"); if(files[0].hash!==execution.contentHash) throw new ConflictError("Artifact changed; cannot establish agent provenance");
      linked={id:request.id,actorId:request.actorId,sessionId:request.sessionId,incidentId:((request.result as Prisma.JsonObject)?.incidentId as string|null)??null};
    } else {
      const root=resolve(/* turbopackIgnore: true */ input.target==="approved-repository" ? process.env.GHOSTOPS_SCAN_TARGET_ROOT??"" : `fixtures/security/${input.target}`);
      if(input.target==="approved-repository" && !process.env.GHOSTOPS_SCAN_TARGET_ROOT) throw new ConflictError("Operator-approved repository root is not configured");
      if((await lstat(root)).isSymbolicLink() || !((await lstat(root)).isDirectory())) throw new Error("Unsafe scan root");
      const physical=await realpath(root);
      commit=await new Promise<string|null>(done=>execFile("git",["rev-parse","HEAD"],{cwd:physical,timeout:3000,maxBuffer:256,encoding:"utf8",env:{PATH:process.env.PATH,NODE_ENV:"production"}},(error,stdout)=>done(!error&&/^[a-f0-9]{40,64}$/.test(stdout.trim())?stdout.trim():null)));
      const walk=async(path:string,depth:number) => { if(depth>4) throw new CapacityError("Scan depth exceeded"); for(const entry of await readdir(path,{withFileTypes:true})) { if([".git","node_modules",".ghostops"].includes(entry.name)) continue; if(entry.isSymbolicLink()) throw new Error("Symlink scan targets are forbidden"); const p=join(path,entry.name); if(entry.isDirectory()) await walk(p,depth+1); else if(/\.(ts|js|tsx|jsx)$/.test(entry.name)) { if((await realpath(p)).startsWith(physical+"/")) await copy(p,relative(physical,p)); else throw new Error("Scan target escaped root"); } } };
      await walk(root,0);
    }
    if(!files.length) throw new Error("No supported files; no scan claimed");
    const rule=await safeBytes(resolve(/* turbopackIgnore: true */ "fixtures/security/rules.yml")); await writeFile(join(directory,"rules.yml"),rule,{mode:0o600});
    const output=await scannerProcess(["scan","--oss-only","--config","rules.yml","--json","--metrics=off","--disable-version-check","--no-autofix","--no-secrets-validation","--no-rewrite-rule-ids","--no-git-ignore","--strict","--jobs=1","--timeout=3","--max-memory=256","--max-target-bytes=65536","source"],directory);
    const scanned=ingestScanner(JSON.parse(output),files);
    return await serialized(()=>db.$transaction(async tx=>{
      if(await tx.codeScan.count()>=2000) throw new CapacityError("Code scan capacity reached");
      // Both built-in versions are one approved synthetic comparison lineage.
      const target=["vulnerable","corrected"].includes(input.target!)?"synthetic-eval":input.target==="runtime-artifact"?`artifact:${linked!.actorId}`:"approved-repository";
      const previous=await tx.codeScan.findFirst({where:{target},orderBy:{createdAt:"desc"}});
      const scan=await tx.codeScan.create({data:{id:input.commandId,target,scannerVersion:scanned.version,ruleHash:hash(rule.toString()),files,findings:scanned.findings,comparison:compareScans((previous?.findings??[]) as CodeFinding[],scanned.findings),requestId:linked?.id,commit}});
      if(linked) { const event=await recordEvent(tx,{actorId:linked.actorId,sessionId:linked.sessionId,requestId:linked.id,identityVerified:true,simulated:false,module:"CodeSecurity",kind:"CODE_SCAN_OBSERVED",severity:"info",message:"Actual scanner inspected the exact hash of a permitted agent artifact. Code patterns do not prove compromise or execution.",details:{scanId:scan.id,ruleHash:scan.ruleHash,findingCount:scanned.findings.length,contentHash:files[0].hash}}); if(linked.incidentId) await tx.securityEvent.update({where:{id:event.id},data:{incidentId:linked.incidentId}}); }
      return {scanId:scan.id,target,scannerVersion:scan.scannerVersion,files:scan.files,findings:scan.findings,comparison:scan.comparison,requestId:scan.requestId,commit,commitMeaning:"Checkout HEAD only; exact file hashes describe scanned bytes, including uncommitted changes",provenance:"actual-local-scanner"};
    }));
  } finally { await rm(directory,{recursive:true,force:true}); }
}
