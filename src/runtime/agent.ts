import { z } from "zod";
import { runtimeToolNames } from "@/lib/runtime-contract";
import { LocalAgentClient } from "./client";
import { runModelAgent, type ModelOptions } from "./model";

export async function runLocalAgent(client: LocalAgentClient, rawTask: string, inference = false, options: ModelOptions = {}) {
  const task = z.string().min(1).max(4000).parse(rawTask);
  const discovery = await client.client.listTools();
  const available = new Set(discovery.tools.map(t => t.name));
  if (!runtimeToolNames.every(name => available.has(name))) throw new Error("Approved MCP tool catalogue unavailable");
  if (!inference) {
    // Deliberately small deterministic task dispatcher, NOT a language model.
    if (/untrusted|poison/i.test(task)) {
      const document = await client.call("read_document", "docs/untrusted");
      return { mode: "offline-scripted", modelCalls: 0, outcome: document.allowed ? "Untrusted document read as data; scripted client does not follow its instructions." : document.reason, requests: [document] };
    }
    if (/status/i.test(task)) return { mode: "offline-scripted", modelCalls: 0, requests: [await client.call("operational_status", "infra/status")] };
    if (/note|remember/i.test(task)) return { mode: "offline-scripted", modelCalls: 0, requests: [await client.call("write_memory", "memory/runtime-notes", task)] };
    const document = await client.call("read_document", "docs/research");
    if (!document.allowed || !document.output) return { mode: "offline-scripted", modelCalls: 0, requests: [document] };
    const tasks = await client.call("list_tasks", "runtime/tasks");
    const summary = document.output.split("\n").filter(line => line.trim() && !line.startsWith("#")).slice(0, 3).join(" ").slice(0, 4000);
    const saved = await client.call("write_summary", "research/summary", summary);
    const memory = await client.call("read_memory", "memory/runtime-policy");
    return { mode: "offline-scripted", modelCalls: 0, outcome: summary, requests: [document, tasks, saved, memory] };
  }
  return runModelAgent(client, task, options);
}
