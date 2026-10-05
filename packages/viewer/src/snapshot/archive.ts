import * as archive from "@trackdraw/schema/snapshot/archive";
import { validateViewerDesignSnapshot } from "@trackdraw/schema/snapshot/schema";
import type { ViewerDesignSnapshot } from "@trackdraw/schema/snapshot/types";
import {
  isViewerCompatible,
  RENDERER_VERSION,
  RENDERER_CAPABILITIES,
} from "./version";

export {
  createViewerArchiveAssets,
  MAX_VIEWER_ARCHIVE_BYTES,
  type ViewerArchive,
} from "@trackdraw/schema/snapshot/archive";

/** Legacy viewer entry points retain renderer support checks through viewer 1.x. */
export function assertViewerSnapshotSupported(
  snapshot: ViewerDesignSnapshot
): void {
  if (
    !isViewerCompatible(snapshot.requiredViewer, {
      rendererVersion: RENDERER_VERSION,
      capabilities: new Set(RENDERER_CAPABILITIES),
    })
  )
    throw new Error(
      "This track requires an unsupported viewer version or capability."
    );
}

/** @deprecated Import data helpers from @trackdraw/schema; check renderer support separately. */
export async function createViewerArchive(
  ...args: Parameters<typeof archive.createViewerArchive>
) {
  assertViewerSnapshotSupported(validateViewerDesignSnapshot(args[0]));
  return archive.createViewerArchive(...args);
}

/** @deprecated Import from @trackdraw/schema/snapshot/archive; removed in viewer 2.0. */
export async function createViewerArchiveWithCurrentAssets(
  ...args: Parameters<typeof archive.createViewerArchiveWithCurrentAssets>
) {
  assertViewerSnapshotSupported(validateViewerDesignSnapshot(args[0]));
  return archive.createViewerArchiveWithCurrentAssets(...args);
}

/** @deprecated Import from @trackdraw/schema/snapshot/archive; removed in viewer 2.0. */
export function readViewerArchive(bytes: Uint8Array): archive.ViewerArchive {
  const result = archive.readViewerArchive(bytes);
  assertViewerSnapshotSupported(result.snapshot);
  return result;
}
