import { describe, expect, it } from "vitest";
import { importTrack } from "../../demo/import-track";
import { scenarios } from "../../demo/scenarios";
import {
  createViewerArchive,
  VIEWER_SNAPSHOT_SCHEMA,
  getRequiredViewer,
  MAX_VIEWER_SNAPSHOT_BYTES,
  getViewerSnapshotId,
} from "@trackdraw/schema";

const design = scenarios.find((s) => s.id === "empty")!.design;
const snapshot = {
  schema: VIEWER_SNAPSHOT_SCHEMA,
  snapshotId: "demo-import",
  requiredViewer: getRequiredViewer(design.shapes),
  design,
  assets: [],
};
describe("demo local imports", () => {
  it("reads JSON and rejects malformed or incompatible snapshots", async () => {
    const track = await importTrack(
      new File([JSON.stringify(snapshot)], "track.json"),
      1
    );
    expect(track.design).toEqual(design);
    await expect(
      importTrack(new File(["{}"], "bad.json"), 2)
    ).rejects.toThrow();
    await expect(
      importTrack(
        new File(
          [
            JSON.stringify({
              ...snapshot,
              requiredViewer: {
                ...snapshot.requiredViewer,
                minRendererVersion: "99.0.0",
              },
            }),
          ],
          "future.json"
        ),
        3
      )
    ).rejects.toThrow("unsupported");
  });
  it("reads an offline archive and provides disposable asset resolution", async () => {
    const archived = { ...snapshot, snapshotId: getViewerSnapshotId(snapshot) };
    const bytes = await createViewerArchive(
      archived,
      async () => new Uint8Array()
    );
    const track = await importTrack(
      new File([Uint8Array.from(bytes)], "track.tdviewer.zip"),
      4
    );
    expect(track.design).toEqual(design);
    expect(track.assetResolver).toBeTypeOf("function");
    expect(track.dispose).toBeTypeOf("function");
    track.dispose!();
    await expect(
      importTrack(new File(["invalid zip"], "bad.zip"), 5)
    ).rejects.toThrow();
  });
  it("checks the input size before reading file content", async () => {
    const file = new File([], "large.json");
    Object.defineProperty(file, "size", {
      value: MAX_VIEWER_SNAPSHOT_BYTES + 1,
    });
    await expect(importTrack(file, 6)).rejects.toThrow("size limit");
  });
});
