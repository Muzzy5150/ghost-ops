import { z } from "zod";

export const windowIds = ["network", "events", "inspector", "evidence", "overview", "registry", "dna", "shadow", "memory", "traps", "investigations", "runtime", "demo", "lab", "hunt", "sponsors", "sentinel"] as const;
export type WindowId = typeof windowIds[number];
export type Bounds = { width: number; height: number };
export type Rect = { x: number; y: number; width: number; height: number };
export type WindowState = Rect & { id: WindowId; open: boolean; minimized: boolean; maximized: boolean; z: number };
export type Preset = "operations" | "incident" | "lab";
export type Preferences = { version: 2; preset: Preset; bounds: Bounds; windows: WindowState[]; positions: Record<string, { x: number; y: number }>; animations: boolean; navigationExpanded: boolean };
export const storageKey = "ghostops.workspace.v2";
export const legacyStorageKey = "ghostops.workspace.v1";
export const titles: Record<WindowId, string> = {
  network: "Agent network", events: "Live events", inspector: "Agent inspector", evidence: "Evidence inspector",
  overview: "System overview", registry: "Agent Registry", dna: "AgentDNA", shadow: "ShadowWatch", memory: "MemoryGuard",
  traps: "GhostTrap", investigations: "Investigations", runtime: "Runtime sessions", demo: "Demo Control", lab: "Security Lab", hunt: "Ghost Hunt", sponsors: "Sponsor Integrations",sentinel:"Web Sentinel"
};
const finite = z.number().finite();
const rectSchema = { x: finite.min(0).max(10000), y: finite.min(0).max(10000), width: finite.min(1).max(10000), height: finite.min(1).max(10000) };
const preferencesSchema = z.object({
  version: z.literal(2), preset: z.enum(["operations", "incident", "lab"]),
  bounds: z.object({ width: finite.min(1).max(10000), height: finite.min(1).max(10000) }).strict(),
  windows: z.array(z.object({ ...rectSchema, id: z.enum(windowIds), open: z.boolean(), minimized: z.boolean(), maximized: z.boolean(), z: z.number().int().min(0).max(100) }).strict()).min(13).max(windowIds.length),
  positions: z.record(z.string().regex(/^n-[a-f0-9]{16}$/), z.object({ x: finite.min(-10000).max(10000), y: finite.min(-10000).max(10000) }).strict()).refine(p => Object.keys(p).length <= 200),
  animations: z.boolean(), navigationExpanded: z.boolean()
}).strict();

export function constrain(rect: Rect, bounds: Bounds): Rect {
  const width = Math.min(bounds.width, Math.max(Math.min(340, bounds.width), rect.width));
  const height = Math.min(bounds.height, Math.max(Math.min(220, bounds.height), rect.height));
  return { width, height, x: Math.max(0, Math.min(bounds.width - width, rect.x)), y: Math.max(0, Math.min(bounds.height - height, rect.y)) };
}
export function defaultLayout(bounds: Bounds, preset: Preset = "operations"): Preferences {
  const gap = 12, left = Math.floor((bounds.width - gap) * .57), right = bounds.width - gap - left;
  const top = Math.max(220, Math.min(Math.floor((bounds.height - gap) * .72), bounds.height - 220 - gap)), bottom = bounds.height - gap - top;
  const placements: Partial<Record<WindowId, Rect>> = preset === "operations" ? {
    network: { x: 0, y: 0, width: bounds.width, height: bounds.height < 650 ? bounds.height : top }, events: { x: 0, y: top + gap, width: bounds.width, height: bottom }
  } : preset === "incident" ? {
    network: { x: 0, y: 0, width: left, height: bounds.height }, investigations: { x: left + gap, y: 0, width: right, height: top },
    memory: { x: left + gap, y: top + gap, width: right, height: bottom }
  } : {
    lab: { x: 0, y: 0, width: Math.floor(bounds.width * .68) - gap, height: bounds.height },
    network: { x: Math.floor(bounds.width * .68), y: 0, width: bounds.width - Math.floor(bounds.width * .68), height: top },
    events: { x: Math.floor(bounds.width * .68), y: top + gap, width: bounds.width - Math.floor(bounds.width * .68), height: bottom }
  };
  const contextual = (id: WindowId): Rect => ["inspector", "evidence"].includes(id) ? { x: bounds.width - 450, y: 32, width: 430, height: Math.min(570, bounds.height - 48) } : { x: 45 + iOffset(id), y: 24 + iOffset(id), width: Math.min(1000, bounds.width * .86), height: Math.min(730, bounds.height * .9) };
  return { version: 2, preset, bounds, positions: {}, animations: false, navigationExpanded: false, windows: windowIds.map((id, i) => ({
    id, ...constrain(placements[id] ?? contextual(id), bounds),
    open: !!placements[id], minimized: preset === "operations" && id === "events" && bounds.height < 650, maximized: false, z: i
  })) };
}
export function parsePreferences(raw: string | null, bounds: Bounds): Preferences {
  try {
    if (!raw || raw.length > 60000) return defaultLayout(bounds);
    const input = JSON.parse(raw);
    if (input?.version === 1) {
      const legacy = preferencesSchema.omit({ navigationExpanded: true }).extend({ version: z.literal(1) }).strict().parse(input);
      if (new Set(legacy.windows.map(w => w.id)).size !== legacy.windows.length || (legacy.windows.length === windowIds.length - 1 && legacy.windows.some(w => w.id === "lab"))) return defaultLayout(bounds);
      // New visual defaults replace v1 window placements; preserve valid manual node positions.
      return { ...defaultLayout(bounds, legacy.preset), positions: legacy.positions, animations: legacy.animations };
    }
    const parsed = preferencesSchema.parse(input);
    const missing = windowIds.filter(id => !parsed.windows.some(w => w.id === id));
    if (missing.some(id => !["lab", "hunt", "sponsors", "sentinel"].includes(id))) return defaultLayout(bounds);
    // Add new tools parked; never overwrite thirteen/fourteen-window preferences.
    for (const id of missing) parsed.windows.push({ ...defaultLayout(parsed.bounds).windows.find(w => w.id === id)!, z: Math.max(...parsed.windows.map(w => w.z)) + 1 });
    if (new Set(parsed.windows.map(w => w.id)).size !== windowIds.length || new Set(parsed.windows.map(w => w.z)).size !== windowIds.length) return defaultLayout(bounds);
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
  | { type: "dock"; id: WindowId; side: "left" | "right" }
  | { type: "bounds"; bounds: Bounds }
  | { type: "preset"; preset: Preset }
  | { type: "arrange" | "reset" | "reset-nodes" | "animations" | "navigation" }
  | { type: "position"; id: string; position: { x: number; y: number } };
export function workspaceReducer(layout: Preferences, action: WorkspaceAction): Preferences {
  if (action.type === "hydrate") return parsePreferences(action.raw, action.bounds);
  if (action.type === "bounds") return resizeLayout(layout, action.bounds);
  if (action.type === "preset" || action.type === "arrange" || action.type === "reset") {
    const next = defaultLayout(layout.bounds, action.type === "preset" ? action.preset : action.type === "reset" ? "operations" : layout.preset);
    return { ...next, navigationExpanded: layout.navigationExpanded, animations: layout.animations, positions: action.type === "reset" ? {} : layout.positions };
  }
  if (action.type === "reset-nodes") return { ...layout, positions: {} };
  if (action.type === "animations") return { ...layout, animations: !layout.animations };
  if (action.type === "navigation") return { ...layout, navigationExpanded: !layout.navigationExpanded };
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
      case "dock": return { ...next, ...constrain({ x: action.side === "left" ? 0 : layout.bounds.width / 2, y: 0, width: layout.bounds.width / 2, height: layout.bounds.height }, layout.bounds), open: true, minimized: false, maximized: false };
      default: return next;
    }
  }) };
}
function iOffset(id: WindowId) { return windowIds.indexOf(id) * 9; }
export function snapRect(rect: Rect, bounds: Bounds): Rect {
  const next = constrain(rect, bounds);
  return { ...next, x: next.x < 14 ? 0 : bounds.width - next.width - next.x < 14 ? bounds.width - next.width : next.x, y: next.y < 14 ? 0 : bounds.height - next.height - next.y < 14 ? bounds.height - next.height : next.y };
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
