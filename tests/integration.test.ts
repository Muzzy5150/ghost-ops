import { beforeEach, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { command, snapshot } from "../src/server/service";
import { db } from "../src/server/db";
const control = (action: "reset" | "normal" | "rogue" | "poisoning" | "compromise") => command({ commandId: randomUUID(), action });
beforeEach(async () => { await control("reset"); });

it("normal scenario learns authorized profiles without high/critical incidents or anomalies", async () => {
  expect((await control("normal")).result).toMatchObject({ allowed: 18, blocked: 0 });
  const state = await snapshot();
  expect(state.stats.anomalies).toBe(0);
  expect(state.incidents).toHaveLength(0);
  expect(state.agents.every(a => a.profile?.observations === 6 && a.profile.frozen)).toBe(true);
});
it("rogue scenario creates traceable decoy evidence and denies both requests", async () => {
  expect((await control("rogue")).result).toMatchObject({ allowed: 0, blocked: 2 });
  const state = await snapshot();
  expect(state.stats.unknown).toBe(1);
  expect(state.interactions).toHaveLength(2);
  const incident = state.incidents[0];
  expect(incident.status).toBe("contained");
  expect(state.interactions.every(t => t.incidentId === incident.id)).toBe(true);
  expect(state.events.some(e => e.kind === "UNKNOWN_IDENTITY")).toBe(true);
});
it("poisoning is blocked while research completes, tampering detected, history restored", async () => {
  expect((await control("poisoning")).result).toMatchObject({ allowed: 3, blocked: 2, tamperDetected: true, restorationVerified: true });
  const state = await snapshot();
  expect(state.agents.find(a => a.id === "research")?.status).toBe("active");
  expect(state.events.some(e => e.kind === "POST_INGESTION_ESCALATION")).toBe(true);
  expect(state.memories[0].integrity).toBe("verified");
  expect(state.memories.some(m => m.integrity === "tampered")).toBe(true);
});
it("all four signals correlate into one critical incident, containment blocks approved tasks", async () => {
  expect((await control("compromise")).result).toMatchObject({ allowed: 2, blocked: 4, tamperDetected: true, restorationVerified: true });
  const state = await snapshot();
  expect(state.incidents).toHaveLength(1);
  const incident = state.incidents[0];
  expect(incident).toMatchObject({ severity: "critical", status: "contained", actorId: "research" });
  expect([...new Set(incident.events.map(e => e.module))]).toEqual(expect.arrayContaining(["AgentDNA", "ShadowWatch", "MemoryGuard", "GhostTrap", "Response"]));
  expect(state.agents.find(a => a.id === "research")?.status).toBe("quarantined");
  expect(state.events.some(e => e.kind === "TOOL_BLOCKED" && e.message.includes("AGENT_QUARANTINED"))).toBe(true);
  expect(incident.evidence.length).toBe(incident.events.length);
  expect(state.memories[0].integrity).toBe("verified");
  expect(state.actions.filter(a => a.action === "quarantine")).toHaveLength(1);
});
it("management replay cannot duplicate responses or reset newer activity", async () => {
  const reset = { commandId: randomUUID(), action: "reset" as const };
  await command(reset);
  const input = { commandId: randomUUID(), action: "compromise" as const };
  await command(input);
  const before = await snapshot();
  expect((await command(input)).replayed).toBe(true);
  expect((await command(reset)).replayed).toBe(true);
  const replay = await command({ commandId: randomUUID(), action: "replay", targetId: before.runs[0].id });
  expect(replay.result).toMatchObject({ readOnlyReplay: true });
  const after = await snapshot();
  expect(after.events.length).toBe(before.events.length);
  expect(after.actions.length).toBe(before.actions.length);
  await expect(command({ ...input, action: "normal" })).rejects.toThrow("Command ID");
});
it("reset produces deterministic state and application needs no OpenAI API key", async () => {
  delete process.env.OPENAI_API_KEY;
  await control("compromise");
  await control("reset");
  const state = await snapshot();
  expect(state.agents.map(a => [a.id, a.status])).toEqual([["operations", "active"], ["research", "active"], ["support", "active"]]);
  expect(state.stats).toMatchObject({ incidents: 0, anomalies: 0, requests: 0, trapTriggers: 0, quarantined: 0 });
  expect(state.memories).toHaveLength(2);
  expect(state.traps).toHaveLength(5);
  expect(await db.credential.count({ where: { revoked: false } })).toBe(3);
  expect((await control("normal")).result).toMatchObject({ allowed: 18 });
});
it("dashboard never exposes credential digests or memory signatures", async () => {
  const state = await snapshot();
  const raw = JSON.stringify(state);
  const credential = await db.credential.findFirstOrThrow();
  const memory = await db.memoryVersion.findFirstOrThrow();
  expect(raw).not.toContain(credential.digest);
  expect(raw).not.toContain(memory.signature);
});
