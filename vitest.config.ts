import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@trackdraw/schema": path.resolve(
        import.meta.dirname,
        "packages/schema/src"
      ),
      "@trackdraw/viewer": path.resolve(
        import.meta.dirname,
        "packages/viewer/src"
      ),
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
      include: ["packages/*/src/**/*.{ts,tsx}"],
      exclude: ["packages/*/src/**/*.d.ts"],
      reporter: ["text", "html", "json-summary"],
      reportsDirectory: "./coverage",
    },
  },
});
