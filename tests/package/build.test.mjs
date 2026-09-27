import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import {
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { init, parse } from "es-module-lexer";

await init;

const root = fileURLToPath(new URL("../..", import.meta.url));
const pkg = JSON.parse(readFileSync(path.join(root, "package.json"), "utf8"));

// Follow static and lazy imports: checking only entry files would miss a
// renderer dependency or a second React copy hidden in a shared chunk.
function graph(entry) {
  const visited = new Set();
  const external = new Set();
  const sources = new Set();
  function visit(file) {
    if (visited.has(file)) return;
    visited.add(file);
    const code = readFileSync(file, "utf8");
    const map = JSON.parse(readFileSync(`${file}.map`, "utf8"));
    for (const source of map.sources) sources.add(source);
    for (const specifier of parse(code)[0]) {
      if (specifier.d === -2) continue; // import.meta
      assert.ok(specifier.n, `Nonliteral import in ${file}`);
      const name = specifier.n;
      if (name.startsWith(".")) visit(path.resolve(path.dirname(file), name));
      else external.add(name);
    }
  }
  visit(path.resolve(root, entry));
  return { external, sources };
}
const isReactSource = (source) =>
  /node_modules\/(react|react-dom)\//.test(source);

test("standalone entries bundle their runtime, including lazy 3D imports", () => {
  for (const entry of [".", "./mount"]) {
    const result = graph(pkg.exports[entry].import);
    assert.deepEqual([...result.external], []);
    assert.ok([...result.sources].some(isReactSource));
  }
});

test("snapshot and asset subpaths do not pull in the renderer", () => {
  for (const [name, entry] of Object.entries(pkg.exports)) {
    if (!/^\.\/(snapshot|assets)\//.test(name)) continue;
    const result = graph(entry.import);
    assert.deepEqual([...result.external], []);
    assert.ok(
      ![...result.sources].some((source) =>
        /node_modules\/(react|react-dom|three|konva)\//.test(source)
      )
    );
  }
});

test("packed package installs and typechecks in a host without React", () => {
  assert.equal(pkg.peerDependencies, undefined);
  assert.equal(pkg.peerDependenciesMeta, undefined);
  assert.equal(pkg.exports["./react"], undefined);
  assert.equal(existsSync(path.join(root, "dist/react")), false);
  const dir = mkdtempSync(path.join(tmpdir(), "track-viewer-consumer-"));
  try {
    const packed = JSON.parse(
      execFileSync(
        "npm",
        ["pack", "--ignore-scripts", "--json", "--pack-destination", dir],
        { cwd: root, encoding: "utf8" }
      )
    );
    writeFileSync(
      path.join(dir, "package.json"),
      JSON.stringify({ private: true, type: "module" })
    );
    execFileSync(
      "npm",
      [
        "install",
        path.join(dir, packed[0].filename),
        "--ignore-scripts",
        "--prefer-offline",
        "--no-audit",
        "--no-fund",
      ],
      { cwd: dir, stdio: "pipe" }
    );
    for (const dependency of [
      "react",
      "react-dom",
      "@types/react",
      "react-konva",
      "@react-three/fiber",
    ]) {
      assert.equal(
        existsSync(path.join(dir, "node_modules", dependency)),
        false,
        `${dependency} should not be installed`
      );
    }
    writeFileSync(
      path.join(dir, "consumer.ts"),
      `
      import { createTrackDrawViewer, type TrackDrawViewerOptions, type ViewerDesign } from "@trackdraw/viewer";
      import { createTrackDrawViewer as mount } from "@trackdraw/viewer/mount";
      import { validateViewerDesignSnapshot } from "@trackdraw/viewer/snapshot/schema";
      import { readViewerArchive } from "@trackdraw/viewer/snapshot/archive";
      declare const design: ViewerDesign;
      const options: TrackDrawViewerOptions = { design, theme: "dark" };
      const viewer = createTrackDrawViewer(document.createElement("div"), options);
      const mountOptions: Parameters<typeof mount>[1] = options;
      viewer.update(mountOptions);
      viewer.destroy();
      void mount; void validateViewerDesignSnapshot; void readViewerArchive;
    `
    );
    execFileSync(
      path.join(root, "node_modules/.bin/tsc"),
      [
        "--noEmit",
        "--strict",
        "--module",
        "esnext",
        "--moduleResolution",
        "bundler",
        "--target",
        "es2022",
        "consumer.ts",
      ],
      { cwd: dir, stdio: "pipe" }
    );
    execFileSync(
      process.execPath,
      [
        "--input-type=module",
        "-e",
        `
      import { createTrackDrawViewer } from '@trackdraw/viewer';
      import { CURRENT_REQUIRED_VIEWER } from '@trackdraw/viewer/snapshot/version';
      if (typeof createTrackDrawViewer !== 'function' || !CURRENT_REQUIRED_VIEWER.schema) throw Error('Invalid exports');
    `,
      ],
      { cwd: dir, stdio: "pipe" }
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
