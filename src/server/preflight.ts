import { labStartSchema, type LabStart } from "@/lib/lab-contract";
import { researchPermissions, scenarioDefinition } from "@/lib/evaluation-contract";
import { modelConfiguration } from "@/runtime/model";
import { db } from "./db";
import { mac, secureEqual, credentialDigest } from "./config";
import { hash } from "./memory";
import { ConflictError } from "./gateway";
import { canonical } from "@/lib/canonical";
import type { Prisma } from "@/generated/prisma/client";

export async function evaluationConfiguration(input: LabStart, store: Pick<Prisma.TransactionClient, "agent"> = db) {
  const agent = input.agentId !== "new" && input.mode !== "offline" ? await store.agent.findUnique({ where: { id: input.agentId } }) : null;
  if (input.agentId !== "new" && input.mode !== "offline" && (!agent || agent.simulated || agent.status !== "active")) throw new ConflictError("Preflight requires an active integrated identity");
  return { scenario: scenarioDefinition(input.scenario, input.scenarioVersion, input.variant), permissions: agent?.permissions ?? researchPermissions,
    policyVersion: "gateway-v1", policyHash: hash(canonical(agent?.permissions ?? researchPermissions)), provider: input.mode === "model" ? modelConfiguration() : null };
}
export async function preflightExperiment(raw: unknown) {
  const input = labStartSchema.parse(raw), configuration = await evaluationConfiguration(input);
  const expiresAt = Date.now() + 120000;
  const clean = { ...input, approvalToken: undefined };
  const payload = Buffer.from(JSON.stringify({ commandId: input.commandId, expiresAt, binding: binding(clean, configuration) })).toString("base64url");
  return { formatVersion: 1, commandId: input.commandId, scenario: configuration.scenario, mode: input.mode, provider: configuration.provider,
    maximumModelCalls: input.mode === "model" ? input.budgets.maxCalls : 0, maximumTurns: input.budgets.maxCalls, budgets: input.budgets,
    estimatedUsage: null, estimationLimit: "Input depends on tool responses; byte reservation and reported-token limits are not a billing ceiling",
    permissions: configuration.permissions, policyHash: configuration.policyHash, network: input.mode === "model" ? [`${configuration.provider?.endpoint}/responses`, "loopback MCP"] : ["loopback only"],
    credentialsRequired: input.mode === "model" ? "Explicit server enablement, configured model, server-held project credential and fresh confirmation" : "Private scoped run credential, issued internally",
    canExecute: input.mode !== "model" || !!configuration.provider?.ready, expiresAt, approvalToken: `${payload}.${mac(`model-approval:v1:${payload}`)}` };
}
export function verifyApproval(input: LabStart, configuration: Awaited<ReturnType<typeof evaluationConfiguration>>, now = Date.now()) {
  const [payload, tag, extra] = (input.approvalToken ?? "").split(".");
  if (extra || !payload || !tag || !secureEqual(tag, mac(`model-approval:v1:${payload}`))) throw new ConflictError("Fresh exact-experiment preflight confirmation required");
  let receipt: { commandId: string; expiresAt: number; binding: string };
  try { receipt = JSON.parse(Buffer.from(payload, "base64url").toString()); } catch { throw new ConflictError("Invalid preflight confirmation"); }
  if (!Number.isSafeInteger(receipt.expiresAt) || receipt.expiresAt <= now || receipt.expiresAt > now + 120000 || receipt.commandId !== input.commandId || receipt.binding !== binding({ ...input, approvalToken: undefined }, configuration)) throw new ConflictError("Preflight expired or configuration changed; confirm again");
}
function binding(input: LabStart, configuration: Awaited<ReturnType<typeof evaluationConfiguration>>) { return hash(canonical({ input, configuration, credentialVersion: input.mode === "model" ? credentialDigest(configuration.provider?.provider === "local-responses" ? process.env.GHOSTOPS_LOCAL_MODEL_KEY ?? "" : process.env.OPENAI_API_KEY ?? "") : null })); }
