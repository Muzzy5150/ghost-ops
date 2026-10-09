// @vitest-environment happy-dom
import { expect, it, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup, within } from "@testing-library/react";
import { randomBytes, randomUUID } from "node:crypto";
import { enrollRuntime, callRuntime } from "../src/server/runtime";
import { snapshot } from "../src/server/service";
import { integrationSchema } from "../src/lib/runtime-contract";
import type { State } from "../src/lib/view-types";
import { DeveloperIntegrations } from "../src/components/developer-integrations";
import { recordedGraph } from "../src/lib/workspace-graph";
afterEach(cleanup);
async function state() { const actorId = `live-ui-${randomBytes(4).toString("hex")}`, credential = randomBytes(32).toString("hex"); const ids = await enrollRuntime({ commandId: randomUUID(), actorId, credential, integration: integrationSchema.parse({ name: "Independent research", role: "research", permissions: { tools: ["documents:read"], resources: ["docs/research"], destinations: [] } }) }) as { sessionId: string }; await callRuntime(actorId, ids.sessionId, credential, "read_document", { requestId: randomUUID(), resource: "docs/research" }); return { actorId, credential, data: JSON.parse(JSON.stringify(await snapshot())) as State }; }
it("shows persisted external activity without claiming online or exposing tokens", async () => { const s = await state(); render(<DeveloperIntegrations state={s.data} navigate={vi.fn()} />); expect(screen.getByText("Independent research")).toBeTruthy(); expect(screen.getByText(/do not prove a process is online/)).toBeTruthy(); expect(document.body.textContent).not.toContain(s.credential); cleanup(); });
it("navigates identity records and dispatches existing authorized containment control", async () => { const s = await state(), navigate = vi.fn(), control = vi.fn(); render(<DeveloperIntegrations state={s.data} navigate={navigate} control={control} />); const row = within(screen.getByText(s.actorId).closest("section")!); fireEvent.click(row.getByText("Identity / behavior")); expect(navigate).toHaveBeenCalledWith("Agent Registry", s.actorId); fireEvent.click(row.getByText("Quarantine")); expect(control).toHaveBeenCalledWith("quarantine", s.actorId); cleanup(); });
it("labels external graph nodes from registered data, not caller claims", async () => { const s = await state(); const graph = recordedGraph(s.data); expect(graph.nodes.some(n => n.entity.id === s.actorId && n.detail.includes("external local"))).toBe(true); });
