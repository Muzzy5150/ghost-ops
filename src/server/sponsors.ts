import { randomUUID } from "node:crypto";
import {accessSync,constants} from "node:fs";
import { canonical } from "@/lib/canonical";
import { sponsorActionSchema,sponsorForAction,sponsorNames,capabilities,type Sponsor,type SponsorAction } from "@/lib/sponsor-contract";
import { db,serialized } from "./db";
import { hash } from "./memory";
import { mac,secureEqual,credentialDigest } from "./config";
import { ConflictError,CapacityError } from "./gateway";
import { modelConfiguration } from "@/runtime/model";
import { scanCode,scannerExecutable } from "./code-security";
import { telemetryProjection,intelligenceProjection,contextFixture,sensoProjection,sensoContext,elevenSpeech,clickHouseOperation,mongoOperation,mongoConfiguration,otlpProjection,reconcileIntelligenceHit } from "./sponsor-adapters";
import { approvedHttpEndpoint } from "@/lib/sponsor-contract";
import type { Prisma } from "@/generated/prisma/client";
import {modelOrganization} from "./model-organization";
const sponsorGlobal=globalThis as unknown as {ghostSponsorControllers?:Map<string,AbortController>};
const controllers=sponsorGlobal.ghostSponsorControllers??new Map<string,AbortController>();sponsorGlobal.ghostSponsorControllers=controllers;

export function sponsorConfiguration(sponsor:Sponsor,env:Record<string,string|undefined>=process.env) {
  const egress=env.GHOSTOPS_SPONSOR_EGRESS==="1"; let enabled=false,configured=false,destination="none",secret="",detail="";
  try {
    if(sponsor==="OpenAI") {const c=modelConfiguration(env);return {enabled:c.enabled,configured:c.ready,destination:c.endpoint??"https://api.openai.com/v1",detail:"Fresh exact-run model approval required",binding:credentialDigest(canonical({c,key:env.OPENAI_API_KEY??"",localKey:env.GHOSTOPS_LOCAL_MODEL_KEY??""}))};}
    if(sponsor==="Semgrep") {enabled=true;detail="Explicit local synthetic target; executable availability is not scan verification";destination="local subprocess";secret=canonical({binary:env.GHOSTOPS_SEMGREP_BINARY??"private-venv",root:env.GHOSTOPS_SCAN_TARGET_ROOT??null});try{accessSync(/* turbopackIgnore: true */ scannerExecutable(env),constants.X_OK);configured=true;}catch{configured=false;detail="Install the local Semgrep executable; no scan has been performed";}}
    if(sponsor==="ClickHouse") {enabled=egress&&env.GHOSTOPS_CLICKHOUSE_ENABLED==="1";const u=approvedHttpEndpoint(env.GHOSTOPS_CLICKHOUSE_URL??"",true);if(new URL(u).origin!==env.GHOSTOPS_CLICKHOUSE_APPROVED_ORIGIN)throw new Error("Unapproved destination");destination=new URL(u).origin;secret=canonical({u,user:env.GHOSTOPS_CLICKHOUSE_USER??"default",key:env.GHOSTOPS_CLICKHOUSE_PASSWORD??""});configured=true;detail="Sanitized events; user must authorize each bounded batch";}
    if(sponsor==="MongoDB") {enabled=egress&&env.GHOSTOPS_MONGODB_ENABLED==="1";const uri=mongoConfiguration(env.GHOSTOPS_MONGODB_URI??"");const u=new URL(uri);if(u.hostname!==env.GHOSTOPS_MONGODB_APPROVED_HOST)throw new Error("Unapproved database");destination=u.hostname;secret=uri;configured=true;detail="Sanitized summaries and stable evidence references; metadata search only";}
    if(sponsor==="Senso") {enabled=egress&&env.GHOSTOPS_SENSO_ENABLED==="1";configured=!!env.SENSO_API_KEY&&!!env.GHOSTOPS_SENSO_CONTENT_IDS?.split(",").every(v=>/^[a-f0-9-]{36}$/.test(v));destination="https://apiv2.senso.ai";secret=canonical({key:env.SENSO_API_KEY??"",ids:env.GHOSTOPS_SENSO_CONTENT_IDS??""});detail="Approved synthetic knowledge IDs only; context is untrusted and may use credits";}
    if(sponsor==="ElevenLabs") {enabled=egress&&env.GHOSTOPS_ELEVENLABS_ENABLED==="1";configured=!!env.ELEVENLABS_API_KEY&&/^[a-zA-Z0-9_-]{1,100}$/.test(env.GHOSTOPS_ELEVENLABS_VOICE??"")&&/^[a-zA-Z0-9_.-]{1,100}$/.test(env.GHOSTOPS_ELEVENLABS_MODEL??"");destination="https://api.elevenlabs.io";secret=canonical({key:env.ELEVENLABS_API_KEY??"",voice:env.GHOSTOPS_ELEVENLABS_VOICE??"",model:env.GHOSTOPS_ELEVENLABS_MODEL??""});detail="Manual minimized narration; credits may apply, provider retention policy applies";}
    if(sponsor==="AWS") {enabled=true;configured=true;destination="local OTLP JSON only";detail="No AWS API call or collector upload implemented";}
  }catch {configured=false;destination="configuration invalid or missing";detail="Explicit approved server configuration required; no connection attempted";}
  return {enabled,configured,destination,detail,binding:credentialDigest(canonical({sponsor,enabled,configured,destination,secret}))};
}
async function namespace() {return (await db.telemetryCursor.upsert({where:{id:"source"},create:{id:"source",namespace:randomUUID()},update:{}})).namespace;}
async function prepare(input:SponsorAction) {
  const sponsor=sponsorForAction[input.action],configuration=sponsorConfiguration(sponsor);
  const instance=await namespace();
  if(input.action==="model-org") {
    const c=modelConfiguration();let sourceHash:string|null=null;
    if(input.contextId){const source=await db.sourceDocument.findUnique({where:{id:`sponsor-context:${input.contextId}`}});if(!source||source.trust!=="untrusted"||hash(source.content)!==source.contentHash)throw new ConflictError("Verified approved context not found");sourceHash=source.contentHash;}
    return {configuration,sponsor,payload:{provider:c.provider,model:c.model,scenario:input.scenario,contextId:input.contextId??null,sourceHash,roles:["ResearchAgent","CoordinatorAgent","OperationsAgent"],budgets:input.budgets,totalMaxModelCalls:3*input.budgets.maxCalls,totalRequestedTokens:3*input.budgets.maxTokens,organizationTimeoutMs:180000},cursor:null};
  }
  if(input.action==="scan")return {configuration,sponsor,payload:{target:input.target,requestId:input.requestId??null},cursor:null};
  if(input.action==="context")return {configuration,sponsor,payload:{query:input.query!,fixture:input.fixture},cursor:null};
  if(["index","narrate"].includes(input.action)) {
    const incidents=await db.incident.findMany({where:input.incidentId?{id:input.incidentId}:{},include:{events:{orderBy:{ordinal:"asc"},take:1001}},orderBy:{updatedAt:"desc"},take:101});
    if(incidents.length>100 || incidents.some(i=>i.events.length>1000))throw new CapacityError("Intelligence projection capacity exceeded");
    if(input.action==="narrate"&&!incidents.length)throw new ConflictError("Persisted incident not found");
    const docs=[];
    for(const i of incidents){const requests=await db.toolRequest.findMany({where:{id:{in:[...new Set(i.events.flatMap(e=>e.requestId?[e.requestId]:[]))]}},select:{allowed:true}});docs.push(intelligenceProjection(instance,i,i.events,requests));}
    return {configuration,sponsor,payload:docs,cursor:null};
  }
  if(input.action==="search")return {configuration,sponsor,payload:{namespace:instance,query:input.query!},cursor:null};
  if(input.action==="analytics")return {configuration,sponsor,payload:{query:"fixed-minutely-aggregate-v1"},cursor:null};
  const cursor=await db.telemetryCursor.upsert({where:{id:configuration.binding},create:{id:configuration.binding,namespace:instance},update:{}});
  const events=await db.securityEvent.findMany({where:{ordinal:{gt:input.action==="otlp"?0:cursor.ordinal}},include:{request:true},orderBy:{ordinal:"asc"},take:200});
  return {configuration,sponsor,payload:events.map(e=>telemetryProjection(instance,e,e.request)),cursor:input.action==="telemetry"?{id:cursor.id,ordinal:events.at(-1)?.ordinal??cursor.ordinal}:null};
}
type Prepared=Awaited<ReturnType<typeof prepare>>;
function binding(input:SponsorAction,p:Prepared){return hash(canonical({input:{...input,approvalToken:undefined},configuration:p.configuration.binding,payload:p.payload,cursor:p.cursor}));}
export async function sponsorPreflight(raw:unknown) {
  const input=sponsorActionSchema.parse(raw),p=await prepare(input),expiresAt=Date.now()+120000;
  const payload=Buffer.from(JSON.stringify({commandId:input.commandId,expiresAt,binding:binding(input,p)})).toString("base64url");
  return {commandId:input.commandId,sponsor:p.sponsor,action:input.action,destination:input.fixture?"local synthetic fixture; no external transfer":p.configuration.destination,mode:input.fixture?"local-fixture":["scan","otlp"].includes(input.action)?"local":"external",canExecute:input.fixture||p.configuration.enabled&&p.configuration.configured,configurationDetail:p.configuration.detail,payloadHash:hash(canonical(p.payload)),recordCount:Array.isArray(p.payload)?p.payload.length:1,
    cost:["context","narrate","model-org"].includes(input.action)?"Provider usage may incur charges; application budgets are not billing ceilings":"Local scanning is free; optional backend service costs depend on deployment",modelPlan:input.action==="model-org"?p.payload:null,limitations:"No automatic retry after uncertain dispatch; projections cannot authorize tools. Source text is never policy.",expiresAt,approvalToken:`${payload}.${mac(`sponsor-approval:v1:${payload}`)}`};
}
function authorize(input:SponsorAction,p:Prepared){
  const [payload,tag,extra]=(input.approvalToken??"").split(".");if(!payload||!tag||extra||!secureEqual(tag,mac(`sponsor-approval:v1:${payload}`)))throw new ConflictError("Fresh exact sponsor-action approval required");
  let v:{commandId:string;expiresAt:number;binding:string};try{v=JSON.parse(Buffer.from(payload,"base64url").toString());}catch{throw new ConflictError("Invalid sponsor approval");}
  if(v.commandId!==input.commandId||!Number.isSafeInteger(v.expiresAt)||v.expiresAt<=Date.now()||v.expiresAt>Date.now()+120000||v.binding!==binding(input,p))throw new ConflictError("Sponsor approval expired or data/configuration changed; inspect again");
  if(!input.fixture&&(!p.configuration.enabled||!p.configuration.configured))throw new ConflictError("Sponsor transfer disabled or configuration unavailable");
}
/** Remote/index effects NEVER execute in a gateway transaction or timer. */
export async function sponsorExecute(raw:unknown) {
  const input=sponsorActionSchema.parse(raw),fingerprint=hash(canonical({...input,approvalToken:undefined}));
  const prior=await db.integrationRun.findUnique({where:{id:input.commandId}});
  if(prior){if(prior.fingerprint!==fingerprint)throw new ConflictError("Altered command ID reuse rejected");return {runId:prior.id,status:prior.status,result:prior.result,replayed:true};}
  const p=await prepare(input);authorize(input,p);
  const mode=input.fixture?"fixture":["scan","otlp"].includes(input.action)?"local":"external";
  await serialized(()=>db.$transaction(async tx=>{if(await tx.integrationRun.count()>=3000)throw new CapacityError("Integration receipt capacity reached");if(await tx.integrationRun.count({where:{status:"running"}}))throw new ConflictError("A sponsor operation is active; inspect its receipt before starting another");await tx.integrationRun.create({data:{id:input.commandId,fingerprint,sponsor:p.sponsor,action:input.action,mode,status:"running",configurationHash:p.configuration.binding,result:{payloadHash:hash(canonical(p.payload))}}});}));
  let result:unknown;let transient:unknown;
  try {
    if(mode==="external"&&(process.env.NODE_ENV==="test"||process.env.CI))throw new Error("External sponsor transfer forbidden in automated tests");
    if(input.action==="scan")result=await scanCode(input);
    if(input.action==="model-org") {const controller=new AbortController();controllers.set(input.commandId,controller);const timer=setTimeout(()=>controller.abort(),180000);try{result=await modelOrganization(input,controller.signal,process.env.GHOSTOPS_LOOPBACK_ORIGIN);}finally{clearTimeout(timer);controllers.delete(input.commandId);}}
    if(input.action==="context") {const passages=input.fixture?sensoProjection(contextFixture,"local-fixture",[contextFixture.results[0].content_id]):await sensoContext(input.query!,process.env.SENSO_API_KEY!,process.env.GHOSTOPS_SENSO_CONTENT_IDS!.split(","));const content=passages.map(p=>p.text).join("\n");if(!content||content.length>4000)throw new Error("Context exceeds synthetic task limit");await db.sourceDocument.create({data:{id:`sponsor-context:${input.commandId}`,name:input.fixture?"LOCAL PROVENANCE FIXTURE — NOT SENSO":"Approved synthetic Senso context",content,contentHash:hash(content),trust:"untrusted"}});transient={passages};result={contextId:input.commandId,sourceId:`sponsor-context:${input.commandId}`,passages:passages.map(({text,...metadata})=>({...metadata,textOmitted:!!text})),provenance:input.fixture?"local-fixture":"senso-api",instructionTrust:"untrusted"};}
    if(input.action==="telemetry"||input.action==="analytics")result={rows:await clickHouseOperation(process.env.GHOSTOPS_CLICKHOUSE_URL!,process.env.GHOSTOPS_CLICKHOUSE_USER??"default",process.env.GHOSTOPS_CLICKHOUSE_PASSWORD??"",await namespace(),input.action==="telemetry"?p.payload as Parameters<typeof clickHouseOperation>[4]:undefined),delivered:input.action==="telemetry"?(p.payload as unknown[]).length:0,duplicateHandling:"ReplacingMergeTree stable source_key; queries use FINAL",provenance:"clickhouse-api"};
    if(input.action==="index"||input.action==="search") {const found=await mongoOperation(process.env.GHOSTOPS_MONGODB_URI!,await namespace(),input.action==="index"?p.payload as Parameters<typeof mongoOperation>[2]:undefined,input.query??"");const checked=[];for(const row of found){const incident=await db.incident.findUnique({where:{id:row.sourceId},include:{events:{select:{id:true}}}});if(!incident)throw new Error("Intelligence index source mismatch");checked.push(reconcileIntelligenceHit(row,incident));}result={matches:checked,indexed:input.action==="index"?(p.payload as unknown[]).length:0,provenance:"mongodb-api",limitation:"Index can lag; original SQLite evidence is authoritative"};}
    if(input.action==="narrate"){const doc=(p.payload as ReturnType<typeof intelligenceProjection>[])[0];const audio=await elevenSpeech(doc.summary,process.env.ELEVENLABS_API_KEY!,process.env.GHOSTOPS_ELEVENLABS_VOICE!,process.env.GHOSTOPS_ELEVENLABS_MODEL!);transient={audio:audio.toString("base64"),contentType:"audio/mpeg"};result={incidentId:doc.sourceId,audioHash:hash(audio.toString("base64")),bytes:audio.length,provenance:"elevenlabs-api",audioPersisted:false};}
    if(input.action==="otlp")result={otlp:otlpProjection(p.payload as Parameters<typeof otlpProjection>[0]),provenance:"local-otlp-projection",awsCallPerformed:false};
    if(Buffer.byteLength(JSON.stringify(result))>300000)throw new CapacityError("Sponsor result too large; no persisted success");
    await serialized(()=>db.$transaction(async tx=>{if((await tx.integrationRun.findUnique({where:{id:input.commandId}}))?.status!=="running")throw new ConflictError("Run no longer active");await tx.integrationRun.update({where:{id:input.commandId},data:{status:"succeeded",finishedAt:new Date(),result:result as Prisma.InputJsonValue}});if(p.cursor)await tx.telemetryCursor.update({where:{id:p.cursor.id},data:{ordinal:p.cursor.ordinal}});}));
    return {runId:input.commandId,status:"succeeded",result,...(transient as object??{}),replayed:false};
  }catch{const priorResult=(await db.integrationRun.findUniqueOrThrow({where:{id:input.commandId}})).result;await db.integrationRun.updateMany({where:{id:input.commandId,status:"running"},data:{status:"failed",finishedAt:new Date(),result:{partialEvidence:priorResult,errorCode:"SPONSOR_UNAVAILABLE_FAILED_OR_INTERRUPTED",retry:"No automatic replay; inspect possible remote delivery before a fresh approved action"}}});return {runId:input.commandId,status:(await db.integrationRun.findUniqueOrThrow({where:{id:input.commandId}})).status,result:{errorCode:"SPONSOR_UNAVAILABLE_FAILED_OR_INTERRUPTED"},replayed:false};}
}
export async function cancelSponsorRun(id:string){const run=await db.integrationRun.findUnique({where:{id}});if(!run||run.action!=="model-org")throw new ConflictError("Only active model organizations support cancellation");controllers.get(id)?.abort();await db.integrationRun.updateMany({where:{id,status:"running"},data:{status:"cancelled",finishedAt:new Date()}});return {runId:id,status:(await db.integrationRun.findUniqueOrThrow({where:{id}})).status};}
export async function sponsorSnapshot() {
  const runs=await db.integrationRun.findMany({orderBy:{createdAt:"desc"},take:50});
  const integrations=sponsorNames.map(sponsor=>{const c=sponsorConfiguration(sponsor);const receipt=runs.find(r=>r.sponsor===sponsor&&r.configurationHash===c.binding&&r.status==="succeeded"&&r.mode!=="fixture"&&(sponsor!=="OpenAI"||typeof r.result==="object"&&r.result!==null&&!Array.isArray(r.result)&&Number(r.result.verifiedProviderCalls)>0));
    const status=["Guild.ai","Pi Security","Induction Labs"].includes(sponsor)?"RESEARCH ONLY":sponsor==="Akash Network"||sponsor==="AWS"?"IMPLEMENTED BUT UNVERIFIED":receipt?sponsor==="Semgrep"?"VERIFIED LOCAL":"VERIFIED LIVE":c.configured&&c.enabled?"IMPLEMENTED BUT UNVERIFIED":"CONFIGURATION REQUIRED";
    return {sponsor,capability:capabilities[sponsor],status,enabled:c.enabled,configured:c.configured,destination:c.destination,limitation:c.detail,lastVerification:receipt?.finishedAt??null,receiptId:receipt?.id??null};});
  return {integrations,runs: runs.map(r=>({id:r.id,sponsor:r.sponsor,action:r.action,mode:r.mode,status:r.status,createdAt:r.createdAt,finishedAt:r.finishedAt,result:r.action==="otlp"?{projectionAvailable:true}:r.result})),scans:await db.codeScan.findMany({orderBy:{createdAt:"desc"},take:30}),model:modelConfiguration(),localFixtureIsNotSenso:true};
}
/** Safe recovery marks uncertain effects interrupted; it never redispatches them. */
export async function recoverSponsorRuns(){await db.integrationRun.updateMany({where:{status:"running"},data:{status:"interrupted",finishedAt:new Date()}});}
