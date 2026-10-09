#!/usr/bin/env node
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createSecurityProxy } from "./index.js";
try {
  const proxy = await createSecurityProxy({ endpoint: process.env.GHOSTOPS_URL ?? "http://127.0.0.1:3210", agentId: process.env.GHOSTOPS_AGENT_ID ?? "", sessionId: process.env.GHOSTOPS_SESSION_ID ?? "", credential: process.env.GHOSTOPS_AGENT_TOKEN ?? "" });
  const stop = async () => { await proxy.close(); process.exit(0); };
  const transport = new StdioServerTransport(process.stdin, process.stdout, { maxBufferSize: 16384 });
  transport.onerror = () => { console.error("Ghost Ops bounded MCP input rejected."); void stop(); };
  process.stdin.on("end", () => void stop()); process.once("SIGTERM", () => void stop()); process.once("SIGINT", () => void stop());
  await proxy.server.connect(transport);
} catch { console.error("Ghost Ops proxy could not authenticate/connect. Check private configuration and gateway availability; no fallback tools."); process.exitCode = 1; }
