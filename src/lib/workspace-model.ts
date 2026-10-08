import { z } from "zod";

export const windowIds = ["network", "events", "inspector", "evidence", "overview", "registry", "dna", "shadow", "memory", "traps", "investigations", "runtime", "demo"] as const;
export type WindowId = typeof windowIds[number];
export type Bounds = { width: number; height: number };
export type Rect = { x: number; y: number; width: number; height: number };
export type WindowState = Rect & { id: WindowId; open: boolean; minimized: boolean; maximized: boolean; z: number };
export type Preset = "operations" | "incident";
export type Preferences = { version: 1; preset: Preset; bounds: Bounds; windows: WindowState[]; positions: Record<string, { x: number; y: number }>; animations: boolean };
export const storageKey = "ghostops.workspace.v1";
export const titles: Record<WindowId, string> = {
  network: "Agent network", events: "Live events", inspector: "Agent inspector", evidence: "Evidence inspector",
  overview: "System overview", registry: "Agent Registry", dna: "AgentDNA", shadow: "ShadowWatch", memory: "MemoryGuard",
  traps: "GhostTrap", investigations: "Investigations", runtime: "Runtime sessions", demo: "Demo Control"
};
const finite = z.number().finite();
const rectSchema = { x: finite.min(0).max(10000), y: finite.min(0).max(10000), width: finite.min(1).max(10000), height: finite.min(1).max(10000) };
const preferencesSchema = z.object({
  version: z.literal(1), preset: z.enum(["operations", "incident"]),
  bounds: z.object({ width: finite.min(1).max(10000), height: finite.min(1).max(10000) }).strict(),
  windows: z.array(z.object({ ...rectSchema, id: z.enum(windowIds), open: z.boolean(), minimized: z.boolean(), maximized: z.boolean(), z: z.number().int().min(0).max(100) }).strict()).length(windowIds.length),
  positions: z.record(z.string().regex(/^n-[a-f0-9]{16}$/), z.object({ x: finite.min(-10000).max(10000), y: finite.min(-10000).max(10000) }).strict()).refine(p => Object.keys(p).length <= 200),
  animations: z.boolean()
}).strict();

export function constrain(rect: Rect, bounds: Bounds): Rect {
  const width = Math.min(bounds.width, Math.max(Math.min(340, bounds.width), rect.width));
  const height = Math.min(bounds.height, Math.max(Math.min(220, bounds.height), rect.height));
  return { width, height, x: Math.max(0, Math.min(bounds.width - width, rect.x)), y: Math.max(0, Math.min(bounds.height - height, rect.y)) };
}
export function defaultLayout(bounds: Bounds, preset: Preset = "operations"): Preferences {
  const gap = 8, left = Math.floor((bounds.width - gap) * .66), right = bounds.width - gap - left;
  const top = Math.floor((bounds.height - gap) * .66), bottom = bounds.height - gap - top;
  const placements: Partial<Record<WindowId, Rect>> = preset === "operations" ? {
    network: { x: 0, y: 0, width: left, height: top }, events: { x: 0, y: top + gap, width: left, height: bottom },
    inspector: { x: left + gap, y: 0, width: right, height: bounds.height }
  } : {
    investigations: { x: 0, y: 0, width: left, height: top }, network: { x: 0, y: top + gap, width: left, height: bottom },
    evidence: { x: left + gap, y: 0, width: right, height: top }, memory: { x: left + gap, y: top + gap, width: right, height: bottom }
  };
  return { version: 1, preset, bounds, positions: {}, animations: false, windows: windowIds.map((id, i) => ({
    id, ...constrain(placements[id] ?? { x: 30 + i * 12, y: 24 + i * 9, width: Math.min(860, bounds.width * .8), height: Math.min(640, bounds.height * .86) }, bounds),
    open: !!placements[id], minimized: false, maximized: false, z: i
  })) };
}
export function parsePreferences(raw: string | null, bounds: Bounds): Preferences {
  try {
    if (!raw || raw.length > 60000) return defaultLayout(bounds);
    const parsed = preferencesSchema.parse(JSON.parse(raw));
    if (new Set(parsed.windows.map(w => w.id)).size !== windowIds.length) return defaultLayout(bounds);
    return resizeLayout(parsed, bounds);
  } catch { return defaultLayout(bounds); }
}
export function resizeLayout(layout: Preferences, bounds: Bounds): Preferences {
  return { ...layout, bounds, windows: layout.windows.map(w => ({ ...w, ...constrain({ x: w.x * bounds.width / layout.bounds.width, y: w.y * bounds.height / layout.bounds.height, width: w.width * bounds.width / layout.bounds.width, height: w.height * bounds.height / layout.bounds.height }, bounds) })) };
}
export type WorkspaceAction =
  | { type: "hydrate"; raw: string | null; bounds: Bounds }
  | { type: "open" | "focus" | "minimize" | "close" | "maximize"; id: WindowId }
  | { type: "geometry"; id: WindowId; rect: Rect }
  | { type: "bounds"; bounds: Bounds }
  | { type: "preset"; preset: Preset }
  | { type: "arrange" | "reset" | "reset-nodes" | "animations" }
  | { type: "position"; id: string; position: { x: number; y: number } };
export function workspaceReducer(layout: Preferences, action: WorkspaceAction): Preferences {
  if (action.type === "hydrate") return parsePreferences(action.raw, action.bounds);
  if (action.type === "bounds") return resizeLayout(layout, action.bounds);
  if (action.type === "preset" || action.type === "arrange" || action.type === "reset") {
    const next = defaultLayout(layout.bounds, action.type === "preset" ? action.preset : action.type === "reset" ? "operations" : layout.preset);
    return { ...next, animations: layout.animations, positions: action.type === "reset" ? {} : layout.positions };
  }
  if (action.type === "reset-nodes") return { ...layout, positions: {} };
  if (action.type === "animations") return { ...layout, animations: !layout.animations };
  if (action.type === "position") {
    if (!/^n-[a-f0-9]{16}$/.test(action.id) || !Number.isFinite(action.position.x) || !Number.isFinite(action.position.y)) return layout;
    const positions = { ...layout.positions, [action.id]: { x: Math.max(-10000, Math.min(10000, action.position.x)), y: Math.max(-10000, Math.min(10000, action.position.y)) } };
    // Bounded, opaque IDs and coordinates only. Never persist labels, evidence or credentials.
    return { ...layout, positions: Object.fromEntries(Object.entries(positions).slice(-200)) };
  }
  if (!("id" in action)) return layout;
  const ordered = layout.windows.toSorted((a, b) => a.z - b.z).map(w => w.id).filter(id => id !== action.id).concat(action.id);
  return { ...layout, windows: layout.windows.map(w => {
    const next = { ...w, z: ordered.indexOf(w.id) };
    if (w.id !== action.id) return next;
    switch (action.type) {
      case "open": return { ...next, open: true, minimized: false };
      case "minimize": return { ...next, minimized: true };
      case "close": return { ...next, open: false };
      case "maximize": return { ...next, maximized: !w.maximized };
      case "geometry": return { ...next, ...constrain(action.rect, layout.bounds) };
      default: return next;
    }
  }) };
}
export function gestureRect(start: Rect, dx: number, dy: number, handle: string, bounds: Bounds): Rect {
  if (handle === "move") return constrain({ ...start, x: start.x + dx, y: start.y + dy }, bounds);
  const minW = Math.min(340, bounds.width), minH = Math.min(220, bounds.height);
  let { x, y, width, height } = start;
  if (handle.includes("e")) width = Math.max(minW, Math.min(bounds.width - x, width + dx));
  if (handle.includes("s")) height = Math.max(minH, Math.min(bounds.height - y, height + dy));
  if (handle.includes("w")) { const right = x + width; x = Math.max(0, Math.min(right - minW, x + dx)); width = right - x; }
  if (handle.includes("n")) { const bottom = y + height; y = Math.max(0, Math.min(bottom - minH, y + dy)); height = bottom - y; }
  return constrain({ x, y, width, height }, bounds);
}
