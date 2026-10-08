// @vitest-environment happy-dom
// Nonvisual interactions: not real-browser QA. Data below comes from actual backend experiments.
import { beforeAll, afterEach, expect, it, vi } from "vitest";
import { randomUUID } from "node:crypto";
import { cleanup, render, screen, waitFor, fireEvent } from "@testing-library/react";
import SecurityLab from "../src/components/workspace/security-lab";
import { EvidenceInspector } from "../src/components/workspace/inspectors";
import { labStartSchema } from "../src/lib/lab-contract";
import { startExperiment, executeExperiment, experimentSnapshot } from "../src/server/lab";
import { callRuntime } from "../src/server/runtime";
import { snapshot } from "../src/server/service";
import { defaultLayout, parsePreferences, workspaceReducer } from "../src/lib/workspace-model";
import type { State } from "../src/lib/view-types";
let state: State, data: unknown;
beforeAll(async () => {
  const start = await startExperiment(labStartSchema.parse({ commandId: randomUUID(), scenario: "prompt-injection", mode: "local" }));
  await executeExperiment(start.runId, "http://127.0.0.1:3210", (name, resource, content, requestId, who) => callRuntime(who.actorId, who.sessionId, who.credential, name, { requestId, resource, ...(content ? { content } : {}) }));
  state = JSON.parse(JSON.stringify(await snapshot())); data = JSON.parse(JSON.stringify(await experimentSnapshot()));
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
function renderLab() {
  const fetcher = vi.fn(async (_url: string, options?: RequestInit) => new Response(JSON.stringify(options?.method === "POST" ? { runId: "persisted-command-receipt" } : data), { status: 200, headers: { "content-type": "application/json" } }));
  vi.stubGlobal("fetch", fetcher);
  const inspectEvent = vi.fn(), navigate = vi.fn();
  render(<SecurityLab state={state} csrf="synthetic-csrf-test" inspectEvent={inspectEvent} navigate={navigate} />);
  return { fetcher, inspectEvent, navigate };
}
it("displays real local results without a fabricated model badge", async () => {
  renderLab(); await waitFor(() => expect(screen.getByText(/LIVE LOCAL AGENT/)).toBeTruthy());
  expect(screen.queryByText(/MODEL-DRIVEN AGENT · verified/)).toBeNull(); expect(screen.getByText("No model inference occurred.")).toBeTruthy();
  expect(screen.getByText(/POLICY BLOCK/)).toBeTruthy();
});
it("starts a bounded scenario using CSRF and an idempotency ID, not a security control shortcut", async () => {
  const { fetcher } = renderLab(); await waitFor(() => expect(screen.getByText(/LIVE LOCAL AGENT/)).toBeTruthy());
  fireEvent.change(screen.getByLabelText("Lab scenario"), { target: { value: "memory-poisoning" } });
  fireEvent.click(screen.getByRole("button", { name: "Start experiment" }));
  await waitFor(() => expect(fetcher.mock.calls.some(c => c[1]?.method === "POST")).toBe(true));
  const [path, options] = fetcher.mock.calls.find(c => c[1]?.method === "POST")!;
  expect(path).toBe("/api/lab"); expect(options!.headers).toMatchObject({ "x-ghostops-csrf": "synthetic-csrf-test" });
  expect(JSON.parse(options!.body as string)).toMatchObject({ scenario: "memory-poisoning", mode: "local", agentId: "new", commandId: expect.any(String) });
});
it("opens persisted event evidence and associated incident rather than inventing records", async () => {
  const { inspectEvent, navigate } = renderLab(); await waitFor(() => expect(screen.getByText(/LIVE LOCAL AGENT/)).toBeTruthy());
  fireEvent.click(screen.getAllByRole("button", { name: "Inspect event" })[0]); expect(inspectEvent).toHaveBeenCalledWith(expect.any(String));
  fireEvent.click(screen.getByRole("button", { name: /Open INC-/ })); expect(navigate).toHaveBeenCalledWith("Investigations", expect.any(String));
});
it("historical selection and comparison are read-only", async () => {
  const { fetcher } = renderLab(); await waitFor(() => expect(screen.getByText(/LIVE LOCAL AGENT/)).toBeTruthy());
  fireEvent.change(screen.getByLabelText("Recorded experiment"), { target: { value: screen.getByLabelText<HTMLSelectElement>("Recorded experiment").value } });
  fireEvent.change(screen.getByLabelText("Compare experiment"), { target: { value: "" } });
  expect(fetcher.mock.calls.every(c => c[1]?.method !== "POST")).toBe(true);
});
it("adds the lab to existing thirteen-window preferences without losing positions", () => {
  const bounds = { width: 1440, height: 900 }, current = defaultLayout(bounds);
  const old = { ...current, windows: current.windows.filter(w => w.id !== "lab"), positions: { "n-0123456789abcdef": { x: 55, y: 99 } } };
  const upgraded = parsePreferences(JSON.stringify(old), bounds);
  expect(upgraded.positions).toEqual(old.positions); expect(upgraded.windows.filter(w => w.id !== "lab")).toEqual(old.windows);
  expect(upgraded.windows.find(w => w.id === "lab")!.open).toBe(false);
  expect(workspaceReducer(upgraded, { type: "open", id: "lab" }).windows.find(w => w.id === "lab")!.open).toBe(true);
  const preset = workspaceReducer(upgraded, { type: "preset", preset: "lab" });
  expect(preset.windows.filter(w => w.open).map(w => w.id)).toEqual(["network", "events", "lab"]);
  expect(parsePreferences(JSON.stringify(preset), bounds).preset).toBe("lab");
});
it("historical lab evidence stays inspectable beyond the dashboard recent-event limit", async () => {
  const recorded = (await experimentSnapshot()).runs[0].events.find(e => e.request)!;
  const eventRecord = JSON.parse(JSON.stringify(recorded));
  render(<EvidenceInspector state={{ ...state, events: [], incidents: [], runtimeRequests: [] }} focusId={recorded.id} navigate={() => {}} eventRecord={eventRecord} />);
  expect(screen.getByText("PERSISTED GATEWAY RECEIPT")).toBeTruthy();
  expect(screen.getByText(recorded.kind)).toBeTruthy();
});
