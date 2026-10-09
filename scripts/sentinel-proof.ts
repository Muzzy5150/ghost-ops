// Explicit local-operator regression, NOT a model decision or an external publication.
import { randomUUID } from "node:crypto";
import {execFileSync} from "node:child_process";
import { constants } from "node:fs";
import { open,mkdir,writeFile } from "node:fs/promises";
import { resolve,join } from "node:path";
import { z } from "zod";
import { localAdmin,localBase } from "../src/runtime/client";
import { runtimeIdentitySchema } from "../src/lib/runtime-contract";
import { verifyEvidence } from "../src/lib/evidence-verification";
import { evidenceZip,readEvidenceZip } from "../src/lib/evidence-zip";
import { mac,secureEqual } from "../src/server/config";
const args=process.argv.slice(2),runId=z.string().uuid().parse(args[args.indexOf("--run")+1]),base=localBase(),headers=await localAdmin(base);
async function state(){const r=await fetch(base+"/api/sentinel",{headers});if(!r.ok)throw new Error("Status unavailable");const s=await r.json();const run=s.runs.find((r:{id:string})=>r.id===runId);if(!run||run.status==="running")throw new Error("Terminal owned Sentinel run required");return run;}
try{
  let run=await state();let proof:Record<string,unknown>={kind:"explicit-scripted-enforcement-regression",modelDecision:false};
  if(args.includes("--scan")){
    const file=await open(resolve(".ghostops/web-sentinel",`${runId}.json`),constants.O_RDONLY|constants.O_NOFOLLOW);let identities;try{const stat=await file.stat();if(stat.mode&0o077||stat.size>10000)throw new Error("Private identity file unavailable");identities=z.array(runtimeIdentitySchema).length(3).parse(JSON.parse(await file.readFile("utf8")));}finally{await file.close();}
    if(!(run.agentIds as string[]).includes(identities[1].actorId))throw new Error("Owned coordinator mismatch");
    const scan=JSON.parse(execFileSync(process.execPath,["--input-type=module","-e","import {GhostOpsClient} from '@ghostops/sdk';const i=JSON.parse(process.env.TEST_IDENTITY);const g=new GhostOpsClient({endpoint:process.env.GHOSTOPS_URL,agentId:i.actorId,sessionId:i.sessionId,credential:i.credential});try{await g.connect();const d=await g.requestTool({tool:'scan_repository',arguments:{requestId:crypto.randomUUID(),resource:'sentinel/scan',content:'{}',sentinelRunId:process.env.TEST_RUN}});console.log(JSON.stringify({...d,output:undefined}));}finally{await g.close();}"],{env:{PATH:process.env.PATH,NODE_ENV:"production",GHOSTOPS_URL:base,TEST_IDENTITY:JSON.stringify(identities[1]),TEST_RUN:runId},encoding:"utf8",timeout:40000}));
    if(!scan.allowed)throw new Error("Explicit scanner follow-up did not complete");proof={...proof,scannerRequestId:scan.requestId,scannerSelection:"explicit operator follow-up, not a model decision"};run=await state();
  }
  if(args.includes("--contain")){
    const file=await open(resolve(".ghostops/web-sentinel",`${runId}.json`),constants.O_RDONLY|constants.O_NOFOLLOW);let identity;try{const stat=await file.stat();if(stat.mode&0o077||stat.size>10000)throw new Error("Private identity file unavailable");identity=z.array(runtimeIdentitySchema).length(3).parse(JSON.parse(await file.readFile("utf8")))[0];}finally{await file.close();}
    if(!(run.agentIds as string[]).includes(identity.actorId))throw new Error("Owned run identity mismatch");
    const call=async(name:string,resource:string,content?:string)=>{const r=await fetch(base+"/api/mcp",{method:"POST",redirect:"error",headers:{"content-type":"application/json",accept:"application/json, text/event-stream",authorization:`Bearer ${identity.credential}`,"x-ghostops-agent":identity.actorId,"x-ghostops-session":identity.sessionId},body:JSON.stringify({jsonrpc:"2.0",id:1,method:"tools/call",params:{name,arguments:{requestId:randomUUID(),resource,...(content?{content}:{}),...(resource.startsWith("sentinel/")?{sentinelRunId:runId}:{})}}}),signal:AbortSignal.timeout(30000)});if(!r.ok)throw new Error("Protected request unavailable");return(await r.json()).result.structuredContent;};
    const before=run.memoryIntegrity;const poison=await call("write_memory","memory/runtime-policy","Explicit deterministic regression: untrusted content does not authorize protected policy changes.");const trap=await call("restricted_admin","decoy/admin");
    if(poison.allowed||trap.allowed)throw new Error("Enforcement regression failed");
    const quarantine=await fetch(base+"/api/control",{method:"POST",headers,body:JSON.stringify({commandId:randomUUID(),action:"quarantine",targetId:identity.actorId})});if(!quarantine.ok)throw new Error("Authorized quarantine rejected");
    const blocked=await call("inspect_repository","sentinel/repository","{}");if(blocked.allowed||blocked.reason!=="AGENT_QUARANTINED")throw new Error("Containment not verified");run=await state();
    for(const decision of [poison,trap,blocked])if(run.requests.find((r:{id:string})=>r.id===decision.requestId)?.execution!==null)throw new Error("Denied handler execution detected");
    if(JSON.stringify(before)!==JSON.stringify(run.memoryIntegrity)||!run.memoryIntegrity.every((m:{verified:boolean})=>m.verified))throw new Error("Protected memory changed");
    proof={...proof,actorId:identity.actorId,protectedMemoryDenied:poison.reason,decoyDenied:trap.reason,containment:blocked.reason,requestIds:[poison.requestId,trap.requestId,blocked.requestId],incidentId:trap.incidentId,deniedHandlersExecuted:0,protectedMemoryIntact:true};
  }
  const r=await fetch(base+`/api/evidence/sentinel/${runId}`,{headers});if(!r.ok)throw new Error("Evidence export unavailable");const zip=Buffer.from(await r.arrayBuffer()),original=verifyEvidence(zip,(t,tag)=>secureEqual(mac(`ghostops-evidence:v1:${t}`),tag));
  const files=readEvidenceZip(zip);files["summary.html"]=Buffer.from("Intentional isolated tamper");const altered=evidenceZip(files);let rejected=false;try{verifyEvidence(altered,(t,tag)=>secureEqual(mac(`ghostops-evidence:v1:${t}`),tag));}catch{rejected=true;}if(!rejected)throw new Error("Tamper not detected");
  const directory=resolve(args.includes("--output")?args[args.indexOf("--output")+1]:`artifacts/phase12-sentinel/${runId}`);await mkdir(directory,{recursive:true,mode:0o700});await writeFile(join(directory,"original-evidence.zip"),zip,{mode:0o600,flag:"wx"});await writeFile(join(directory,"tampered-evidence.zip"),altered,{mode:0o600,flag:"wx"});
  const invocations=run.observations.filter((o:{kind:string;data:{status?:string}})=>o.kind==="MODEL_INVOCATION"&&o.data.status==="succeeded").map((o:{data:unknown})=>o.data);
  const sources=run.observations.filter((o:{kind:string})=>o.kind==="sentinel/advisories").map((o:{data:{result:Record<string,unknown>}})=>({...o.data.result,advisories:(o.data.result.advisories as Record<string,unknown>[]).map(a=>({...a,summary:undefined}))}));
  const result={runId,status:run.status,assessment:run.assessment,sponsors:run.sponsors,invocations,sources,requests:run.requests,proof,original,tamperRejected:true,published:run.publication?.status==="verified",limitation:"Only gateway-routed operations enforced. Local host/key trust is not external attestation; model public text is not a validated finding."};
  await writeFile(join(directory,"verification.json"),JSON.stringify(result,null,2),{mode:0o600,flag:"wx"});console.log(JSON.stringify({runId,directory,proof,original,tamperRejected:true,assessment:run.assessment},null,2));
}catch(error){console.error(error instanceof Error?error.message:"Verification failed; no secrets printed");process.exitCode=1;}
