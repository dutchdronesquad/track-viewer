export {
  mountTrack,
  type MountedTrack,
  type MountTrackOptions,
  type TrackSource,
} from "./mount-track";
export type {
  TrackDrawViewerOptions,
  ViewerView,
  ViewerViewState,
  ViewerCamera3D,
} from "./viewer-options";
export { createTrackDrawViewer, type TrackDrawViewerHandle } from "./mount";
export type {
  BarrierVariant,
  FieldSpec,
  MeasurementUnitSystem,
  Shape,
  ShapeKind,
  TrackDesign,
} from "./types";
export {
  DEFAULT_VIEWER_LABELS,
  mergeViewerLabels,
  type TrackViewerLabels,
} from "./i18n/labels";
export { detectWebglSupport, type WebglSupport } from "./capabilities/webgl";
export {
  createAssetResolver,
  OBSTACLE_ASSETS_URL,
  IDENTITY_ASSET_RESOLVER,
  type AssetResolver,
} from "@trackdraw/schema/assets/asset-url";
export { getDesignTexturePaths } from "@trackdraw/schema/assets/texture-paths";
export {
  VIEWER_SNAPSHOT_SCHEMA,
  type RequiredViewer,
  type ViewerAssetManifestEntry,
  type ViewerCatalogIdentity,
  type ViewerDesignSnapshot,
  type ViewerFieldSpec,
  type ViewerShape,
} from "@trackdraw/schema/snapshot/types";
export {
  CURRENT_REQUIRED_VIEWER,
  RENDERER_CAPABILITIES,
  RENDERER_VERSION,
  isViewerCompatible,
} from "./snapshot/version";
export {
  MAX_VIEWER_SNAPSHOT_BYTES,
  ViewerSnapshotValidationError,
  validateViewerDesignSnapshot,
  viewerDesignSnapshotSchema,
  type ViewerSnapshotValidationFailure,
} from "@trackdraw/schema/snapshot/schema";
export {
  getAssetManifestEntry,
  getDesignAssetManifest,
} from "@trackdraw/schema/assets/manifest";

export { viewerSnapshotFromApi } from "@trackdraw/schema/snapshot/api";
export { getViewerSnapshotId } from "@trackdraw/schema/snapshot/identity";
export {
  createViewerArchive,
  createViewerArchiveWithCurrentAssets,
  readViewerArchive,
  createViewerArchiveAssets,
  type ViewerArchive,
} from "./snapshot/archive";
export type { ViewerDesign } from "@trackdraw/schema/snapshot/types";

export { assertViewerSnapshotSupported } from "./snapshot/archive";
