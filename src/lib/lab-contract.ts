import { z } from "zod";
export const scenarios = ["normal", "prompt-injection", "memory-poisoning", "impersonation", "honeypot", "containment", "multi-step", "benign-edge"] as const;
export const scenarioNames: Record<typeof scenarios[number], string> = {
  normal: "A · Normal research", "prompt-injection": "B · Untrusted instructions", "memory-poisoning": "C · Protected memory", impersonation: "D · Identity impersonation", honeypot: "E · Synthetic decoy", containment: "F · Containment verification", "multi-step": "G · Multi-step trust boundary", "benign-edge": "H · Benign unusual workflow"
};
export const budgetsSchema = z.object({
  maxCalls: z.number().int().min(1).max(8).default(3), maxTokens: z.number().int().min(1024).max(64000).default(16000),
  maxOutputTokens: z.number().int().min(64).max(1500).default(600), maxToolCalls: z.number().int().min(1).max(16).default(12),
  timeoutMs: z.number().int().min(1000).max(180000).default(60000)
}).strict();
export const labStartSchema = z.object({ commandId: z.string().uuid(), scenario: z.enum(scenarios), mode: z.enum(["offline", "local", "model"]),
  scenarioVersion: z.enum(["1.0", "2.0"]).default("2.0"), variant: z.enum(["standard", "alternate-sequence"]).default("standard"), approvalToken: z.string().max(4096).optional(),
  agentId: z.union([z.literal("new"), z.string().regex(/^live-[a-zA-Z0-9_-]{1,48}$/)]).default("new"),
  confirmModelCost: z.boolean().default(false), confirmContainment: z.boolean().default(false), budgets: budgetsSchema.default(() => budgetsSchema.parse({}))
}).strict().superRefine((v, c) => {
  if (v.mode === "model" && !v.confirmModelCost) c.addIssue({ code: "custom", message: "Explicit model-cost consent required", path: ["confirmModelCost"] });
  if (v.scenario === "containment" && v.agentId !== "new" && !v.confirmContainment) c.addIssue({ code: "custom", message: "Selected identity quarantine confirmation required", path: ["confirmContainment"] });
  if (v.mode === "model" && !["normal", "prompt-injection", "memory-poisoning"].includes(v.scenario)) c.addIssue({ code: "custom", message: "Identity/decoy/containment regressions are deterministic; use local mode", path: ["mode"] });
  if (["multi-step", "benign-edge"].includes(v.scenario) && v.scenarioVersion !== "2.0") c.addIssue({ code: "custom", message: "This scenario requires version 2.0", path: ["scenarioVersion"] });
  if (v.variant !== "standard" && v.scenario !== "benign-edge") c.addIssue({ code: "custom", message: "Alternate sequence is a benign-edge variation only", path: ["variant"] });
});
export const labCancelSchema = z.object({ commandId: z.string().uuid(), runId: z.string().uuid() }).strict();
export type LabStart = z.infer<typeof labStartSchema>;
export type Budgets = z.infer<typeof budgetsSchema>;
