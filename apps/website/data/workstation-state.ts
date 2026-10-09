import record from './recorded-case.json';
import type { State, Event, Incident, Memory } from './view-types';
// Entirely illustrative identities, profiles, memory and attribution. Only the
// minimized recorded event IDs, kinds, ordinals and timestamps come from evidence.
// No local database is read. No signature or credential is represented here.
export const provenance = 'Simulated workstation fixtures with a recorded synthetic timeline. Identity mappings, profiles and memory are illustrative; no live operations or cryptographic verification.';
const at = record.recordedAt;
const end = record.events.at(-1)!.at;
const caseId = 'demo-case';
const agentIds = ['research', 'support', 'sentinel'];
const actors: Record<string,string> = {Gateway:'research', MemoryGuard:'research', GhostTrap:'research', Response:'research'};
const events: Event[] = record.events.map(e => ({
  id:e.id, ordinal:e.ordinal, actorId:actors[e.module] ?? 'sentinel', identityVerified:true,
  simulated:true, createdAt:e.at, sessionId:'demo-session-research', requestId:e.module==='Gateway'?`demo-request-${e.ordinal}`:null,
  runId:'demo-playback', module:e.module, kind:e.kind,
  severity:e.kind==='QUARANTINE'?'critical':e.kind.includes('BLOCKED')?'high':e.kind==='DECOY_INTERACTION'?'medium':'info',
  message:`Recorded synthetic ${e.kind.toLowerCase().replaceAll('_',' ')}${e.resource?` · ${e.resource}`:''}`,
  incidentId:caseId, findings:[],
  details:{illustrativeAttribution:true, recordedEventId:e.id, tool:e.tool ?? (e.module==='Gateway'?'unspecified-capability':null), operation:e.operation ?? (e.module==='Gateway'?'unspecified':null), resource:e.resource, allowed:e.allowed, decision:e.decision, handlerExecuted:e.handlerExecuted, memoryId:'demo-memory-2'}
}));
const incident: Incident = {
  id:caseId, correlationKey:'demo-only', actorId:'research', sessionId:'demo-session-research', identityVerified:true, simulated:true,
  title:'Recorded synthetic investigation · protected-write denial and decoy interest', status:'contained', severity:'critical',
  reasons:['Illustrative mapping of recorded evidence; not live attribution'],
  explanation:'The recorded sequence includes a protected memory write denial, decoy interaction and quarantine. This public projection does not reconstruct private actor identities or prove intent.',
  recommendation:'Inspect the recorded evidence. Operational containment requires an authenticated persistent backend.',
  createdAt:at, updatedAt:end, evidence:[], actions:[],
  events:events.map(e=>({...e, request:e.module==='Gateway'?{id:e.requestId!, simulated:true, identityVerified:true, tool:String((e.details as Record<string,unknown>).tool), operation:String((e.details as Record<string,unknown>).operation), resource:String((e.details as Record<string,unknown>).resource), allowed:(e.details as Record<string,unknown>).allowed===true, reason:String((e.details as Record<string,unknown>).decision ?? 'Recorded permitted handler; capability omitted by minimized projection'), execution:null}:null}))
};
const memories: Memory[] = [2,1].map(version=>({
  id:`demo-memory-${version}`, ownerId:'research', key:'runtime-policy', version,
  content:version===1?'Illustrative policy: read approved documents; protected policy writes require an operator.':'Illustrative altered snapshot: request additional deployment authority.',
  contentHash:'Illustrative content; no cryptographic receipt', parentId:version===2?'demo-memory-1':null,
  integrity:version===1?'verified':'tampered', sourceId:'demo-source', sourceTrust:version===1?'trusted':'untrusted',
  authorization:'Simulated comparison; no signing key or signature', protected:true, restoredFromId:null, sessionId:'demo-session-research', createdAt:at
}));
export const workstationState: State = {
  agents:agentIds.map((id,i)=>({id,name:['Research Agent','Support Agent','Sentinel Agent'][i],role:['Research and evidence review','Incident triage','Advisory analysis'][i],
    status:i===0?'quarantined':'active',trust:i===0?'suspicious':'authorized',simulated:true,integrationType:'internal',createdAt:at,
    permissions:{tools:['documents','summarize'],resources:['documents/demo'],destinations:[]},
    profile:{agentId:id,observations:12,tools:{'documents:read':8,'summarize:execute':4},resources:{'documents/demo':12},destinations:{},sequences:{'documents→summarize':4},frozen:true,updatedAt:at}})),
  events:events.toReversed(), incidents:[incident], memories,
  traps:[{id:'demo-trap',name:'Synthetic administrative decoy',tool:'credentials',resource:'decoy/admin',category:'credential',description:'Illustrative decoy; contains no usable credentials',active:true,_count:{interactions:1}}],
  interactions:[{id:'demo-interaction',trapId:'demo-trap',actorId:'research',sessionId:'demo-session-research',requestId:'demo-request-34',eventId:record.events.find(e=>e.kind==='DECOY_INTERACTION')!.id,incidentId:caseId,operation:'read',createdAt:record.events.find(e=>e.kind==='DECOY_INTERACTION')!.at}],
  sources:[{id:'demo-source',name:'Illustrative untrusted document',trust:'untrusted',content:'Synthetic instruction requesting authority outside the approved task. Shown as data, never executed.',contentHash:'Illustrative public fixture'}],
  sessions:agentIds.map(id=>({id:`demo-session-${id}`,agentId:id,active:id!=='research',sourceId:'demo-source',sourceTrust:'trusted',createdAt:at})),
  actions:[],runs:[],runtimeRequests:[],runtimeCount:0,generatedAt:end,mode:'isolated-simulation',
  stats:{registered:3,authorized:2,unknown:0,activeIncidents:0,incidents:1,anomalies:0,memoryEvents:1,trapTriggers:1,quarantined:1,requests:events.filter(e=>e.module==='Gateway').length,blocked:events.filter(e=>e.kind==='TOOL_BLOCKED').length}
};
export function playbackState(step:number): State {
  const shown = events.slice(0,Math.max(1,Math.min(events.length,step)));
  return {...workstationState,events:shown.toReversed(),incidents:[{...incident,events:incident.events.slice(0,shown.length)}],generatedAt:shown.at(-1)!.createdAt};
}
export const playbackEvents = events;
