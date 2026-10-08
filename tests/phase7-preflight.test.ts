import { randomUUID } from "node:crypto";
import { afterEach, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { labStartSchema } from "../src/lib/lab-contract";
import { evaluationConfiguration, preflightExperiment, verifyApproval } from "../src/server/preflight";
import { startExperiment, executeExperiment, experimentSnapshot } from "../src/server/lab";
import { db } from "../src/server/db";
import { invocationProof } from "../src/lib/evaluation-contract";
import { providerTransport, boundedModel } from "../src/runtime/model";
import { budgetsSchema } from "../src/lib/lab-contract";
import { Usage, type ModelRequest, type ModelResponse } from "@openai/agents";
import { POST } from "../src/app/api/lab/preflight/route";
import { transportToken } from "../src/server/config";
import { confirmLive } from "../src/runtime/operator-confirmation";
afterEach(() => vi.unstubAllEnvs());
const modelInput = () => labStartSchema.parse({ commandId: randomUUID(), mode: "model", scenario: "normal", confirmModelCost: true });
function enable() { vi.stubEnv("GHOSTOPS_MODEL_ENABLED", "1"); vi.stubEnv("GHOSTOPS_MODEL", "synthetic-fixture"); vi.stubEnv("OPENAI_API_KEY", "synthetic-private-not-transmitted"); vi.stubEnv("GHOSTOPS_MODEL_PROVIDER", "openai"); }
it("dry preflight has zero side effects and accurately reports unavailable credentials", async () => {
  const before = await db.experimentRun.count(); const receipt = await preflightExperiment(modelInput());
  expect(receipt.canExecute).toBe(false); expect(receipt.maximumModelCalls).toBe(3); expect(receipt.estimatedUsage).toBeNull();
  expect(await db.experimentRun.count()).toBe(before); expect(receipt.network).toContain("https://api.openai.com/v1/responses");
});
it("requires a fresh signed exact-run approval even with environment enablement and old cost consent", async () => {
  enable(); const input = modelInput(); await expect(startExperiment(input)).rejects.toThrow("preflight");
  const preflight = await preflightExperiment(input);
  const receipt = await startExperiment({ ...input, approvalToken: preflight.approvalToken }); expect(receipt.replayed).toBe(false);
  expect(await startExperiment({ ...input, approvalToken: preflight.approvalToken })).toEqual({ ...receipt, replayed: true });
});
it("rejects approval reuse with a changed scenario, model, command, budget, policy or credential", async () => {
  enable(); const input = modelInput(), preflight = await preflightExperiment(input), configuration = await evaluationConfiguration(input);
  const approved = { ...input, approvalToken: preflight.approvalToken };
  expect(() => verifyApproval(approved, configuration)).not.toThrow();
  for (const change of [{ scenario: "prompt-injection" as const }, { commandId: randomUUID() }, { budgets: { ...input.budgets, maxCalls: 8 } }]) expect(() => verifyApproval({ ...approved, ...change }, configuration)).toThrow();
  expect(() => verifyApproval(approved, { ...configuration, policyHash: "changed" })).toThrow();
  vi.stubEnv("GHOSTOPS_MODEL", "other-model"); expect(() => verifyApproval(approved, { ...configuration, provider: { ...configuration.provider!, model: "other-model" } })).toThrow();
  vi.stubEnv("OPENAI_API_KEY", "rotated-project-only-fixture"); expect(() => verifyApproval(approved, configuration)).toThrow();
});
it("rejects expired and altered preflight receipts without creating an experiment", async () => {
  enable(); const input = modelInput(), p = await preflightExperiment(input), c = await evaluationConfiguration(input);
  expect(() => verifyApproval({ ...input, approvalToken: p.approvalToken }, c, p.expiresAt)).toThrow("expired");
  expect(() => verifyApproval({ ...input, approvalToken: `${p.approvalToken}altered` }, c)).toThrow();
  expect(JSON.stringify(p)).not.toContain("synthetic-private-not-transmitted");
});
it("cannot inject a caller-created verified-provider receipt or arbitrary scenario version", () => {
  expect(() => labStartSchema.parse({ ...modelInput(), provenance: "verified-provider", invocations: [{ responseId: "resp_forged" }] })).toThrow();
  expect(() => labStartSchema.parse({ ...modelInput(), scenarioVersion: "999" })).toThrow();
  expect(() => labStartSchema.parse({ ...modelInput(), scenario: "multi-step", mode: "local", scenarioVersion: "1.0" })).toThrow();
});
it("a successful SDK response alone or legacy metadata never establishes provider inference", () => {
  expect(invocationProof({ status: "succeeded", responseId: "resp_fixture", reportedModel: "fixture" })).toBe(false);
  expect(invocationProof({ status: "succeeded", provenance: "mock-provider", responseId: "resp_fixture", reportedModel: "fixture" })).toBe(false);
  expect(invocationProof({ status: "failed", provenance: "verified-provider", responseId: "resp_fixture", reportedModel: "fixture" })).toBe(false);
  expect(invocationProof({ status: "succeeded", provenance: "verified-provider", responseId: "resp_fixture" })).toBe(false);
  expect(invocationProof({ status: "succeeded", provenance: "verified-provider", responseId: "resp_fixture", reportedModel: "fixture" })).toBe(true); // Classification fixture, not actual inference.
});
it("the provider transport refuses external calls in automated tests before invoking fetch", async () => {
  const fetcher = vi.fn<typeof fetch>(); const transport = providerTransport(fetcher);
  await expect(transport.fetch("https://api.openai.com/v1/responses", { method: "POST" })).rejects.toThrow("automated tests"); expect(fetcher).not.toHaveBeenCalled();
});
it("the transport pins the exact endpoint and collects only official response metadata", async () => {
  // Mock HTTP transport under production branch to exercise parsing; NOT provider verification.
  vi.stubEnv("NODE_ENV", "production"); vi.stubEnv("CI", "");
  const fetcher = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify({ id: "resp_fixture", object: "response", status: "completed", model: "reported-fixture", output: [] })));
  const t = providerTransport(fetcher);
  await expect(t.fetch("https://unapproved.invalid/v1/responses")).rejects.toThrow("endpoint");
  await t.fetch("https://api.openai.com/v1/responses", { method: "POST" }); expect(t.proof("resp_fixture")).toMatchObject({ reportedModel: "reported-fixture", provenance: "mock-provider" }); expect(t.proof("resp_forged")).toBeUndefined(); expect(fetcher.mock.calls[0][1]?.redirect).toBe("error");
});
it("cancelled adapter work cannot return a response for subsequent privileged dispatch", async () => {
  const controller = new AbortController(), receipts: unknown[] = [];
  const response: ModelResponse = { responseId: "fixture", output: [], usage: new Usage({ totalTokens: 20 }) };
  const adapter = { async getResponse() { controller.abort(); return response; }, getStreamedResponse() { throw new Error("disabled"); } };
  const model = boundedModel(adapter, "fixture", budgetsSchema.parse({}), controller.signal, async () => {}, async r => { receipts.push(r); });
  await expect(model.getResponse({ input: "synthetic", tools: [], modelSettings: {} } as unknown as ModelRequest)).rejects.toThrow(); expect(receipts).toHaveLength(2);
});
it("preflight route rejects agent-only credentials without independent administration", async () => {
  const request = new NextRequest("http://127.0.0.1:3210/api/lab/preflight", { method: "POST", headers: { host: "127.0.0.1:3210", "x-ghostops-transport": transportToken(), authorization: "Bearer synthetic", "content-type": "application/json" }, body: JSON.stringify(modelInput()) });
  expect((await POST(request)).status).toBe(401);
});
it("credential rotation between queued approval and dispatch stops inference and stays private", async () => {
  enable();
  // Interrupt the earlier queued fixture rather than reusing its authority.
  await db.experimentRun.updateMany({ where: { slot: "local" }, data: { status: "interrupted", slot: null } });
  const input = modelInput(), p = await preflightExperiment(input), started = await startExperiment({ ...input, approvalToken: p.approvalToken });
  vi.stubEnv("OPENAI_API_KEY", "rotated-private-fixture"); await executeExperiment(started.runId, "http://127.0.0.1:3210");
  const run = await db.experimentRun.findUniqueOrThrow({ where: { id: started.runId } }); expect(run.status).toBe("failed"); expect(await db.modelInvocation.count({ where: { runId: run.id } })).toBe(0);
  expect(JSON.stringify(await experimentSnapshot())).not.toContain("providerCredentialDigest");
});
it("legacy successful SDK receipts are not retrospectively promoted by old result counters", async () => {
  const run = await db.experimentRun.findFirstOrThrow();
  await db.experimentRun.update({ where: { id: run.id }, data: { results: { verifiedModelCalls: 99 } } });
  await db.modelInvocation.create({ data: { id: randomUUID(), runId: run.id, provider: "openai", model: "legacy-fixture", status: "succeeded", responseId: "fixture", provenance: "unverified" } });
  expect((await experimentSnapshot()).runs.find(r => r.id === run.id)?.results.verifiedModelCalls).toBe(0);
});
it("CLI live flags cannot substitute for interactive confirmation or authorize CI inference", async () => {
  await expect(confirmLive("synthetic-run", false)).rejects.toThrow("--live");
  vi.stubEnv("CI", "true"); await expect(confirmLive("synthetic-run", true)).rejects.toThrow("forbidden in CI");
});
