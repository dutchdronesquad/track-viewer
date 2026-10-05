import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { getRequiredViewer } from "@trackdraw/schema/snapshot/version";
import { getViewerSnapshotId } from "@trackdraw/schema/snapshot/identity";
import { validateViewerDesignSnapshot } from "@trackdraw/schema/snapshot/schema";
import {
  readViewerArchive,
  createViewerArchive,
} from "@trackdraw/schema/snapshot/archive";
import {
  readViewerArchive as readLegacyArchive,
  assertViewerSnapshotSupported,
} from "@trackdraw/viewer/snapshot/archive";
import { getDesignTexturePaths } from "@trackdraw/schema/assets/texture-paths";
import {
  collectEntryTexturePaths,
  trackElementCatalog,
} from "@trackdraw/viewer/lib/track/elements/catalog";
import { snapshotFixture } from "../helpers/snapshot";

describe("shared schema extraction", () => {
  it("keeps a published 1.0.1 snapshot's exact identity and archive assets", async () => {
    const snapshot = validateViewerDesignSnapshot(
      JSON.parse(
        readFileSync(
          new URL("../fixtures/viewer-1.0.1.json", import.meta.url),
          "utf8"
        )
      )
    );
    expect(getViewerSnapshotId(snapshot)).toBe(snapshot.snapshotId);
    const archive = readViewerArchive(
      new Uint8Array(
        readFileSync(
          new URL("../fixtures/viewer-1.0.1.tdviewer.zip", import.meta.url)
        )
      )
    );
    expect(archive.snapshot).toEqual(snapshot);
    const roundtrip = await createViewerArchive(snapshot, async (asset) =>
      archive.assets.get(asset.path)!
    );
    expect(readLegacyArchive(roundtrip)).toEqual(archive);
  });
  it("reports actual catalog requirements without a renderer allowlist", () => {
    const snapshot = snapshotFixture();
    snapshot.design.shapes[0].meta = {
      catalog: {
        version: 1,
        elementId: "future-gate",
        assignedKind: "gate",
        official: true,
        snapshot: {
          name: "Future",
          organization: "FutureOrg",
          dimensionsLabel: "3m",
        },
      },
    };
    const required = getRequiredViewer(snapshot.design.shapes);
    expect(required.capabilities).toEqual(["catalog:futureorg", "shape:gate"]);
    expect(() =>
      assertViewerSnapshotSupported({ ...snapshot, requiredViewer: required })
    ).toThrow(/unsupported/);
  });
  it("lets data consumers archive a future requirement while legacy viewer readers reject it", async () => {
    const snapshot = snapshotFixture();
    snapshot.requiredViewer.minRendererVersion = "9.0.0";
    snapshot.snapshotId = getViewerSnapshotId(snapshot);
    const bytes = await createViewerArchive(
      snapshot,
      async () => new Uint8Array()
    );
    expect(readViewerArchive(bytes).snapshot).toEqual(snapshot);
    expect(() => readLegacyArchive(bytes)).toThrow(/unsupported/);
  });
  it("keeps the asset reference table equal to every rendering catalog entry", () => {
    for (const entry of trackElementCatalog) {
      const expected = new Set<string>();
      collectEntryTexturePaths(entry, expected);
      const shape = {
        ...entry.defaultShape,
        id: entry.id,
        meta: {
          catalog: {
            version: 1,
            elementId: entry.id,
            assignedKind: entry.kind,
            official: true,
            snapshot: { name: entry.id, dimensionsLabel: "test" },
          },
        },
      };
      expect(getDesignTexturePaths([shape])).toEqual([...expected]);
    }
  });
});
