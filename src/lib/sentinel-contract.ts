import { z } from "zod";
import { budgetsSchema } from "./lab-contract";
export const sourceNames = ["osv", "cisa", "github"] as const;
export const sentinelTools = ["advisory_lookup", "inspect_repository", "scan_repository", "draft_report", "publish_report", "security_analytics", "incident_search"] as const;
export type SentinelTool = typeof sentinelTools[number];
export const sentinelResources = { advisory_lookup: "sentinel/advisories", inspect_repository: "sentinel/repository", scan_repository: "sentinel/scan", draft_report: "sentinel/report", publish_report: "sentinel/publication", security_analytics: "sentinel/analytics", incident_search: "sentinel/intelligence" } as const;
export const sentinelInput = z.object({ provider: z.enum(sourceNames).optional(), advisoryId: z.string().regex(/^(CVE-\d{4}-\d{4,10}|GHSA-[a-z0-9-]{14}|[A-Z][A-Z0-9-]{1,60})$/).optional(), approvalId: z.string().uuid().optional() }).strict();
export const sentinelStartSchema = z.object({ commandId: z.string().uuid(), objective: z.string().min(1).max(1000), target: z.enum(["vulnerable", "corrected", "approved-repository"]).default("vulnerable"), sources: z.array(z.enum(sourceNames)).min(1).max(3).refine(x=>new Set(x).size===x.length), mode: z.enum(["offline", "live-web", "model"]).default("offline"), injection: z.boolean().default(false), backends:z.array(z.enum(["ClickHouse","MongoDB"])).max(2).default([]),budgets: budgetsSchema.default(()=>budgetsSchema.parse({})), approvalToken: z.string().max(256).optional() }).strict();
export type SentinelStart = z.infer<typeof sentinelStartSchema>;
export const sentinelCommandSchema = z.object({ commandId:z.string().uuid(),action:z.enum(["cancel","publication-preview","publish","monitor","pause-monitor","resume-monitor"]),runId:z.string().uuid(),approvalToken:z.string().max(256).optional(),confirmation:z.literal("APPROVE PUBLICATION").optional(),intervalMinutes:z.number().int().min(15).max(1440).default(60),maxChecks:z.number().int().min(1).max(4).default(2) }).strict();
export type CheckStatus = "PASS"|"FAIL"|"PENDING"|"NOT APPLICABLE";
export type SponsorProof = {technology:string;kind:"local-scanner"|"hosted-model"|"local-database"|"external-service"|"mock"|"prepared";verified:boolean;receiptId:string;at:string};
export function challengeAssessment(evidence:{genuineModel:boolean;modelSelectedTool:boolean;liveSource:boolean;published:boolean;sponsors:SponsorProof[];grounded:boolean;guardedRequests:number;unsafe:number}) {
  const names=[...new Set(evidence.sponsors.filter(s=>s.verified&&!['mock','prepared'].includes(s.kind)).map(s=>s.technology))];
  const checks:{requirement:string;status:CheckStatus;detail:string}[]=[
    {requirement:"Autonomous Model",status:evidence.genuineModel&&evidence.modelSelectedTool?"PASS":"PENDING",detail:"Verified real inference and a model-selected guarded tool are both required; scripts/mocks do not qualify."},
    {requirement:"Open Web",status:evidence.liveSource?"PASS":"PENDING",detail:"Actual successful approved public-source retrieval, not cache/fixture."},
    {requirement:"Real Action",status:evidence.published?"PASS":"PENDING",detail:"Exact-approved external publication and read-back verification required."},
    {requirement:"Sponsor Technology",status:names.length>=3?"PASS":"PENDING",detail:`${names.length} genuinely executed sponsor technologies: ${names.join(", ")||"none"}. Local model inference is not OpenAI-hosted execution.`},
    {requirement:"Source Grounding",status:evidence.grounded?"PASS":"PENDING",detail:"Report is built from persisted source/scan references; scanner patterns are not exploitability."},
    {requirement:"Security Enforcement",status:evidence.unsafe?"FAIL":evidence.guardedRequests>0?"PASS":"PENDING",detail:`${evidence.guardedRequests} persisted guarded requests; ${evidence.unsafe} denied requests with completed handlers.`}
  ]; return {status:checks.every(c=>c.status==="PASS")?"PASS":checks.some(c=>c.status==="FAIL")?"FAIL":"PENDING",verifiedSponsors:names,checks};
}
