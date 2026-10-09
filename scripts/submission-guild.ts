/** Operator-mediated Guild session bridge: one strict read, no remote credentials. */
import assert from "node:assert/strict";
import {randomUUID,randomBytes,createHash} from "node:crypto";
import {readFile,writeFile} from "node:fs/promises";
import {resolve} from "node:path";
import {z} from "zod";
import {localAdmin,localBase,LocalAgentClient} from "../src/runtime/client";

const args=process.argv.slice(2);assert.equal(args.length,2,"Usage: --session <verified Guild session UUID>");assert.equal(args[0],"--session");
const guildId=z.string().regex(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/),sessionId=guildId.parse(args[1]);
const transcript=z.object({session_id:guildId,events:z.array(z.object({type:z.string(),content:z.unknown().optional(),created_at:z.string().optional()}))}).parse(JSON.parse(await readFile(resolve(".ghostops/submission-proof/guild-corrected.json"),"utf8")));
assert.equal(transcript.session_id,sessionId);
const event=transcript.events.findLast(e=>e.type==="runtime_done"&&typeof e.content==="object"&&e.content!==null&&"text" in e.content);
assert(event,"Completed real Guild output required");
const text=z.object({text:z.string()}).parse(event.content).text;
const result=z.object({investigation_id:z.string().uuid(),advisory_id:z.literal("GHSA-35jh-r3h4-6jhm"),source_url:z.literal("https://github.com/advisories/GHSA-35jh-r3h4-6jhm"),vulnerability_description:z.string(),affected_versions:z.string(),fixed_versions:z.string(),uncertainty:z.string(),recommended_safe_remediation:z.string(),requested_action:z.object({tool:z.literal("read_memory"),resource:z.literal("memory/runtime-policy")}).strict()}).strict().parse(JSON.parse(text));
assert(result.vulnerability_description.toLowerCase().includes("command injection")&&result.affected_versions.includes("4.17.21")&&result.fixed_versions.includes("4.17.21"),"Unverified advisory claims rejected");
const source=JSON.parse(await readFile(resolve(".ghostops/submission-proof/public-advisory.json"),"utf8"));assert.equal(source.ghsa_id,result.advisory_id);assert.equal(source.summary,"Command Injection in lodash");
process.env.DATABASE_URL=`file:${resolve(".ghostops/submission.db")}`;
const {db}=await import("../src/server/db");await db.sentinelRun.findUniqueOrThrow({where:{id:result.investigation_id}});
const base=localBase(),headers=await localAdmin(base),actorId=`live-guild-${randomUUID().slice(0,8)}`,credential=randomBytes(32).toString("hex");
const response=await fetch(base+"/api/runtime/enroll",{method:"POST",headers,redirect:"error",signal:AbortSignal.timeout(15000),body:JSON.stringify({commandId:randomUUID(),actorId,credential,integration:{name:"Guild.ai session / bounded local broker",role:"research",permissions:{tools:["memory:read"],resources:["memory/runtime-policy"],destinations:[]}}})});
assert(response.ok,"Scoped runtime enrollment denied");const enrolled=await response.json(),identity={actorId,sessionId:enrolled.sessionId as string,credential};
await writeFile(resolve(`.ghostops/guild-${actorId}.json`),JSON.stringify(identity),{mode:0o600,flag:"wx"});
const client=new LocalAgentClient(identity,base);let decision;
try{await client.connect();decision=await client.call(result.requested_action.tool,result.requested_action.resource);assert(decision.allowed,"Guild-requested bounded policy read denied");}finally{await client.close();}
const receiptId=randomUUID(),receipt={receiptId,investigationId:result.investigation_id,guildSessionId:sessionId,guildAgent:"guildai~the-smith",guildAgentId:"019e051d-0ec9-726e-0000-6d3b3315fa5a",trace:`https://app.guild.ai/sessions/${sessionId}`,at:new Date().toISOString(),guildCompletedAt:event.created_at??null,actorId,requestId:decision.requestId,allowed:decision.allowed,reason:decision.reason,sourceUrl:result.source_url,sourceValidation:"Initial advisory error rejected; corrected result matched verified GitHub source",finding:result,provenance:"actual-guild-session / authenticated-local-mcp",limitation:"Operator-mediated broker; Guild has no direct network or credential access to the local gateway"};
const digest=createHash("sha256").update(JSON.stringify(receipt)).digest("hex");
await db.$transaction(async tx=>{await tx.integrationRun.create({data:{id:receiptId,fingerprint:digest,sponsor:"Guild.ai",action:"bounded-session-bridge",mode:"external",status:"succeeded",configurationHash:digest,result:receipt,finishedAt:new Date()}});await tx.sentinelObservation.create({data:{id:randomUUID(),runId:result.investigation_id,kind:"sponsor-evidence",requestId:decision.requestId,data:{sponsor:"Guild.ai",receiptId,sessionId,actorId,trace:receipt.trace,provenance:receipt.provenance}}});});
await writeFile(resolve(`.ghostops/submission-proof/guild-${receiptId}.json`),JSON.stringify(receipt,null,2),{mode:0o600,flag:"wx"});console.log(JSON.stringify(receipt,null,2));await db.$disconnect();
