// @vitest-environment happy-dom
// Synthetic DOM interactions only; these are not screenshots or real-model inference.
import { beforeAll, afterEach, expect, it, vi } from "vitest";
import { randomUUID } from "node:crypto";
import { cleanup, render, screen, fireEvent, waitFor } from "@testing-library/react";
import SecurityLab from "../src/components/workspace/security-lab";
import { IncidentDesk } from "../src/components/workspace/incident-desk";
import { snapshot } from "../src/server/service";
import { startExperiment, executeExperiment, experimentSnapshot } from "../src/server/lab";
import { labStartSchema } from "../src/lib/lab-contract";
import { preflightExperiment } from "../src/server/preflight";
import { benchmarkMetrics, evaluationBundles } from "../src/server/benchmarks";
import { callRuntime } from "../src/server/runtime";
import { modelConfiguration } from "../src/runtime/model";
import { exportEvidence } from "../src/server/evidence";
import { db } from "../src/server/db";
import type { State } from "../src/lib/view-types";
let state: State;
beforeAll(async () => {
  for (const scenario of ["normal", "prompt-injection"] as const) { const run = await startExperiment(labStartSchema.parse({ commandId: randomUUID(), scenario, mode: "local" })); await executeExperiment(run.runId, "http://127.0.0.1:3210", (name, resource, content, requestId, who) => callRuntime(who.actorId, who.sessionId, who.credential, name, { requestId, resource, ...(content ? { content } : {}) })); }
  state = JSON.parse(JSON.stringify(await snapshot()));
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.unstubAllEnvs(); vi.restoreAllMocks(); });
async function mount(configured = false) {
  if (configured) { vi.stubEnv("GHOSTOPS_MODEL_ENABLED", "1"); vi.stubEnv("GHOSTOPS_MODEL", "mock-ui-configuration"); vi.stubEnv("OPENAI_API_KEY", "fixture-never-transmitted"); }
  const data = JSON.parse(JSON.stringify(await experimentSnapshot())); data.configuration = modelConfiguration();
  const fetcher = vi.fn(async (url: string, options?: RequestInit) => {
    if (url.includes("preflight")) return new Response(JSON.stringify(await preflightExperiment(JSON.parse(options!.body as string))));
    if (url.includes("benchmarks")) return new Response(JSON.stringify(benchmarkMetrics(await evaluationBundles())));
    if (url.includes("/api/evidence/")) { const parts = url.split("/"); const result = await exportEvidence(parts[3] as "run" | "incident", parts[4]); return new Response(new Uint8Array(result.zip), { headers: { "x-ghostops-evidence-integrity": "local-hmac-and-hashes-verified" } }); }
    return new Response(JSON.stringify(options?.method === "POST" ? { runId: data.runs[0].id } : data));
  });
  vi.stubGlobal("fetch", fetcher); const navigate = vi.fn(); render(<SecurityLab state={state} csrf="fixture-csrf" inspectEvent={() => {}} navigate={navigate} />);
  await waitFor(() => expect(screen.getByText(/LIVE LOCAL AGENT/)).toBeTruthy()); return { fetcher, navigate };
}
it("model review is a dry preflight; only a second exact-run confirmation submits execution", async () => {
  const { fetcher } = await mount(true);
  fireEvent.change(screen.getByLabelText("Lab runtime"), { target: { value: "model" } }); fireEvent.click(screen.getByLabelText(/I authorize this bounded model run/));
  fireEvent.click(screen.getByRole("button", { name: "Review model preflight" }));
  await waitFor(() => expect(screen.getByRole("button", { name: "Confirm exact provider execution" })).toBeTruthy());
  expect(fetcher.mock.calls.filter(c => c[0] === "/api/lab" && c[1]?.method === "POST")).toHaveLength(0);
  fireEvent.click(screen.getByRole("button", { name: "Confirm exact provider execution" }));
  await waitFor(() => expect(fetcher.mock.calls.some(c => c[0] === "/api/lab" && c[1]?.method === "POST")).toBe(true));
  const review = JSON.parse(fetcher.mock.calls.find(c => c[0].includes("preflight"))![1]!.body as string), submitted = JSON.parse(fetcher.mock.calls.find(c => c[0] === "/api/lab" && c[1]?.method === "POST")![1]!.body as string);
  expect(submitted.commandId).toBe(review.commandId); expect(submitted.approvalToken).toEqual(expect.any(String)); expect(submitted.scenarioVersion).toBe("2.0");
});
it("a changed budget invalidates displayed approval without dispatching a provider run", async () => {
  const { fetcher } = await mount(true); fireEvent.change(screen.getByLabelText("Lab runtime"), { target: { value: "model" } }); fireEvent.click(screen.getByLabelText(/I authorize this bounded model run/)); fireEvent.click(screen.getByRole("button", { name: "Review model preflight" }));
  await waitFor(() => expect(screen.getByRole("button", { name: "Confirm exact provider execution" })).toBeTruthy());
  fireEvent.change(screen.getByLabelText("Model call budget"), { target: { value: "4" } }); fireEvent.click(screen.getByRole("button", { name: "Confirm exact provider execution" }));
  await waitFor(() => expect(screen.getByRole("alert").textContent).toContain("Setup changed")); expect(fetcher.mock.calls.filter(c => c[0] === "/api/lab" && c[1]?.method === "POST")).toHaveLength(0);
});
it("benchmark filters are read-only and display N/A instead of perfect empty-sample claims", async () => {
  const { fetcher } = await mount(); await waitFor(() => expect(screen.getByText("Attack versus defense benchmarks")).toBeTruthy());
  fireEvent.change(screen.getByLabelText("Benchmark scenario"), { target: { value: "containment" } }); await waitFor(() => expect(screen.getAllByText(/N\/A · zero qualifying/).length).toBeGreaterThan(0));
  expect(fetcher.mock.calls.every(c => c[1]?.method !== "POST")).toBe(true);
});
it("experiment evidence download uses authenticated persisted export, not a mock success banner", async () => {
  const { fetcher } = await mount(); vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:fixture-only"); vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
  fireEvent.click(screen.getByRole("button", { name: "Download experiment evidence" }));
  await waitFor(() => expect(fetcher.mock.calls.some(c => c[0].startsWith("/api/evidence/run/"))).toBe(true));
  await waitFor(() => expect(screen.getByRole("alert").textContent).toContain("server-verified local HMAC"));
});
it("mocked SDK receipts stay MOCK PROVIDER and cannot create a verified model badge", async () => {
  const run = (await experimentSnapshot()).runs[0];
  await db.modelInvocation.create({ data: { id: randomUUID(), runId: run.id, provider: "openai", model: "fixture", provenance: "mock-provider", status: "succeeded", responseId: "fixture-response" } });
  await mount(); expect(screen.queryByText(/MODEL-DRIVEN AGENT · verified provider/)).toBeNull(); expect(screen.getByText(/MOCK-PROVIDER · succeeded/)).toBeTruthy();
});
it("investigation report button is available without altering containment or evidence", async () => {
  render(<IncidentDesk state={state} busy={false} control={async () => {}} navigate={() => {}} />);
  expect(screen.getByRole("button", { name: "Download investigation report" })).toBeTruthy();
});
