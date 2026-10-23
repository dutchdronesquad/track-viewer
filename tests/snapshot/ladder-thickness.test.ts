import {
  createViewerArchive,
  readViewerArchive,
} from "@trackdraw/schema/snapshot/archive";
import { getViewerSnapshotId } from "@trackdraw/schema/snapshot/identity";
import {
  getRequiredViewer,
  isViewerCompatible,
} from "@trackdraw/schema/snapshot/version";
import {
  RENDERER_CAPABILITIES,
  RENDERER_VERSION,
} from "@trackdraw/viewer/snapshot/version";
import { snapshotFixture } from "../helpers/snapshot";
import { describe, expect, it } from "vitest";
import { viewerShapeSchema } from "@trackdraw/schema/snapshot/schema";
import { getLadder2DShape } from "../../packages/viewer/src/lib/track/shape2d";
import type { LadderShape } from "@trackdraw/schema/shape-types";

const ladder: LadderShape & { thick: number } = {
  id: "ladder",
  kind: "ladder",
  x: 0,
  y: 0,
  rotation: 0,
  width: 2,
  height: 10,
  elevation: 4,
  rungs: 2,
  thick: 0.4,
};

describe("custom ladder thickness", () => {
  it("preserves custom ladder geometry in offline archives", async () => {
    const snapshot = snapshotFixture();
    snapshot.design.shapes = [ladder];
    snapshot.requiredViewer = getRequiredViewer([ladder]);
    snapshot.snapshotId = getViewerSnapshotId(snapshot);
    const bytes = await createViewerArchive(
      snapshot,
      async () => new Uint8Array()
    );
    expect(readViewerArchive(bytes).snapshot.design.shapes).toEqual([ladder]);
  });
  it("requires thickness support only for ladders that specify it", () => {
    const required = getRequiredViewer([ladder]);
    const installed = {
      rendererVersion: RENDERER_VERSION,
      capabilities: new Set<string>(RENDERER_CAPABILITIES),
    };
    expect(required.capabilities).toContain("shape:ladder:thickness");
    expect(isViewerCompatible(required, installed)).toBe(true);
    installed.capabilities.delete("shape:ladder:thickness");
    expect(isViewerCompatible(required, installed)).toBe(false);
    const { thick: _thick, ...legacy } = ladder;
    expect(isViewerCompatible(getRequiredViewer([legacy]), installed)).toBe(
      true
    );
  });
  it.each([1, 2])(
    "preserves thickness and %i gates in the public snapshot contract",
    (rungs) => {
      const shape = { ...ladder, rungs };
      expect(viewerShapeSchema.parse(shape)).toEqual(shape);
    }
  );
  it("uses thickness for the 2D footprint and retains legacy dimensions", () => {
    expect(getLadder2DShape(ladder, 20).depth).toBe(8);
    const { thick: _thick, ...legacy } = ladder;
    expect(getLadder2DShape(legacy, 20).depth).toBe(4);
  });
});
