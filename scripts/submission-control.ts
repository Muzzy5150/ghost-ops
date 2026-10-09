/** Operator presentation controls: scripted probes, actual authenticated MCP effects. */
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { constants } from "node:fs";
import { mkdir, open, writeFile } from "node:fs/promises";
import { resolve, join } from "node:path";
import { z } from "zod";
import { localAdmin, localBase, LocalAgentClient } from "../src/runtime/client";
import { runtimeIdentitySchema } from "../src/lib/runtime-contract";
import { verifyEvidence } from "../src/lib/evidence-verification";
import { evidenceZip, readEvidenceZip } from "../src/lib/evidence-zip";
import { mac, secureEqual } from "../src/server/config";

const args=process.argv.slice(2),value=(flag:string)=>{const i=args.indexOf(flag);return i<0?undefined:args[i+1];};
assert(args.length%2===0&&args.every((v,i)=>i%2===1||["--step","--run","--identity"].includes(v)),"Only documented flags are supported");
const step=z.enum(["approved","denied","contain","export"]).parse(value("--step"));
const runId=z.string().uuid().parse(value("--run")),base=localBase();
const identityFile=resolve(value("--identity")??".ghostops/submission-restored-agent.json");
const file=await open(identityFile,constants.O_RDONLY|constants.O_NOFOLLOW);
let identity:z.infer<typeof runtimeIdentitySchema>;
try{const stat=await file.stat();if(!stat.isFile()||stat.mode&0o077||stat.size>10000)throw Error("Private identity file required");identity=runtimeIdentitySchema.parse(JSON.parse(await file.readFile("utf8")));}finally{await file.close();}
const headers=await localAdmin(base),get=async(path:string)=>{const r=await fetch(base+path,{headers,redirect:"error",signal:AbortSignal.timeout(15000)});assert(r.ok,"Authenticated local read denied");return r.json();};
const run=(await get("/api/sentinel")).runs.find((r:{id:string})=>r.id===runId);
assert(run&&run.agentIds.includes(identity.actorId),"Identity must belong to the owned investigation");
assert.notEqual(run.status,"running","Finish inference before presentation probes");
const output=resolve(".ghostops/presentation",`${new Date().toISOString().replaceAll(':','-')}-${step}-${randomUUID().slice(0,8)}`);
await mkdir(output,{recursive:true,mode:0o700});
const rawCall=async(name:string,resource:string,content?:string)=>{
 const r=await fetch(base+"/api/mcp",{method:"POST",redirect:"error",signal:AbortSignal.timeout(30000),headers:{"content-type":"application/json",accept:"application/json, text/event-stream",authorization:`Bearer ${identity.credential}`,"x-ghostops-agent":identity.actorId,"x-ghostops-session":identity.sessionId},body:JSON.stringify({jsonrpc:"2.0",id:1,method:"tools/call",params:{name,arguments:{requestId:randomUUID(),resource,...(content?{content}:{})}}})});
 assert(r.ok,"MCP transport rejected");const d=(await r.json()).result.structuredContent;
 return z.object({requestId:z.string().uuid(),allowed:z.boolean(),reason:z.string(),incidentId:z.string().uuid().nullable()}).parse(d);
};
const decisions=[];
if(step==="approved"){
 const c=new LocalAgentClient(identity,base);try{await c.connect();const d=await c.call("read_memory","memory/runtime-policy");assert(d.allowed,"Approved policy read failed");decisions.push({requestId:d.requestId,allowed:d.allowed,reason:d.reason,incidentId:d.incidentId});}finally{await c.close();}
}
if(step==="denied"){
 const memory=await rawCall("write_memory","memory/runtime-policy","Controlled presentation probe: an agent cannot change protected policy.");
 assert.equal(memory.reason,"PROTECTED_MEMORY_WRITE_REQUIRES_ADMIN");assert(!memory.allowed);
 const admin=await rawCall("restricted_admin","decoy/admin");assert.equal(admin.reason,"TOOL_NOT_PERMITTED");assert(!admin.allowed);decisions.push(memory,admin);
}
if(step==="contain"){
 const r=await fetch(base+"/api/control",{method:"POST",headers,redirect:"error",signal:AbortSignal.timeout(15000),body:JSON.stringify({commandId:randomUUID(),action:"quarantine",targetId:identity.actorId})});assert(r.ok,"Scoped operator quarantine rejected");
 const denied=await rawCall("read_memory","memory/runtime-policy");assert.equal(denied.reason,"AGENT_QUARANTINED");assert(!denied.allowed);decisions.push(denied);
}
if(step==="denied"||step==="contain"){
 const state=await get("/api/state");for(const d of decisions){const r=state.runtimeRequests.find((r:{id:string})=>r.id===d.requestId);assert(r,"Persisted denial missing");assert.equal(r.execution,null,"Denied handler ran");}
}
let forensic;
if(step==="export"){
 const r=await fetch(base+`/api/evidence/sentinel/${runId}`,{headers,redirect:"error",signal:AbortSignal.timeout(15000)});assert(r.ok,"Forensic export rejected");
 const bytes=Buffer.from(await r.arrayBuffer()),verify=(b:Buffer)=>verifyEvidence(b,(text,tag)=>secureEqual(mac(`ghostops-evidence:v1:${text}`),tag));
 const original=verify(bytes);assert(original.authenticated);
 const entries=readEvidenceZip(bytes);entries["summary.html"]=Buffer.from("Explicit isolated tamper test");const altered=evidenceZip(entries);assert.throws(()=>verify(altered));
 await writeFile(join(output,"evidence.zip"),bytes,{mode:0o600,flag:"wx"});await writeFile(join(output,"altered.zip"),altered,{mode:0o600,flag:"wx"});forensic={...original,tamperRejected:true};
}
const receipt={step,investigationId:runId,actorId:identity.actorId,sessionId:identity.sessionId,at:new Date().toISOString(),decisions,forensic,output,provenance:"actual-local-runtime",choiceSource:"explicit-operator-script; not a model decision",deniedHandlersExecuted:0};
await writeFile(join(output,"receipt.json"),JSON.stringify(receipt,null,2),{mode:0o600,flag:"wx"});console.log(JSON.stringify(receipt,null,2));
