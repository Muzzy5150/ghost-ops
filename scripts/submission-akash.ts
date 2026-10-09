/** Explicit operator-approved public summary verification on the existing Akash lease. */
import assert from "node:assert/strict";
import {randomUUID,createHash} from "node:crypto";
import {writeFile} from "node:fs/promises";
import {resolve} from "node:path";
import {z} from "zod";
import {canonical} from "../src/lib/canonical";
const args=process.argv.slice(2);assert.equal(args.length,2);assert.equal(args[0],"--run");const investigationId=z.string().uuid().parse(args[1]);
process.env.DATABASE_URL=`file:${resolve(".ghostops/submission.db")}`;const {db}=await import("../src/server/db");
const prior=await db.integrationRun.findMany({where:{sponsor:{in:["Guild.ai","ClickHouse"]},status:"succeeded"},orderBy:{createdAt:"desc"},take:10});
const linked=(sponsor:string)=>prior.find(r=>r.sponsor===sponsor&&typeof r.result==="object"&&r.result!==null&&!Array.isArray(r.result)&&r.result.investigationId===investigationId)?.result;
const guild=z.object({guildSessionId:z.string()}).parse(linked("Guild.ai")),clickhouse=z.object({receiptId:z.string().uuid(),insertedEvents:z.number().int().positive().max(200),serverVersion:z.string()}).parse(linked("ClickHouse"));
const endpoint="https://5gbbs34frdf1f63hdvol7ldjnc.ingress.cpu.dal.aes.akash.pub";
const artifact={investigationId,guildSessionId:guild.guildSessionId,clickhouseReceiptId:clickhouse.receiptId,eventCount:clickhouse.insertedEvents,serverVersion:clickhouse.serverVersion};
const expectedSha256=createHash("sha256").update(canonical(artifact)).digest("hex"),receiptId=randomUUID();
await db.integrationRun.create({data:{id:receiptId,fingerprint:expectedSha256,sponsor:"Akash Network",action:"public-digest-verification",mode:"external",status:"running",configurationHash:expectedSha256,result:{investigationId,endpoint,deploymentDseq:"1791585638189",scope:"Public sanitized receipt summary only"}}});
async function request(path:string,body?:unknown){const r=await fetch(endpoint+path,{method:body?"POST":"GET",redirect:"error",signal:AbortSignal.timeout(15000),...(body?{headers:{"content-type":"application/json"},body:JSON.stringify(body)}:{})});const bytes=await r.text();assert(Buffer.byteLength(bytes)<=8192,"Bounded worker response required");return {status:r.status,value:JSON.parse(bytes)};}
try{
 const health=await request("/health");assert.equal(health.status,200);assert.equal(health.value.service,"Ghost Ops / Akash verification worker");
 const nonce=randomUUID(),valid=await request("/verify",{nonce,expectedSha256,artifact});
 assert.equal(valid.status,200);assert.equal(valid.value.verified,true);assert.equal(valid.value.nonce,nonce);assert.equal(valid.value.sha256,expectedSha256);assert.equal(valid.value.investigationId,investigationId);
 const altered=await request("/verify",{nonce:randomUUID(),expectedSha256,artifact:{...artifact,eventCount:artifact.eventCount===200?199:artifact.eventCount+1}});assert.equal(altered.status,422);assert.equal(altered.value.verified,false);
 const receipt={receiptId,investigationId,at:new Date().toISOString(),endpoint,deploymentDseq:"1791585638189",provider:"akash19zzh7whjt4vfwxd5wtj3tjtyatnpntfhldshd8",image:"python:3.12-alpine",artifact,workerReceipt:valid.value,tamperedSummaryRejected:true,provenance:"actual-akash-provider-compute",limitation:"Stateless public digest consistency; no signer authentication, local credentials or privileged backend"};
 await db.$transaction(async tx=>{await tx.integrationRun.update({where:{id:receiptId},data:{status:"succeeded",finishedAt:new Date(),result:receipt}});await tx.sentinelObservation.create({data:{id:randomUUID(),runId:investigationId,kind:"sponsor-evidence",data:{sponsor:"Akash Network",receiptId,deploymentDseq:receipt.deploymentDseq,verificationId:valid.value.verificationId,sha256:expectedSha256,tamperedSummaryRejected:true,provenance:receipt.provenance}}});});
 await writeFile(resolve(`.ghostops/submission-proof/akash-${receiptId}.json`),JSON.stringify(receipt,null,2),{mode:0o600,flag:"wx"});console.log(JSON.stringify(receipt,null,2));
}catch(error){await db.integrationRun.update({where:{id:receiptId},data:{status:"failed",finishedAt:new Date(),result:{investigationId,error:"Worker verification incomplete; inspect deployment and receipt before retry"}}});console.error("Akash verification failed; no privileged data was sent.");process.exitCode=1;void error;}finally{await db.$disconnect();}
