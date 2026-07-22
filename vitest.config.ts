import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Playwright specs live under tests/e2e and are executed via `bun run test:e2e`.
    exclude: ["node_modules/**", "dist/**", "tests/e2e/**", ".output/**"],
  },
});