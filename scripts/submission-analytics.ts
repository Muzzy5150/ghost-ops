/** Explicit operator-approved, minimized ClickHouse delivery for one owned run. */
import assert from "node:assert/strict";
import {randomUUID,createHash} from "node:crypto";
import {constants} from "node:fs";
import {open,mkdir,writeFile} from "node:fs/promises";
import {resolve} from "node:path";
import {z} from "zod";
import {createClient} from "@clickhouse/client";

const args=process.argv.slice(2);assert.equal(args.length,2,"Usage: --run <owned investigation UUID>");assert.equal(args[0],"--run");
const investigationId=z.string().uuid().parse(args[1]);
const file=await open(resolve(".ghostops/clickhouse.json"),constants.O_RDONLY|constants.O_NOFOLLOW);
let config:{url:string;username:string;password:string};
try{const s=await file.stat();assert(s.isFile()&&!(s.mode&0o077)&&s.size<10000,"Private configuration required");config=z.object({url:z.string().url(),username:z.string().min(1),password:z.string().min(1)}).strict().parse(JSON.parse(await file.readFile("utf8")));}finally{await file.close();}
assert.equal(new URL(config.url).origin,"https://p77jtcubdp.us-east-2.aws.clickhouse.cloud:8443","Only the operator-approved service is supported");
process.env.DATABASE_URL=`file:${resolve(".ghostops/submission.db")}`;
process.env.GHOSTOPS_SPONSOR_EGRESS="1";process.env.GHOSTOPS_CLICKHOUSE_ENABLED="1";
process.env.GHOSTOPS_CLICKHOUSE_URL=config.url;process.env.GHOSTOPS_CLICKHOUSE_APPROVED_ORIGIN=new URL(config.url).origin;
process.env.GHOSTOPS_CLICKHOUSE_USER=config.username;process.env.GHOSTOPS_CLICKHOUSE_PASSWORD=config.password;
const {db}=await import("../src/server/db"),{telemetryProjection,clickHouseOperation}=await import("../src/server/sponsor-adapters"),{sponsorConfiguration}=await import("../src/server/sponsors"),{verifyAnalytics}=await import("../src/server/sentinel-analytics");
const run=await db.sentinelRun.findUniqueOrThrow({where:{id:investigationId}}),actors=z.array(z.string()).parse(run.agentIds);
assert(actors.length&&run.status!=="running","Owned completed investigation required");
const bridges=await db.sentinelObservation.findMany({where:{runId:investigationId,kind:"sponsor-evidence"}});
for(const bridge of bridges){const data=z.object({sponsor:z.string(),actorId:z.string().optional()}).parse(bridge.data);if(data.sponsor==="Guild.ai"&&data.actorId)actors.push(data.actorId);}
const events=await db.securityEvent.findMany({where:{actorId:{in:actors},simulated:false},include:{request:true},orderBy:{ordinal:"asc"},take:201});
assert(events.length>0&&events.length<=200,"Bounded actual-event batch required");
const namespace=`submission-${investigationId}`,rows=events.map(e=>telemetryProjection(namespace,e,e.request));
const receiptId=randomUUID(),configurationHash=sponsorConfiguration("ClickHouse").binding;
const digest=(v:unknown)=>createHash("sha256").update(JSON.stringify(v)).digest("hex");
await db.integrationRun.create({data:{id:receiptId,fingerprint:digest({investigationId,eventIds:events.map(e=>e.id)}),sponsor:"ClickHouse",action:"telemetry",mode:"external",status:"running",configurationHash,result:{investigationId,sourceEvents:rows.length,payloadHash:digest(rows)}}});
const client=createClient({...config,request_timeout:10000,clickhouse_settings:{max_execution_time:5,max_result_rows:"200",result_overflow_mode:"throw"}});
try{
 const version=await(await client.query({query:"SELECT version() AS version",format:"JSONEachRow"})).json<{version:string}>();
 const aggregates=await clickHouseOperation(config.url,config.username,config.password,namespace,rows);
 const groups=await(await client.query({query:"SELECT engine,event_type,outcome,runtime_origin,tool,agent_id,count() AS events FROM ghostops_events FINAL WHERE startsWith(source_key,{prefix:String}) GROUP BY engine,event_type,outcome,runtime_origin,tool,agent_id",query_params:{prefix:namespace+":"},format:"JSONEachRow"})).json<{engine:string;event_type:string;outcome:string;runtime_origin:string;tool:string|null;agent_id:string|null;events:string}>();
 const verified=verifyAnalytics(rows,groups);
 const returned=await(await client.query({query:"SELECT event_id FROM ghostops_events FINAL WHERE startsWith(source_key,{prefix:String}) ORDER BY event_id",query_params:{prefix:namespace+":"},format:"JSONEachRow"})).json<{event_id:string}>();
 assert.deepEqual(returned.map(e=>e.event_id),events.map(e=>e.id).sort(),"ClickHouse event IDs must match SQLite");
 const receipt={receiptId,investigationId,at:new Date().toISOString(),serverVersion:version[0].version,insertedEvents:rows.length,matchedEventIds:returned.map(e=>e.event_id),verified,aggregates,provenance:"actual-clickhouse-cloud",limitation:"Sanitized persisted events; no security authorization delegated to analytics"};
 await db.$transaction(async tx=>{await tx.integrationRun.update({where:{id:receiptId},data:{status:"succeeded",finishedAt:new Date(),result:receipt}});await tx.sentinelObservation.create({data:{id:randomUUID(),runId:investigationId,kind:"sponsor-evidence",data:{sponsor:"ClickHouse",receiptId,serverVersion:receipt.serverVersion,insertedEvents:rows.length,allEventIdsMatched:true,provenance:receipt.provenance}}});});
 await mkdir(resolve(".ghostops/submission-proof"),{recursive:true,mode:0o700});await writeFile(resolve(`.ghostops/submission-proof/clickhouse-${receiptId}.json`),JSON.stringify(receipt,null,2),{mode:0o600,flag:"wx"});
 console.log(JSON.stringify(receipt,null,2));
}catch(error){await db.integrationRun.update({where:{id:receiptId},data:{status:"failed",finishedAt:new Date(),result:{investigationId,error:"ClickHouse operation failed; inspect remote delivery before retry"}}});console.error("ClickHouse operation failed; credentials and response details omitted.");process.exitCode=1;void error;}finally{await client.close();await db.$disconnect();}
