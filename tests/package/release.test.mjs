import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import {
  copyFileSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../..", import.meta.url));
test("release versions and the viewer dependency stay synchronized with the workspace lock", () => {
  const dir = mkdtempSync(path.join(tmpdir(), "track-release-"));
  try {
    for (const file of [
      "package.json",
      "package-lock.json",
      "packages/schema/package.json",
      "packages/viewer/package.json",
    ]) {
      mkdirSync(path.dirname(path.join(dir, file)), { recursive: true });
      copyFileSync(path.join(root, file), path.join(dir, file));
    }
    const script = path.join(root, "scripts/set-release-version.mjs");
    execFileSync(process.execPath, [script, "v1.1.0"], { cwd: dir });
    const lock = JSON.parse(
      readFileSync(path.join(dir, "package-lock.json"), "utf8")
    );
    for (const location of ["", "packages/schema", "packages/viewer"]) {
      const pkg = JSON.parse(
        readFileSync(path.join(dir, location, "package.json"), "utf8")
      );
      assert.equal(pkg.version, "1.1.0");
      assert.equal(lock.packages[location].version, pkg.version);
      if (location === "packages/viewer") {
        assert.equal(pkg.dependencies["@trackdraw/schema"], "1.1.0");
        assert.deepEqual(
          lock.packages[location].dependencies,
          pkg.dependencies
        );
      }
    }
    assert.equal(lock.packages["node_modules/@trackdraw/schema"].link, true);
    for (const invalid of ["1.1.0", "v01.1.0", "v1.1.0-rc.1"]) {
      assert.throws(() =>
        execFileSync(process.execPath, [script, invalid], {
          cwd: dir,
          stdio: "pipe",
        })
      );
    }
    assert.equal(
      JSON.parse(
        readFileSync(path.join(root, "packages/viewer/package.json"), "utf8")
      ).version,
      "0.0.0"
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
