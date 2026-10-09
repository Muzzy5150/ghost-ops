import { expect, it, vi } from "vitest";
import { Usage, type Model, type ModelRequest, type ModelResponse } from "@openai/agents";
import { boundedModel, modelConfiguration, runModelAgent } from "../src/runtime/model";
import { budgetsSchema } from "../src/lib/lab-contract";
const request: ModelRequest = { input: "Synthetic research", systemInstructions: "Use bounded tools", modelSettings: {}, tools: [], outputType: "text", handoffs: [], tracing: false };
const response = (tokens = 100): ModelResponse => ({ usage: new Usage({ inputTokens: 80, outputTokens: 20, totalTokens: tokens }), output: [], responseId: "synthetic-test-response" });
function adapter(fn: () => Promise<ModelResponse>): Model { return { getResponse: fn, getStreamedResponse() { throw new Error("No streaming"); } }; }
it("model configuration requires explicit enablement, credentials, supported provider and a safe model identifier", () => {
  expect(modelConfiguration({})).toMatchObject({ ready: false, enabled: false });
  expect(modelConfiguration({ OPENAI_API_KEY: "test-never-sent", GHOSTOPS_MODEL: "operator-model" }).ready).toBe(false);
  expect(modelConfiguration({ OPENAI_API_KEY: "test-never-sent", GHOSTOPS_MODEL: "operator-model", GHOSTOPS_MODEL_ENABLED: "1" }).ready).toBe(true);
  expect(modelConfiguration({ OPENAI_API_KEY: "test-never-sent", GHOSTOPS_MODEL: "secret\nvalue", GHOSTOPS_MODEL_ENABLED: "1" }).model).toBeNull();
  expect(modelConfiguration({ OPENAI_API_KEY: "test-never-sent", GHOSTOPS_MODEL: "operator-model", GHOSTOPS_MODEL_ENABLED: "1", GHOSTOPS_MODEL_PROVIDER: "arbitrary-url" }).ready).toBe(false);
});
it("records adapter response metadata only and enforces a strict model-call ceiling", async () => {
  const inner = vi.fn(async () => response()), receipts: unknown[] = [];
  const model = boundedModel(adapter(inner), "test-model", budgetsSchema.parse({ maxCalls: 1 }), new AbortController().signal, async () => {}, async r => { receipts.push(r); });
  expect((await model.getResponse(request)).responseId).toBe("synthetic-test-response");
  await expect(model.getResponse(request)).rejects.toThrow("budget"); expect(inner).toHaveBeenCalledTimes(1);
  expect(receipts).toEqual([expect.objectContaining({ status: "started" }), expect.objectContaining({ status: "succeeded", totalTokens: 100, responseId: "synthetic-test-response" })]);
  expect(JSON.stringify(receipts)).not.toContain(request.input);
});
it("checks cancellation and authority before sending any inference request", async () => {
  const inner = vi.fn(async () => response()), controller = new AbortController(); controller.abort();
  const model = boundedModel(adapter(inner), "test-model", budgetsSchema.parse({}), controller.signal, async () => {}, async () => {});
  await expect(model.getResponse(request)).rejects.toThrow(); expect(inner).not.toHaveBeenCalled();
  const deny = boundedModel(adapter(inner), "test-model", budgetsSchema.parse({}), new AbortController().signal, async () => { throw new Error("cancelled"); }, async () => {});
  await expect(deny.getResponse(request)).rejects.toThrow("cancelled"); expect(inner).not.toHaveBeenCalled();
});
it("rejects oversized input and exhausted token reservation before inference", async () => {
  const inner = vi.fn(async () => response());
  const model = boundedModel(adapter(inner), "test-model", budgetsSchema.parse({}), new AbortController().signal, async () => {}, async () => {});
  await expect(model.getResponse({ ...request, input: "x".repeat(17000) })).rejects.toThrow("reservation"); expect(inner).not.toHaveBeenCalled();
});
it("does not retry provider failures or store secret-bearing exceptions", async () => {
  const inner = vi.fn(async () => { throw new Error("sensitive-provider-value"); }), receipts: unknown[] = [];
  const model = boundedModel(adapter(inner), "test-model", budgetsSchema.parse({}), new AbortController().signal, async () => {}, async r => { receipts.push(r); });
  await expect(model.getResponse(request)).rejects.toThrow("provider details omitted"); expect(inner).toHaveBeenCalledTimes(1);
  expect(receipts).toEqual([expect.objectContaining({ status: "started" }), expect.objectContaining({ status: "failed" })]);
  expect(JSON.stringify(receipts)).not.toContain("sensitive-provider-value");
});
it("stops after missing usage and reported token overflow instead of granting more model or tool work", async () => {
  const inner = vi.fn(async () => response(0));
  const model = boundedModel(adapter(inner), "test-model", budgetsSchema.parse({}), new AbortController().signal, async () => {}, async () => {});
  await model.getResponse(request); await expect(model.getResponse(request)).rejects.toThrow("budget");
  const overflow = boundedModel(adapter(async () => response(20000)), "test-model", budgetsSchema.parse({}), new AbortController().signal, async () => {}, async () => {});
  await expect(overflow.getResponse(request)).rejects.toThrow("Reported model token budget");
});
it("overrides model output limits, tracing, parallel calls, storage and retries at the adapter boundary", async () => {
  let received: ModelRequest | undefined;
  const model = boundedModel({ getResponse: async r => { received = r; return response(); }, getStreamedResponse() { throw new Error("disabled"); } }, "test-model", budgetsSchema.parse({ maxOutputTokens: 100 }), new AbortController().signal, async () => {}, async () => {});
  await model.getResponse(request);
  expect(received).toMatchObject({ tracing: false, modelSettings: { maxTokens: 100, parallelToolCalls: false, store: false, retry: { maxRetries: 0 } } });
});
it("refuses unconfigured model execution without silently falling back or calling tools", async () => {
  const call = vi.fn(); await expect(runModelAgent({ call }, "Synthetic task")).rejects.toThrow("explicit enablement"); expect(call).not.toHaveBeenCalled();
});
