import { defineConfig } from "tsup";

export default defineConfig([
  // ESM npm build. Multi-entry so app-side/server code (e.g.
  // src/lib/track/viewer-snapshot.ts) can import light subpaths without
  // pulling React/three/konva into a server bundle.
  {
    entry: {
      index: "src/index.ts",
      mount: "src/mount.ts",
      "snapshot/types": "src/snapshot/types.ts",
      "snapshot/version": "src/snapshot/version.ts",
      "snapshot/schema": "src/snapshot/schema.ts",
      "assets/manifest": "src/assets/manifest.ts",
      "assets/texture-paths": "src/assets/texture-paths.ts",
      "assets/asset-url": "src/assets/asset-url.ts",
    },
    format: ["esm"],
    // tsup's own dts option always uses an internal, bundled copy of
    // rollup-plugin-dts@6.1.1 (compiled directly into tsup/dist/rollup.js -
    // not resolved from node_modules, so pinning a newer version as a
    // dependency has no effect). That bundled copy crashes on TypeScript
    // 7's Compiler API ("Cannot read properties of undefined (reading
    // 'useCaseSensitiveFileNames')"). Declarations are emitted separately
    // instead, via a plain `tsc --declaration` pass (see the "build" script
    // and tsconfig.build.json) - viable now that this package has no
    // rootDir reach outside its own src/, which was the blocker before the
    // repo split.
    dts: false,
    sourcemap: true,
    clean: true,
    outDir: "dist",
    platform: "browser",
    tsconfig: "./tsconfig.json",
    external: ["react", "react-dom", "react-dom/client"],
  },
  // Static browser build: a single self-contained global script for hosts
  // with no npm/bundler (e.g. a future RotorHazard plugin). React itself
  // must be bundled here since there is no npm environment on the host.
  {
    entry: { "trackdraw-viewer": "src/mount.ts" },
    format: ["iife"],
    globalName: "TrackDrawViewer",
    outDir: "dist/static",
    platform: "browser",
    minify: true,
    sourcemap: true,
    noExternal: [/.*/],
    tsconfig: "./tsconfig.json",
  },
]);
