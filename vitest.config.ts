import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@trackdraw/viewer": path.resolve(import.meta.dirname, "src"),
    },
  },
  test: {
    environment: "node",
    fileParallelism: true,
    include: ["tests/**/*.test.{ts,tsx}"],
    pool: "forks",
    restoreMocks: true,
    clearMocks: true,
    coverage: {
      provider: "v8",
      include: ["src/**/*.{ts,tsx}"],
      exclude: ["src/**/*.d.ts"],
      reporter: ["text", "html", "json-summary"],
      reportsDirectory: "./coverage",
    },
  },
});
