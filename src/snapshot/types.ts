import type { Shape } from "../lib/types";

/** Portable public course contract shared by validation, archives and rendering. */
export const VIEWER_SNAPSHOT_SCHEMA = "trackdraw.viewer-snapshot.v1" as const;

export interface RequiredViewer {
  schema: typeof VIEWER_SNAPSHOT_SCHEMA;
  /** Semver floor: the installed @trackdraw/viewer renderer must be >= this. */
  minRendererVersion: string;
  /** Renderer feature flags this snapshot's shapes require, e.g. "shape:divegate", "catalog:multigp". */
  capabilities: string[];
}

export interface ViewerCatalogIdentity {
  version: number;
  elementId: string;
  assignedKind: string;
  official: boolean;
  snapshot: {
    name: string;
    organization?: string;
    dimensionsLabel: string;
  };
}

/** Renderable geometry with only approved public catalog metadata. */
type PublicShape<T extends Shape> = T extends Shape
  ? Omit<T, "meta"> & { meta?: { catalog?: ViewerCatalogIdentity } }
  : never;
export type ViewerShape = PublicShape<Shape>;

export interface ViewerDesign {
  version: 2;
  title: string;
  field: ViewerFieldSpec;
  shapes: ViewerShape[];
  updatedAt: string;
}

export interface ViewerFieldSpec {
  width: number;
  height: number;
  origin: "tl" | "bl";
  gridStep: number;
  ppm: number;
}

export interface ViewerAssetManifestEntry {
  /** Root-relative asset path, e.g. "/assets/models/textures/multigp-obstacles/....webp". */
  path: string;
  contentType: string;
  sizeBytes: number;
  sha256: string;
  /** Present for source-restricted assets (e.g. MultiGP-branded textures) per the Phase 0 asset-inventory decision. */
  attribution?: string;
}

export interface ViewerDesignSnapshot {
  schema: typeof VIEWER_SNAPSHOT_SCHEMA;
  snapshotId: string;
  requiredViewer: RequiredViewer;
  design: ViewerDesign;
  /** Required assets (currently: catalog textures) the design's shapes reference, path-referenced not byte-embedded. */
  assets: ViewerAssetManifestEntry[];
}
