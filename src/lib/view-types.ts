import type { Snapshot } from "@/server/service";
// HTTP serializes dates. The UI accepts date strings without importing server runtime.
export type Wire<T> = T extends Date ? string : T extends (infer U)[] ? Wire<U>[] : T extends object ? { [K in keyof T]: Wire<T[K]> } : T;
export type State = Wire<Snapshot>;
export type Agent = State["agents"][number];
export type Event = State["events"][number];
export type Incident = State["incidents"][number];
export type Memory = State["memories"][number];
