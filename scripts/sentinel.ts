import { randomUUID } from "node:crypto";
import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";
import { setTimeout as delay } from "node:timers/promises";
import { localAdmin, localBase } from "../src/runtime/client";
import { sentinelStartSchema } from "../src/lib/sentinel-contract";
const args=process.argv.slice(2),value=(flag:string)=>args[args.indexOf(flag)+1],base=localBase();
const headers=await localAdmin(base);
async function post(path:string,input:unknown){const r=await fetch(base+path,{method:"POST",headers,redirect:"error",body:JSON.stringify(input),signal:AbortSignal.timeout(40000)});const result=await r.json();if(!r.ok)throw new Error(`Sentinel management rejected (${r.status}); inspect configuration/authority, not credentials`);return result;}
async function snapshot(){const r=await fetch(base+"/api/sentinel",{headers,signal:AbortSignal.timeout(10000)});if(!r.ok)throw new Error("Sentinel unavailable");return r.json();}
async function confirm(text:string){if(!stdin.isTTY)throw new Error("Interactive exact approval required; no paid/publication calls in unattended runs");const rl=createInterface({input:stdin,output:stdout});try{if(await rl.question(`Type exactly '${text}' to approve: `)!==text)throw new Error("Operator declined");}finally{rl.close();}}
try{
  if(args.includes("--status")){console.log(JSON.stringify(await snapshot(),null,2));}
  else if(args.includes("--preview")||args.includes("--publish")){
    const runId=value("--run");if(!runId)throw new Error("--run UUID required");const preview=await post("/api/sentinel",{commandId:randomUUID(),runId,action:"publication-preview"});console.log(JSON.stringify({...preview,approvalToken:undefined},null,2));
    if(args.includes("--publish")){if(!preview.canExecute)throw new Error("Publication not configured; preview only");await confirm(`PUBLISH ${preview.target} ${preview.digest}`);console.log(JSON.stringify(await post("/api/sentinel",{commandId:randomUUID(),runId,action:"publish",approvalToken:preview.approvalToken,confirmation:"APPROVE PUBLICATION"}),null,2));}
  }else{
    const input=sentinelStartSchema.parse({commandId:randomUUID(),objective:args.includes("--objective")?value("--objective"):"Investigate the approved dependency and code snapshot. Retrieve advisory evidence, select useful code checks and prepare a grounded research report; do not publish.",target:args.includes("--target")?value("--target"):"vulnerable",sources:args.includes("--sources")?value("--sources").split(","):["osv"],mode:args.includes("--mode")?value("--mode"):"offline",injection:args.includes("--injection"),backends:args.includes("--backends")?value("--backends").split(","):[],budgets:{maxCalls:args.includes("--calls")?Number(value("--calls")):3,maxTokens:24000,maxOutputTokens:512,maxToolCalls:6,timeoutMs:60000}});
    const plan=await post("/api/sentinel/preflight",input);console.log(JSON.stringify({...plan,approvalToken:undefined},null,2));
    if(!plan.canExecute)throw new Error("Model unavailable; no inference started");
    if(input.mode==="model"){if(args.includes("--approve-local")&&plan.provider==="ollama-local")console.log(`Explicit local inference approval: ${plan.model}; at most ${plan.maxModelCalls} calls; no hosted provider.`);else{if(!args.includes("--live"))throw new Error("Model execution requires --live and interactive approval (or --approve-local for installed Ollama only)");await confirm(`RUN ${plan.provider} ${plan.model} ${input.commandId}`);}}
    const started=await post("/api/sentinel",{...input,approvalToken:plan.approvalToken});console.log(JSON.stringify(started));
    for(let n=0;n<110;n++){await delay(2000);const state=await snapshot(),run=state.runs.find((r:{id:string})=>r.id===started.runId);if(run&&run.status!=="running"){console.log(JSON.stringify(run,null,2));break;}if(n===109)throw new Error("Run still active; inspect --status or cancel via authorized UI");}
  }
}catch(error){console.error(error instanceof Error?error.message:"Bounded Sentinel failure");process.exitCode=1;}
