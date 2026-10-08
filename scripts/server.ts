import { createServer } from "node:http";
import next from "next";
import { transportToken } from "../src/server/config";

const args = process.argv.slice(2);
const portArg = args.findIndex(a => a === "--port" || a === "-p");
const port = Number(portArg >= 0 ? args[portArg + 1] : process.env.PORT ?? 3000);
if (!Number.isInteger(port) || port < 1024 || port > 65535) throw new Error("Choose a local port between 1024 and 65535");
const dev = args.includes("--dev");
const hostname = "127.0.0.1";
const app = next({ dev, hostname, port });
await app.prepare();
const handler = app.getRequestHandler();
const server = createServer((request, response) => {
  const remote = request.socket.remoteAddress;
  const local = remote === "127.0.0.1" || remote === "::1" || remote === "::ffff:127.0.0.1";
  const proxyHeaders = ["x-forwarded-host", "x-forwarded-for", "x-forwarded-proto", "forwarded", "x-ghostops-transport"];
  if (!local || proxyHeaders.some(h => request.headers[h] !== undefined)) {
    response.writeHead(403, { "Content-Type": "application/json", "Cache-Control": "no-store" });
    response.end(JSON.stringify({ error: "Proxy or unverified transport access is disabled" }));
    return;
  }
  request.headers["x-ghostops-transport"] = transportToken();
  void handler(request, response).catch(() => {
    if (!response.headersSent) response.writeHead(500, { "Content-Type": "application/json" });
    response.end(JSON.stringify({ error: "Local request failed" }));
  });
});
server.requestTimeout = 15_000;
server.headersTimeout = 10_000;
server.maxHeadersCount = 40;
server.on("error", error => { console.error(error.message); process.exitCode = 1; });
server.listen(port, hostname, () => console.log(`Ghost Ops ${dev ? "development" : "production"} · http://${hostname}:${port} · loopback transport enforced`));
for (const signal of ["SIGINT", "SIGTERM"] as const) process.on(signal, () => { server.close(() => { void app.close().finally(() => process.exit(0)); }); });
