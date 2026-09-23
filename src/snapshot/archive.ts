import { unzipSync, zipSync, strFromU8, strToU8 } from "fflate";
import { getDesignAssetManifest } from "../assets/manifest";
import type { AssetResolver } from "../assets/asset-url";
import { sha256Hex, getViewerSnapshotId } from "./identity";
import {
  validateViewerDesignSnapshot,
  MAX_VIEWER_SNAPSHOT_BYTES,
} from "./schema";
import {
  isViewerCompatible,
  RENDERER_VERSION,
  RENDERER_CAPABILITIES,
} from "./version";
import type { ViewerDesignSnapshot, ViewerAssetManifestEntry } from "./types";

export const MAX_VIEWER_ARCHIVE_BYTES = 64_000_000;
const MAX_ASSET_BYTES = 8_000_000;

export interface ViewerArchive {
  snapshot: ViewerDesignSnapshot;
  assets: ReadonlyMap<string, Uint8Array>;
}

function checkedSnapshot(value: unknown): ViewerDesignSnapshot {
  const snapshot = validateViewerDesignSnapshot(value);
  if (
    !isViewerCompatible(snapshot.requiredViewer, {
      rendererVersion: RENDERER_VERSION,
      capabilities: new Set(RENDERER_CAPABILITIES),
    })
  )
    throw new Error(
      "This course requires an unsupported viewer version or capability."
    );
  const expected = getDesignAssetManifest(snapshot.design.shapes);
  if (
    snapshot.assets.length !== expected.length ||
    expected.some((entry) => {
      const actual = snapshot.assets.find((asset) => asset.path === entry.path);
      return (
        !actual ||
        actual.sha256 !== entry.sha256 ||
        actual.sizeBytes !== entry.sizeBytes ||
        actual.contentType !== entry.contentType
      );
    })
  )
    throw new Error(
      "Course asset manifest does not match the installed catalog."
    );
  if (snapshot.snapshotId !== getViewerSnapshotId(snapshot))
    throw new Error("Course content hash does not match its snapshot ID.");
  return snapshot;
}

function checkAsset(asset: ViewerAssetManifestEntry, bytes: Uint8Array) {
  if (
    bytes.byteLength > MAX_ASSET_BYTES ||
    bytes.byteLength !== asset.sizeBytes ||
    sha256Hex(bytes) !== asset.sha256
  ) {
    throw new Error(`Course asset failed integrity validation: ${asset.path}`);
  }
}

/** The caller supplies local asset bytes or an explicitly approved fetcher. No implicit network. */
export async function createViewerArchive(
  value: unknown,
  readAsset: (asset: ViewerAssetManifestEntry) => Promise<Uint8Array>
): Promise<Uint8Array> {
  const snapshot = checkedSnapshot(value);
  const files: Record<string, Uint8Array> = {
    "snapshot.json": strToU8(JSON.stringify(snapshot)),
  };
  let total = files["snapshot.json"].byteLength;
  for (const asset of snapshot.assets) {
    total += asset.sizeBytes;
    if (asset.sizeBytes > MAX_ASSET_BYTES || total > MAX_VIEWER_ARCHIVE_BYTES)
      throw new Error("Course archive is too large.");
    const bytes = await readAsset(asset);
    checkAsset(asset, bytes);
    files[asset.path.slice(1)] = bytes;
  }
  // Already-compressed images use STORE; this also keeps browser export responsive.
  const archive = zipSync(files, { level: 0 });
  if (archive.byteLength > MAX_VIEWER_ARCHIVE_BYTES)
    throw new Error("Course archive is too large.");
  return archive;
}

/** Validate before exposing any files. Reject traversal, duplicates, extra entries and zip bombs. */
export function readViewerArchive(bytes: Uint8Array): ViewerArchive {
  if (bytes.byteLength > MAX_VIEWER_ARCHIVE_BYTES)
    throw new Error("Course archive is too large.");
  const names = new Set<string>();
  let total = 0;
  const files = unzipSync(bytes, {
    filter(file) {
      if (
        names.has(file.name) ||
        (file.name !== "snapshot.json" &&
          !/^assets\/(?:[a-zA-Z0-9_-]+\/)*[a-zA-Z0-9_-]+\.(?:webp|png|svg)$/.test(
            file.name
          ))
      ) {
        throw new Error("Invalid or duplicate course archive path.");
      }
      names.add(file.name);
      total += file.originalSize;
      const limit =
        file.name === "snapshot.json"
          ? MAX_VIEWER_SNAPSHOT_BYTES
          : MAX_ASSET_BYTES;
      if (file.originalSize > limit || total > MAX_VIEWER_ARCHIVE_BYTES)
        throw new Error("Course archive is too large.");
      return true;
    },
  });
  if (!files["snapshot.json"])
    throw new Error("Course archive is missing snapshot.json.");
  const snapshot = checkedSnapshot(
    JSON.parse(strFromU8(files["snapshot.json"]))
  );
  if (names.size !== snapshot.assets.length + 1)
    throw new Error("Course archive contains unexpected files.");
  const assets = new Map<string, Uint8Array>();
  for (const asset of snapshot.assets) {
    const content = files[asset.path.slice(1)];
    if (!content) throw new Error(`Course archive is missing ${asset.path}.`);
    checkAsset(asset, content);
    assets.set(asset.path, content);
  }
  return { snapshot, assets };
}

/** Browser preview helper. Destroy the viewer before disposing these object URLs. */
export function createViewerArchiveAssets(archive: ViewerArchive): {
  assetResolver: AssetResolver;
  dispose(): void;
} {
  const urls = new Map<string, string>();
  for (const asset of archive.snapshot.assets) {
    const bytes = archive.assets.get(asset.path);
    if (!bytes) throw new Error(`Course archive is missing ${asset.path}.`);
    urls.set(
      asset.path,
      URL.createObjectURL(
        new Blob([new Uint8Array(bytes)], { type: asset.contentType })
      )
    );
  }
  return {
    assetResolver(path) {
      const url = urls.get(path);
      if (!url) throw new Error(`Course asset is unavailable: ${path}`);
      return url;
    },
    dispose() {
      for (const url of urls.values()) URL.revokeObjectURL(url);
      urls.clear();
    },
  };
}
