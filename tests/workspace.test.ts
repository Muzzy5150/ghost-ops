import { describe, expect, it } from "vitest";
import { constrain, defaultLayout, gestureRect, parsePreferences, resizeLayout, windowIds, workspaceReducer } from "../src/lib/workspace-model";

const bounds = { width: 1400, height: 800 };
describe("validated window management", () => {
  it("defines useful Operations and Incident Room presets", () => {
    expect(defaultLayout(bounds).windows.filter(w => w.open).map(w => w.id)).toEqual(["network", "events", "inspector"]);
    expect(defaultLayout(bounds, "incident").windows.filter(w => w.open).map(w => w.id)).toEqual(["network", "evidence", "memory", "investigations"]);
  });
  it("keeps all title bars and complete windows inside viewport bounds", () => {
    const rect = constrain({ x: -300, y: 4000, width: 10000, height: 1 }, bounds);
    expect(rect).toEqual({ x: 0, y: 580, width: 1400, height: 220 });
  });
  it("constrains a move without changing dimensions", () => {
    expect(gestureRect({ x: 20, y: 30, width: 400, height: 300 }, 9000, -9000, "move", bounds)).toEqual({ x: 1000, y: 0, width: 400, height: 300 });
  });
  it.each(["n", "s", "e", "w", "ne", "nw", "se", "sw"])("constrains %s resizing with minimum dimensions", handle => {
    const result = gestureRect({ x: 100, y: 100, width: 500, height: 400 }, -10000, -10000, handle, bounds);
    expect(result.width).toBeGreaterThanOrEqual(340); expect(result.height).toBeGreaterThanOrEqual(220);
    expect(result.x).toBeGreaterThanOrEqual(0); expect(result.y).toBeGreaterThanOrEqual(0);
    expect(result.x + result.width).toBeLessThanOrEqual(bounds.width); expect(result.y + result.height).toBeLessThanOrEqual(bounds.height);
  });
  it("resizes from the north-west while preserving the opposite corner", () => {
    expect(gestureRect({ x: 100, y: 100, width: 500, height: 400 }, 20, 30, "nw", bounds)).toEqual({ x: 120, y: 130, width: 480, height: 370 });
  });
  it("normalizes focus ordering indefinitely without growing z-index", () => {
    let layout = defaultLayout(bounds);
    for (let i = 0; i < 200; i++) layout = workspaceReducer(layout, { type: "focus", id: windowIds[i % windowIds.length] });
    expect(new Set(layout.windows.map(w => w.z)).size).toBe(windowIds.length);
    expect(Math.max(...layout.windows.map(w => w.z))).toBe(windowIds.length - 1);
  });
  it("minimizes, hides and reopens a real window", () => {
    let layout = workspaceReducer(defaultLayout(bounds), { type: "minimize", id: "network" });
    expect(layout.windows.find(w => w.id === "network")!.minimized).toBe(true);
    layout = workspaceReducer(layout, { type: "close", id: "network" });
    expect(layout.windows.find(w => w.id === "network")!.open).toBe(false);
    layout = workspaceReducer(layout, { type: "open", id: "network" });
    expect(layout.windows.find(w => w.id === "network")).toMatchObject({ open: true, minimized: false, z: windowIds.length - 1 });
  });
  it("maximize and restore do not destroy normal geometry", () => {
    const layout = defaultLayout(bounds), original = layout.windows[0];
    const maximized = workspaceReducer(layout, { type: "maximize", id: "network" });
    expect(maximized.windows[0]).toMatchObject({ x: original.x, y: original.y, width: original.width, height: original.height, maximized: true });
    expect(workspaceReducer(maximized, { type: "maximize", id: "network" }).windows[0].maximized).toBe(false);
  });
  it("round trips positions/dimensions without recording evidence", () => {
    const layout = workspaceReducer(defaultLayout(bounds), { type: "geometry", id: "network", rect: { x: 50, y: 60, width: 600, height: 430 } });
    expect(parsePreferences(JSON.stringify(layout), bounds)).toEqual(layout);
    expect(Object.keys(layout)).toEqual(["version", "preset", "bounds", "positions", "animations", "windows"]);
  });
  it.each([null, "{broken", JSON.stringify({ version: 999 }), "x".repeat(60001)])("recovers safely from missing/malformed/oversized preferences", raw => {
    expect(parsePreferences(raw, bounds)).toEqual(defaultLayout(bounds));
  });
  it("rejects duplicate windows, non-finite dimensions and injected content", () => {
    const layout = defaultLayout(bounds);
    for (const bad of [{ ...layout, windows: layout.windows.map(w => ({ ...w, id: "network" })) }, { ...layout, credentials: "must-not-persist" }, { ...layout, windows: layout.windows.map(w => ({ ...w, x: null })) }]) expect(parsePreferences(JSON.stringify(bad), bounds)).toEqual(defaultLayout(bounds));
  });
  it("stores bounded opaque node positions only", () => {
    let layout = defaultLayout(bounds);
    layout = workspaceReducer(layout, { type: "position", id: "raw-secret-or-resource-text", position: { x: 2, y: 3 } });
    expect(layout.positions).toEqual({});
    for (let i = 0; i < 250; i++) layout = workspaceReducer(layout, { type: "position", id: `n-${i.toString(16).padStart(16, "0")}`, position: { x: i, y: -20000 } });
    expect(Object.keys(layout.positions)).toHaveLength(200);
    expect(Object.values(layout.positions).every(p => p.y === -10000)).toBe(true);
    expect(parsePreferences(JSON.stringify(layout), bounds)).toEqual(layout);
  });
  it("auto-arranges without resetting graph preferences; Reset clears only UI state", () => {
    let layout = workspaceReducer(defaultLayout(bounds), { type: "position", id: "n-0123456789abcdef", position: { x: 1, y: 2 } });
    layout = workspaceReducer(layout, { type: "preset", preset: "incident" });
    expect(workspaceReducer(layout, { type: "arrange" }).positions).toEqual(layout.positions);
    const reset = workspaceReducer(layout, { type: "reset" });
    expect(reset.preset).toBe("operations"); expect(reset.positions).toEqual({});
  });
  it("reflows desktop geometry on viewport changes without inaccessible windows", () => {
    const small = resizeLayout(defaultLayout(bounds), { width: 760, height: 450 });
    for (const w of small.windows) { expect(w.x + w.width).toBeLessThanOrEqual(760); expect(w.y + w.height).toBeLessThanOrEqual(450); }
  });
});
