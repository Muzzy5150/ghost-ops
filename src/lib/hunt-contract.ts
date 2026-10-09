import { z } from "zod";
export const huntMode = z.enum(["OBSERVE", "APPROVAL_REQUIRED", "AUTOMATIC"]);
export const huntCommandSchema = z.discriminatedUnion("action", [
  z.object({ commandId: z.string().uuid(), action: z.literal("scope"), name: z.string().min(1).max(64), agentIds: z.array(z.string().regex(/^live-[a-zA-Z0-9_-]{1,48}$/)).min(1).max(8) }).strict(),
  z.object({ commandId: z.string().uuid(), action: z.literal("configure"), scopeId: z.string().uuid(), mode: huntMode, learningWindow: z.number().int().min(4).max(200).default(100), evaluationWindow: z.number().int().min(2).max(20).default(10), maxActionsPerHour: z.number().int().min(1).max(8).default(4) }).strict(),
  z.object({ commandId: z.string().uuid(), action: z.literal("baseline"), scopeId: z.string().uuid(), actorId: z.string().max(64) }).strict(),
  z.object({ commandId: z.string().uuid(), action: z.literal("deploy"), scopeId: z.string().uuid(), template: z.enum(["credentials", "admin", "memory", "adaptive"]), reasonEventId: z.string().uuid() }).strict(),
  z.object({ commandId: z.string().uuid(), action: z.literal("cleanup"), deploymentId: z.string().uuid() }).strict(),
  z.object({ commandId: z.string().uuid(), action: z.literal("preview"), scopeId: z.string().uuid(), actorId: z.string().max(64), response: z.enum(["quarantine", "revoke"]).default("quarantine") }).strict(),
  z.object({ commandId: z.string().uuid(), action: z.enum(["approve", "reject"]), planId: z.string().uuid() }).strict()
]);
export const deceptionCatalog = {
  credentials: { resource: "decoy/credentials", tool: "credentials", name: "Synthetic credential document", category: "credential", description: "Inert, unusable credential marker; no secret or network." },
  admin: { resource: "decoy/admin", tool: "mcp", name: "Mock administrative capability", category: "administration", description: "Inert restricted MCP operation, never command execution." },
  memory: { resource: "decoy/memory", tool: "memory", name: "Synthetic memory trap", category: "memory", description: "No protected policy or production memory exposed." }
} as const;
