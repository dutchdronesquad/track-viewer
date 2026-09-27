import { describe, expect, it, vi } from "vitest";
import { zipSync, unzipSync, strToU8 } from "fflate";
import * as manifest from "../../src/assets/manifest";
import {
  createViewerArchive,
  createViewerArchiveWithCurrentAssets,
  readViewerArchive,
} from "../../src/snapshot/archive";
import { getViewerSnapshotId, sha256Hex } from "../../src/snapshot/identity";
import { viewerSnapshotFromApi } from "../../src/snapshot/api";
import { snapshotFixture } from "../helpers/snapshot";
import type { TrackDrawViewerOptions } from "../../src/viewer-options";

function texturedFixture() {
  const bytes = new Uint8Array([1, 2, 3]);
  const asset = {
    path: "/assets/test.webp",
    contentType: "image/webp",
    sizeBytes: 3,
    sha256: sha256Hex(bytes),
  };
  vi.spyOn(manifest, "getDesignAssetManifest").mockReturnValue([asset]);
  const snapshot = snapshotFixture();
  snapshot.assets = [asset];
  snapshot.snapshotId = getViewerSnapshotId(snapshot);
  return { snapshot, bytes };
}

describe("portable track archive", () => {
  it("round-trips data and verified bytes into directly renderable props", async () => {
    const { snapshot, bytes } = texturedFixture();
    const archive = readViewerArchive(
      await createViewerArchive(snapshot, async () => bytes)
    );
    const props: TrackDrawViewerOptions = { design: archive.snapshot.design };
    expect(props.design).toEqual(snapshot.design);
    expect(archive.assets.get("/assets/test.webp")).toEqual(bytes);
  });
  it("rejects corrupt fetched assets before producing a download", async () => {
    const { snapshot } = texturedFixture();
    await expect(
      createViewerArchive(snapshot, async () => new Uint8Array([9, 9, 9]))
    ).rejects.toThrow(/integrity/);
  });
  it("rejects missing, changed and extra archive files", async () => {
    const { snapshot, bytes } = texturedFixture();
    const files = unzipSync(
      await createViewerArchive(snapshot, async () => bytes)
    );
    delete files["assets/test.webp"];
    expect(() => readViewerArchive(zipSync(files))).toThrow();
    files["assets/test.webp"] = new Uint8Array([9, 9, 9]);
    expect(() => readViewerArchive(zipSync(files))).toThrow(/integrity/);
    files["assets/test.webp"] = bytes;
    files["assets/extra.webp"] = bytes;
    expect(() => readViewerArchive(zipSync(files))).toThrow(/unexpected/);
  });
  it("rejects archive traversal before extraction", () => {
    expect(() =>
      readViewerArchive(zipSync({ "../bad": strToU8("bad") }))
    ).toThrow(/path/);
  });
  it("rejects expanded ZIP bombs using declared sizes", () => {
    expect(() =>
      readViewerArchive(zipSync({ "snapshot.json": new Uint8Array(4_000_001) }))
    ).toThrow(/large/);
  });
  it("rejects changed track data and unsupported requirements", async () => {
    const snapshot = snapshotFixture();
    snapshot.design.title = "tampered";
    await expect(
      createViewerArchive(snapshot, async () => new Uint8Array())
    ).rejects.toThrow(/hash/);
    snapshot.requiredViewer.minRendererVersion = "9.0.0";
    await expect(
      createViewerArchive(snapshot, async () => new Uint8Array())
    ).rejects.toThrow(/unsupported/);
  });
});

it("hashes public content deterministically and detects geometry changes", () => {
  const a = snapshotFixture();
  expect(getViewerSnapshotId(a)).toBe(a.snapshotId);
  expect(
    getViewerSnapshotId({
      ...a,
      design: {
        ...a.design,
        field: { ppm: 20, gridStep: 1, origin: "tl", height: 40, width: 60 },
      },
    })
  ).toBe(a.snapshotId);
  a.design.shapes[0].x++;
  expect(getViewerSnapshotId(a)).not.toBe(a.snapshotId);
});

it("adapts the legacy REST envelope and strips project provenance", () => {
  const snapshot = snapshotFixture();
  const api = JSON.parse(
    JSON.stringify(snapshot)
      .replaceAll("snapshotId", "snapshot_id")
      .replaceAll("requiredViewer", "required_viewer")
      .replaceAll("minRendererVersion", "min_renderer_version")
      .replaceAll("gridStep", "grid_step")
      .replaceAll("updatedAt", "updated_at")
  );
  expect(
    viewerSnapshotFromApi({
      ...api,
      source: { id: "private-project" },
      type: "viewer_snapshot",
    })
  ).toEqual(snapshot);
});

it("captures changed hosted textures and retains offline integrity", async () => {
  const { snapshot } = texturedFixture();
  const changed = new Uint8Array([4, 5, 6, 7]);
  const archiveBytes = await createViewerArchiveWithCurrentAssets(
    snapshot,
    async () => changed
  );
  const archive = readViewerArchive(archiveBytes);
  expect(archive.snapshot.snapshotId).not.toBe(snapshot.snapshotId);
  expect(archive.snapshot.assets[0].sha256).toBe(sha256Hex(changed));
  expect(archive.assets.get("/assets/test.webp")).toEqual(changed);
  const files = unzipSync(archiveBytes);
  files["assets/test.webp"] = new Uint8Array([8, 8, 8, 8]);
  expect(() => readViewerArchive(zipSync(files))).toThrow(/integrity/);
});

it("rejects oversized current assets and unexpected catalog paths", async () => {
  const { snapshot } = texturedFixture();
  await expect(
    createViewerArchiveWithCurrentAssets(
      snapshot,
      async () => new Uint8Array(8_000_001)
    )
  ).rejects.toThrow(/large/);
  snapshot.assets = [
    { ...snapshot.assets[0], path: "/assets/unexpected.webp" },
  ];
  snapshot.snapshotId = getViewerSnapshotId(snapshot);
  await expect(
    createViewerArchiveWithCurrentAssets(snapshot, async () => new Uint8Array())
  ).rejects.toThrow(/catalog/);
});
