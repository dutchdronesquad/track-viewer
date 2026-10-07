import { version } from "../../package.json";
import {
  VIEWER_SNAPSHOT_SCHEMA,
  type RequiredViewer,
} from "@trackdraw/schema/snapshot/types";
import { MIN_RENDERER_VERSION } from "@trackdraw/schema/snapshot/version";
export { isViewerCompatible } from "@trackdraw/schema/snapshot/version";

/**
 * Every render capability the current renderer supports. Extend this list
 * whenever a new shape kind or catalog organization gains renderer support.
 */
export const RENDERER_CAPABILITIES = [
  "shape:gate",
  "appearance:registry:gate-standard-v1",
  "appearance:registry:gate-championship-v1",
  "shape:tower",
  "shape:flag",
  "shape:cone",
  "shape:label",
  "shape:polyline",
  "shape:startfinish",
  "shape:ladder",
  "shape:divegate",
  "shape:barrier",
  "catalog:trackdraw",
  "catalog:multigp",
  "catalog:racegow",
] as const;

// Unreleased checkouts use the original renderer baseline for compatibility.
export const RENDERER_VERSION = version === "0.0.0" ? "0.1.0" : version;

export const CURRENT_REQUIRED_VIEWER: RequiredViewer = {
  schema: VIEWER_SNAPSHOT_SCHEMA,
  minRendererVersion: MIN_RENDERER_VERSION,
  capabilities: [...RENDERER_CAPABILITIES],
};
