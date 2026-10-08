import { z } from "zod";

const id = z.string().min(1).max(100).regex(/^[a-zA-Z0-9_.:-]+$/);
export const actionSchema = z.object({
  requestId: id, actorId: id, sessionId: id,
  tool: z.enum(["documents", "summarize", "status", "restart", "tickets", "respond", "credentials", "deploy", "memory", "mcp", "http"]),
  operation: z.enum(["read", "write", "execute", "ingest"]),
  resource: z.string().min(1).max(160),
  destination: z.string().max(160).optional(),
  content: z.string().max(4000).optional(),
  sourceId: id.optional()
}).strict();
export type AgentAction = z.infer<typeof actionSchema>;
export const commandSchema = z.object({
  commandId: z.string().uuid(),
  action: z.enum(["initialize", "reset", "normal", "rogue", "poisoning", "compromise", "quarantine", "revoke", "restore-agent", "restore-memory", "verify-memory", "replay", "start-story", "advance-story"]),
  targetId: id.optional(),
  expectedStep: z.number().int().min(0).max(9).optional()
}).strict().superRefine((v, ctx) => {
  if (["quarantine", "revoke", "restore-agent", "restore-memory", "verify-memory", "replay", "advance-story"].includes(v.action) && !v.targetId)
    ctx.addIssue({ code: "custom", message: "A target is required", path: ["targetId"] });
  if (v.action === "advance-story" && v.expectedStep === undefined) ctx.addIssue({ code: "custom", message: "Expected story step is required", path: ["expectedStep"] });
  if (v.action !== "advance-story" && v.expectedStep !== undefined) ctx.addIssue({ code: "custom", message: "Unexpected step", path: ["expectedStep"] });
});
export type ManagementCommand = z.infer<typeof commandSchema>;
export type Module = "AgentDNA" | "ShadowWatch" | "MemoryGuard" | "GhostTrap" | "Gateway" | "Response";
export type Severity = "info" | "low" | "medium" | "high" | "critical";
export type Permissions = { tools: string[]; resources: string[]; destinations: string[] };
export type Counts = Record<string, number>;
