import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: {
    alias: { "@": path.resolve(process.cwd(), "src") },
  },
  test: {
    environment: "jsdom",
    globals: true,
    // Playwright specs live under tests/e2e and are executed via `bun run test:e2e`.
    exclude: ["node_modules/**", "dist/**", "tests/e2e/**", ".output/**"],
  },
});
