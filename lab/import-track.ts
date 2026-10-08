import {
  validateViewerDesignSnapshot,
  MAX_VIEWER_SNAPSHOT_BYTES,
} from "@trackdraw/schema/snapshot/schema";
import {
  readViewerArchive,
  createViewerArchiveAssets,
  MAX_VIEWER_ARCHIVE_BYTES,
} from "@trackdraw/schema/snapshot/archive";
import { assertViewerSnapshotSupported } from "@trackdraw/viewer/snapshot/archive";
import type { ViewerDesign } from "@trackdraw/schema/snapshot/types";
import type { AssetResolver } from "@trackdraw/schema/assets/asset-url";

export interface ImportedTrack {
  id: number;
  name: string;
  design: ViewerDesign;
  assetResolver?: AssetResolver;
  dispose?: () => void;
}
export async function importTrack(
  file: File,
  id: number
): Promise<ImportedTrack> {
  const archiveFile = file.name.toLowerCase().endsWith(".zip");
  if (
    file.size >
    (archiveFile ? MAX_VIEWER_ARCHIVE_BYTES : MAX_VIEWER_SNAPSHOT_BYTES)
  )
    throw new Error("This file exceeds the viewer import size limit.");
  if (archiveFile) {
    const archive = readViewerArchive(new Uint8Array(await file.arrayBuffer()));
    assertViewerSnapshotSupported(archive.snapshot);
    const assets = createViewerArchiveAssets(archive);
    return { id, name: file.name, design: archive.snapshot.design, ...assets };
  }
  const snapshot = validateViewerDesignSnapshot(JSON.parse(await file.text()));
  assertViewerSnapshotSupported(snapshot);
  return { id, name: file.name, design: snapshot.design };
}
