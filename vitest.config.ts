import { defineConfig } from "vitest/config";
import { resolve } from "node:path";
export default defineConfig({ resolve: { alias: { "@": resolve(import.meta.dirname, "src"), "@ghostops/sdk": resolve(import.meta.dirname, "packages/ghostops-sdk/src/index.ts"), "@ghostops/mcp": resolve(import.meta.dirname, "packages/ghostops-mcp/src/index.ts") } }, test: { fileParallelism: false, setupFiles: ["./tests/setup.ts"], testTimeout: 30_000 } });
