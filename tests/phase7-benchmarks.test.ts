import { beforeAll, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { scenarios, labStartSchema } from "../src/lib/lab-contract";
import { startExperiment, executeExperiment } from "../src/server/lab";
import { callRuntime } from "../src/server/runtime";
import { benchmarkMetrics, evaluateBundle, evaluationBundles, type EvaluationBundle } from "../src/server/benchmarks";
import { db } from "../src/server/db";
let bundles: EvaluationBundle[];
beforeAll(async () => {
  for (const scenario of scenarios) { const start = await startExperiment(labStartSchema.parse({ commandId: randomUUID(), scenario, mode: "local" })); await executeExperiment(start.runId, "http://127.0.0.1:3210", (name, resource, content, requestId, who) => callRuntime(who.actorId, who.sessionId, who.credential, name, { requestId, resource, ...(content ? { content } : {}) })); }
  bundles = await evaluationBundles();
});
it("computes metrics from all eight actually completed scenario records", () => {
  const report = benchmarkMetrics(bundles);
  expect(report.metrics.coverage).toMatchObject({ numerator: 8, denominator: 8, value: 1 });
  expect(report.metrics.legitimateTaskCompletion).toMatchObject({ numerator: 5, denominator: 5 });
  expect(report.metrics.unsafeExecutionCount).toBe(0); expect(report.metrics.policyBlock.value).toBe(1);
});
it("uses N/A for zero qualifying denominators, not fabricated perfect defense", () => {
  const metrics = benchmarkMetrics([]).metrics;
  for (const key of ["policyBlock", "memoryProtection", "containment", "falsePositive", "honeypotDetection", "legitimateTaskCompletion"] as const) expect(metrics[key]).toMatchObject({ denominator: 0, value: null });
  expect(metrics.coverage).toMatchObject({ numerator: 0, denominator: 8, value: 0 });
});
it("separates scripted actor poisoning decisions from independent enforcement probes", () => {
  const injection = evaluateBundle(bundles.find(b => b.run.scenario === "prompt-injection")!);
  expect(injection.actorDecisions.prohibitedAttempts).toBe(0); expect(injection.enforcementProbes.prohibitedAttempts).toBe(1);
  const memory = evaluateBundle(bundles.find(b => b.run.scenario === "memory-poisoning")!);
  expect(memory.actorDecisions.prohibitedAttempts).toBe(1); expect(memory.enforcementProbes.prohibitedAttempts).toBe(1);
  expect(memory.memoryProtection).toMatchObject({ numerator: 2, denominator: 2 });
});
it("does not classify an unfamiliar permitted benign sequence as confirmed compromise", () => {
  const benign = evaluateBundle(bundles.find(b => b.run.scenario === "benign-edge")!);
  expect(benign.legitimateTask.completed).toBe(true); expect(benign.denied).toBe(0); expect(benign.deviations).toBeGreaterThan(0); expect(benign.falsePositive).toBe(false);
  expect(benchmarkMetrics(bundles).metrics.falsePositive).toMatchObject({ numerator: 0, denominator: 2 });
});
it("a prohibited operation reaching a handler is counted unsafe independently of an allowed flag", () => {
  const original = bundles.find(b => b.run.scenario === "honeypot")!;
  const changed: EvaluationBundle = { ...original, requests: original.requests.map(r => ({ ...r, allowed: true, reason: "AUTHORIZED", execution: { handlerExecuted: true } })) };
  const result = evaluateBundle(changed); expect(result.unsafeExecutionCount).toBe(1); expect(result.policyBlocks.numerator).toBe(0); expect(result.policyBlocks.denominator).toBe(1);
});
it("verifies identity, trap and containment evidence with correct qualifying requests", () => {
  const identity = evaluateBundle(bundles.find(b => b.run.scenario === "impersonation")!); expect(identity.policyBlocks).toMatchObject({ numerator: 2, denominator: 2 });
  const containment = evaluateBundle(bundles.find(b => b.run.scenario === "containment")!); expect(containment.containment).toMatchObject({ numerator: 1, denominator: 1 });
  expect(evaluateBundle(bundles.find(b => b.run.scenario === "honeypot")!).honeypotDetection).toMatchObject({ numerator: 1, denominator: 1 });
});
it("retains scenario and policy versions, variant and configuration for repeat comparisons", async () => {
  const start = await startExperiment(labStartSchema.parse({ commandId: randomUUID(), scenario: "benign-edge", variant: "alternate-sequence", mode: "offline" })); await executeExperiment(start.runId, "http://127.0.0.1:3210");
  const run = await db.experimentRun.findUniqueOrThrow({ where: { id: start.runId } }); expect(run.scenarioVersion).toBe("2.0"); expect(run.configuration).toMatchObject({ policyVersion: "gateway-v1", policyHash: expect.any(String), scenario: { variant: "alternate-sequence" } });
  const selected = (await evaluationBundles()).filter(b => b.run.id === run.id); const metrics = benchmarkMetrics(selected); expect(metrics.rows[0].provenance).toBe("scripted"); expect(metrics.rows[0].handlerExecutions).toBe(0);
});
it("latency samples link actual request and detector timestamps without claiming inference latency", () => {
  const row = evaluateBundle(bundles.find(b => b.run.scenario === "honeypot")!);
  expect(row.latency.samples.length).toBeGreaterThan(0); expect(row.latency.samples.every(s => s.milliseconds >= 0 && s.requestId && s.eventId && s.requestTimestamp && s.detectionTimestamp)).toBe(true);
});
it("incomplete runs do not inflate completed-run effectiveness denominators", () => {
  const unfinished: EvaluationBundle = { ...bundles[0], run: { ...bundles[0].run, status: "cancelled" } }; expect(benchmarkMetrics([unfinished]).metrics.policyBlock.denominator).toBe(0); expect(benchmarkMetrics([unfinished]).metrics.coverage.numerator).toBe(0);
});
