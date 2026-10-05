import { defineConfig } from "tsup";

export default defineConfig({
  entry: {
    index: "src/index.ts",
    "shape-types": "src/shape-types.ts",
    "snapshot/types": "src/snapshot/types.ts",
    "snapshot/schema": "src/snapshot/schema.ts",
    "snapshot/version": "src/snapshot/version.ts",
    "snapshot/api": "src/snapshot/api.ts",
    "snapshot/identity": "src/snapshot/identity.ts",
    "snapshot/archive": "src/snapshot/archive.ts",
    "assets/manifest": "src/assets/manifest.ts",
    "assets/texture-paths": "src/assets/texture-paths.ts",
    "assets/asset-url": "src/assets/asset-url.ts",
  },
  splitting: false,
  format: ["esm"],
  platform: "neutral",
  sourcemap: true,
  dts: false,
  clean: false,
  outDir: "dist",
  tsconfig: "./tsconfig.json",
});
