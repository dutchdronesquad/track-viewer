import { build } from "esbuild";
import { writeFileSync } from "node:fs";

// Extract only asset paths. Geometry and rendering catalog behavior stay in the viewer.
const result = await build({
  stdin: {
    contents: `import { trackElementCatalog, collectEntryTexturePaths } from './packages/viewer/src/lib/track/elements/catalog';
      export default Object.fromEntries(trackElementCatalog.map(entry => {
        const paths = new Set(); collectEntryTexturePaths(entry, paths);
        return [entry.id, [...paths]];
      }));`,
    resolveDir: process.cwd(),
    loader: "ts",
  },
  bundle: true,
  write: false,
  platform: "node",
  format: "esm",
});
const { default: paths } = await import(
  `data:text/javascript;base64,${Buffer.from(result.outputFiles[0].text).toString("base64")}`
);
writeFileSync(
  "packages/schema/src/assets/generated/catalog-textures.json",
  `${JSON.stringify(paths, null, 2)}\n`
);
