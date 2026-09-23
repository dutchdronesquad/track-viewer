import { getViewerSnapshotId } from "../../src/snapshot/identity";
import {
  VIEWER_SNAPSHOT_SCHEMA,
  type ViewerDesignSnapshot,
} from "../../src/snapshot/types";

export function snapshotFixture(): ViewerDesignSnapshot {
  const snapshot: ViewerDesignSnapshot = {
    schema: VIEWER_SNAPSHOT_SCHEMA,
    snapshotId: "pending",
    requiredViewer: {
      schema: VIEWER_SNAPSHOT_SCHEMA,
      minRendererVersion: "0.1.0",
      capabilities: ["shape:gate"],
    },
    design: {
      version: 2,
      title: "Test track",
      field: { width: 60, height: 40, origin: "tl", gridStep: 1, ppm: 20 },
      shapes: [
        {
          id: "gate",
          kind: "gate",
          x: 10,
          y: 10,
          rotation: 0,
          width: 3,
          height: 2,
        },
      ],
      updatedAt: "2026-09-23T00:00:00.000Z",
    },
    assets: [],
  };
  snapshot.snapshotId = getViewerSnapshotId(snapshot);
  return snapshot;
}
