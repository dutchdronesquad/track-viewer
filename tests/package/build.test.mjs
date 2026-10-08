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
import { runInNewContext } from "node:vm";
import { init, parse } from "es-module-lexer";

await init();

const root = fileURLToPath(new URL("../..", import.meta.url));
const viewerRoot = path.join(root, "packages/viewer");
const schemaRoot = path.join(root, "packages/schema");
const pkg = JSON.parse(
  readFileSync(path.join(viewerRoot, "package.json"), "utf8")
);
const schemaPkg = JSON.parse(
  readFileSync(path.join(schemaRoot, "package.json"), "utf8")
);

// Follow static and lazy imports: checking only entry files would miss a
// renderer dependency or a second React copy hidden in a shared chunk.
function graph(entry, packageRoot = viewerRoot) {
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
      if (specifier.type === "import-meta") continue;
      assert.ok(specifier.specifier, `Nonliteral import in ${file}`);
      const name = specifier.specifier;
      if (name.startsWith(".")) visit(path.resolve(path.dirname(file), name));
      else if (
        name === "@trackdraw/schema" ||
        name.startsWith("@trackdraw/schema/")
      ) {
        const subpath =
          name === "@trackdraw/schema"
            ? "."
            : `.${name.slice("@trackdraw/schema".length)}`;
        visit(path.join(schemaRoot, schemaPkg.exports[subpath].import));
      } else external.add(name);
    }
  }
  visit(path.resolve(packageRoot, entry));
  return { external, sources };
}
const isReactSource = (source) =>
  /node_modules\/(react|react-dom)\//.test(source);

test("standalone entries bundle their runtime, including lazy 3D imports", () => {
  for (const entry of [".", "./mount"]) {
    const result = graph(pkg.exports[entry].import);
    assert.ok(
      [...result.external].every((name) =>
        Object.keys(schemaPkg.dependencies).some(
          (dep) => name === dep || name.startsWith(`${dep}/`)
        )
      )
    );
    assert.ok([...result.sources].some(isReactSource));
  }
});

test("snapshot and asset subpaths do not pull in the renderer", () => {
  for (const [name, entry] of Object.entries(pkg.exports)) {
    if (!/^\.\/(snapshot|assets)\//.test(name)) continue;
    const result = graph(entry.import);
    assert.ok(
      [...result.external].every((name) =>
        Object.keys(schemaPkg.dependencies).some(
          (dep) => name === dep || name.startsWith(`${dep}/`)
        )
      )
    );
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
  assert.equal(existsSync(path.join(viewerRoot, "dist/react")), false);
  const dir = mkdtempSync(path.join(tmpdir(), "track-viewer-consumer-"));
  try {
    const packed = JSON.parse(
      execFileSync(
        "npm",
        ["pack", "--ignore-scripts", "--json", "--pack-destination", dir],
        { cwd: viewerRoot, encoding: "utf8" }
      )
    );
    const packedSchema = JSON.parse(
      execFileSync(
        "npm",
        ["pack", "--ignore-scripts", "--json", "--pack-destination", dir],
        { cwd: schemaRoot, encoding: "utf8" }
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
        path.join(dir, packedSchema[0].filename),
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
      import { mountTrack, createTrackDrawViewer, type TrackDrawViewerOptions, type ViewerDesign } from "@trackdraw/viewer";
      import { createTrackDrawViewer as mount } from "@trackdraw/viewer/mount";
      import { validateViewerDesignSnapshot } from "@trackdraw/viewer/snapshot/schema";
      import { readViewerArchive } from "@trackdraw/viewer/snapshot/archive";
      declare const design: ViewerDesign;
      const options: TrackDrawViewerOptions = { design, theme: "dark", camera3D: { position: [1, 2, 3], target: [0, 1, 0] }, gateBackColors: { gate: "#112233" } };
      const viewer = createTrackDrawViewer(document.createElement("div"), options);
      const mountOptions: Parameters<typeof mount>[1] = options;
      viewer.update(mountOptions);
      viewer.destroy();
      const simple = await mountTrack("#track", { source: "/track.json", initialView: "3d" });
      simple.update({ theme: "dark" });
      await simple.setSource(new File([], "track.tdviewer.zip"));
      simple.destroy();
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

const forbidden =
  /(?:react|react-dom|three|konva|\.css(?:$|[?"'])|viewer\/src\/(?:lib|components|viewer-))/;

test("every emitted schema entry stays independent of rendering and DOM initialization", () => {
  assert.equal(schemaPkg.dependencies["@trackdraw/viewer"], undefined);
  assert.equal(schemaPkg.peerDependencies, undefined);
  for (const entry of Object.values(schemaPkg.exports)) {
    const result = graph(entry.import, schemaRoot);
    assert.ok(
      ![...result.sources, ...result.external].some((source) =>
        forbidden.test(source)
      )
    );
    assert.ok(
      [...result.external].every((name) =>
        Object.keys(schemaPkg.dependencies).some(
          (dep) => name === dep || name.startsWith(`${dep}/`)
        )
      )
    );
  }
});

test("schema alone installs, imports all entries and typechecks without renderer dependencies", () => {
  const dir = mkdtempSync(path.join(tmpdir(), "track-schema-consumer-"));
  try {
    const packed = JSON.parse(
      execFileSync(
        "npm",
        ["pack", "--ignore-scripts", "--json", "--pack-destination", dir],
        { cwd: schemaRoot, encoding: "utf8" }
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
      "@trackdraw/viewer",
      "react",
      "react-dom",
      "@types/react",
      "three",
      "konva",
    ])
      assert.equal(
        existsSync(path.join(dir, "node_modules", dependency)),
        false
      );
    const fixture = readFileSync(
      path.join(root, "tests/fixtures/viewer-1.0.1.json"),
      "utf8"
    );
    writeFileSync(
      path.join(dir, "consumer.ts"),
      `
      import { validateViewerDesignSnapshot, getViewerSnapshotId, getRequiredViewer, createViewerArchive, readViewerArchive, type ViewerDesignSnapshot } from "@trackdraw/schema";
      const snapshot: ViewerDesignSnapshot = validateViewerDesignSnapshot(${fixture});
      void getRequiredViewer(snapshot.design.shapes);
      if (getViewerSnapshotId(snapshot) !== snapshot.snapshotId) throw new Error("Legacy identity changed");
      const bytes = await createViewerArchive(snapshot, async () => new Uint8Array([1, 2, 3]));
      if (readViewerArchive(bytes).snapshot.snapshotId !== snapshot.snapshotId) throw new Error("Roundtrip changed");
    `
    );
    execFileSync(
      path.join(root, "node_modules/.bin/tsc"),
      [
        "--strict",
        "--module",
        "nodenext",
        "--moduleResolution",
        "nodenext",
        "--target",
        "es2022",
        "--lib",
        "es2022,dom",
        "consumer.ts",
      ],
      { cwd: dir, stdio: "pipe" }
    );
    execFileSync(process.execPath, ["consumer.js"], {
      cwd: dir,
      stdio: "pipe",
    });
    const imports = Object.keys(schemaPkg.exports)
      .map(
        (name) =>
          `await import(${JSON.stringify(`@trackdraw/schema${name === "." ? "" : name.slice(1)}`)});`
      )
      .join("\n");
    execFileSync(
      process.execPath,
      [
        "--input-type=module",
        "-e",
        `if (typeof document !== 'undefined') throw Error('Unexpected DOM');\n${imports}`,
      ],
      { cwd: dir, stdio: "pipe" }
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("the self-contained static viewer reads legacy offline assets", () => {
  const source = readFileSync(
    path.join(viewerRoot, "dist/static/trackdraw-viewer.global.js"),
    "utf8"
  );
  const context = {
    TextEncoder,
    TextDecoder,
    Uint8Array,
    console,
    setTimeout,
    clearTimeout,
    setInterval,
    clearInterval,
    queueMicrotask,
  };
  runInNewContext(source, context);
  const bytes = new Uint8Array(
    readFileSync(path.join(root, "tests/fixtures/viewer-1.0.1.tdviewer.zip"))
  );
  assert.equal(typeof context.TrackDrawViewer.mountTrack, "function");
  const archive = context.TrackDrawViewer.readViewerArchive(bytes);
  const snapshot = JSON.parse(
    readFileSync(path.join(root, "tests/fixtures/viewer-1.0.1.json"), "utf8")
  );
  assert.equal(archive.snapshot.snapshotId, snapshot.snapshotId);
  assert.equal(archive.assets.size, 1);
});
