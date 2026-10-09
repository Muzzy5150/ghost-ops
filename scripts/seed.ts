import { command } from "../src/server/service";
import { db } from "../src/server/db";
import { randomUUID } from "node:crypto";
await command({ commandId: randomUUID(), action: "initialize" });
console.log("Ghost Ops initialized: 3 authorized agents, 5 synthetic traps, signed research memory.");
await db.$disconnect();
