import { z } from "zod";
import { budgetsSchema } from "./lab-contract";
export const sponsorNames = ["OpenAI", "Semgrep", "ClickHouse", "MongoDB", "Senso", "Guild.ai", "ElevenLabs", "Akash Network", "AWS", "Pi Security", "Induction Labs"] as const;
export type Sponsor = typeof sponsorNames[number];
export const integrationStatuses = ["VERIFIED LIVE", "VERIFIED LOCAL", "IMPLEMENTED BUT UNVERIFIED", "CONFIGURATION REQUIRED", "RESEARCH ONLY", "UNAVAILABLE"] as const;
export const sponsorActionSchema = z.object({
  commandId: z.string().uuid(), action: z.enum(["scan", "telemetry", "analytics", "index", "search", "context", "narrate", "otlp", "model-org"]),
  target: z.enum(["vulnerable", "corrected", "approved-repository", "runtime-artifact"]).optional(), requestId: z.string().uuid().optional(),
  query: z.string().trim().min(1).max(100).optional(), incidentId: z.string().uuid().optional(),
  fixture: z.boolean().default(false), scenario:z.enum(["normal","prompt-injection","memory-poisoning"]).default("normal"), contextId:z.string().uuid().optional(), budgets:budgetsSchema.default(()=>budgetsSchema.parse({})), approvalToken: z.string().max(4096).optional()
}).strict().superRefine((v,c) => {
  if (v.action === "scan" && !v.target) c.addIssue({code:"custom",message:"An approved target is required"});
  if (v.target === "runtime-artifact" && !v.requestId) c.addIssue({code:"custom",message:"Verified artifact request required"});
  if (["search","context"].includes(v.action) && !v.query) c.addIssue({code:"custom",message:"Bounded query required"});
  if (v.action === "narrate" && !v.incidentId) c.addIssue({code:"custom",message:"Persisted incident required"});
  if (v.fixture && v.action !== "context") c.addIssue({code:"custom",message:"Only local context has a fixture mode"});
});
export type SponsorAction = z.infer<typeof sponsorActionSchema>;
export const sponsorForAction: Record<SponsorAction["action"], Sponsor> = {scan:"Semgrep",telemetry:"ClickHouse",analytics:"ClickHouse",index:"MongoDB",search:"MongoDB",context:"Senso",narrate:"ElevenLabs",otlp:"AWS","model-org":"OpenAI"};
export const capabilities: Record<Sponsor,string> = {OpenAI:"Official Agents SDK, bounded specialist model runs via guarded MCP",Semgrep:"Local CE code scans, fingerprinted findings and comparisons",ClickHouse:"Sanitized telemetry delivery and duplicate-tolerant analytics",MongoDB:"Read-oriented incident index with stable evidence references",Senso:"Context passages with document/version provenance, always untrusted", "Guild.ai":"Compatibility research: hosted integration and network-isolation boundary",ElevenLabs:"Manual evidence-backed spoken summaries", "Akash Network":"Synthetic worker SDL preparation; no deployment",AWS:"Local OTLP JSON projection for an approved collector; no AWS deployment", "Pi Security":"Product-security API availability research", "Induction Labs":"Research only; no documented service integration"};
/** No caller URL is accepted. Destination configuration is operator-held. */
export function approvedHttpEndpoint(value: string, local = false) {
  const u = new URL(value);
  if (u.username || u.password || u.search || u.hash || (u.protocol !== "https:" && !(local && u.protocol === "http:" && u.hostname === "127.0.0.1"))) throw new Error("Invalid approved endpoint");
  return u.href.replace(/\/$/, "");
}
export type ContextPassage = { contentId: string; versionId: string | null; chunkId: string | null; text: string; contentHash: string; trust: "untrusted"; provenance: "local-fixture" | "senso-api" };
