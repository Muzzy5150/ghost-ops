import { expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { renderToStaticMarkup } from "react-dom/server";
import { command, snapshot } from "../src/server/service";
import type { State } from "../src/lib/view-types";
import { Overview } from "../src/components/overview";
import { ActivityTable } from "../src/components/overview";
import { AgentRegistry, AgentDNA, ShadowWatch, MemoryGuard, GhostTrap, Investigations, DemoControl } from "../src/components/sections";
import { enrollRuntime, callRuntime } from "../src/server/runtime";

it("renders all eight dashboard sections against actual correlated backend state", async () => {
  await command({ commandId: randomUUID(), action: "reset" });
  await command({ commandId: randomUUID(), action: "compromise" });
  const state = JSON.parse(JSON.stringify(await snapshot())) as State;
  const props = { state, busy: false, control: async () => null, navigate: () => {} };
  const views = [<Overview key="overview" {...props} />, <AgentRegistry key="registry" {...props} />, <AgentDNA key="dna" {...props} />, <ShadowWatch key="shadow" {...props} />, <MemoryGuard key="memory" {...props} />, <GhostTrap key="trap" {...props} />, <Investigations key="investigations" {...props} />, <DemoControl key="demo" {...props} result={state.runs[0].results} setResult={() => {}} />];
  const html = views.map(view => renderToStaticMarkup(view));
  expect(html[0]).toContain("Threat contained");
  expect(html[1]).toContain("ResearchAgent");
  expect(html[2]).toContain("POST_INGESTION_ESCALATION");
  expect(html[3]).toContain("quarantined");
  expect(html[4]).toContain("Verified snapshot restoration");
  expect(html[5]).toContain("Credential vault");
  expect(html[6]).toContain("Suspected agent compromise");
  expect(html[6]).toContain("AGENT_QUARANTINED");
  expect(html[7]).toContain("restorationVerified");
  for (const markup of html) expect(markup).not.toContain("undefined");
});

it("renders untrusted stored observations as escaped text, not HTML", async () => {
  await command({ commandId: randomUUID(), action: "reset" });
  await command({ commandId: randomUUID(), action: "normal" });
  const state = JSON.parse(JSON.stringify(await snapshot())) as State;
  const event = { ...state.events[0], actorId: "<script>alert(1)</script>", message: '<img src=x onerror="alert(1)">', identityVerified: false };
  const html = renderToStaticMarkup(<ActivityTable events={[event]} />);
  expect(html).not.toContain("<script>");
  expect(html).not.toContain("<img src=x");
  expect(html).toContain("&lt;script&gt;");
  expect(html).toContain("Unverified claim / legacy");
});
it("renders live provenance, executed handler receipts and the correct agent memory chain", async () => {
  const credential = "b".repeat(64);
  const ids = await enrollRuntime({ commandId: randomUUID(), actorId: "live-render", credential }) as { actorId: string; sessionId: string };
  await callRuntime(ids.actorId, ids.sessionId, credential, "read_document", { requestId: randomUUID(), resource: "docs/research" });
  await callRuntime(ids.actorId, ids.sessionId, credential, "write_memory", { requestId: randomUUID(), resource: "memory/runtime-notes", content: "An actual signed runtime note" });
  const state = JSON.parse(JSON.stringify(await snapshot())) as State;
  const props = { state, busy: false, control: async () => null, navigate: () => {}, focusId: ids.actorId };
  const registry = renderToStaticMarkup(<AgentRegistry {...props} />);
  expect(registry).toContain("Actual local runtime"); expect(registry).toContain("Handler executed");
  expect(renderToStaticMarkup(<Overview {...props} />)).toContain("LOCAL RUNTIME");
  const memory = state.memories.find(m => m.ownerId === ids.actorId && m.key === "runtime-notes")!;
  const html = renderToStaticMarkup(<MemoryGuard {...props} focusId={memory.id} />);
  expect(html).toContain("An actual signed runtime note"); expect(html).toContain("Agent notes"); expect(html).not.toContain("ResearchAgent may read");
});
