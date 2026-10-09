import {canonical} from "@/lib/canonical";
import type {TelemetryRow} from "./sponsor-adapters";
/** Exact namespace aggregate reconciliation, independent of server timezone buckets. */
export function verifyAnalytics(rows:TelemetryRow[],results:{engine:string;event_type:string;outcome:string;runtime_origin:string;tool:string|null;agent_id:string|null;events:string|number}[]){
  const key=(r:{engine:string;event_type:string;outcome:string;runtime_origin:string;tool:string|null;agent_id:string|null})=>canonical([r.engine,r.event_type,r.outcome,r.runtime_origin,r.tool,r.agent_id]);
  const expected=new Map<string,number>(),actual=new Map<string,number>();
  for(const r of rows)expected.set(key(r),(expected.get(key(r))??0)+1);
  for(const r of results){const count=Number(r.events);if(!Number.isSafeInteger(count)||count<0)throw new Error("Invalid analytics count");actual.set(key(r),(actual.get(key(r))??0)+count);}
  if(canonical([...expected].sort())!==canonical([...actual].sort()))throw new Error("Analytics values do not reconcile to authoritative source events");return {verified:true,sourceEvents:rows.length,groups:expected.size,limitation:"Validated aggregate values for this bounded projection, not external service/host attestation"};
}
