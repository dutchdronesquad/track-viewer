import type { TrackViewerLabels } from "./i18n/labels";
import type { MeasurementUnitSystem } from "./types";
import type { ViewerDesign } from "./snapshot/types";
import type { AssetResolver } from "./assets/asset-url";

export type ViewerView = "2d" | "3d";

export interface ViewerViewState {
  view: ViewerView;
  available3D: boolean;
}

export interface TrackDrawViewerOptions {
  design: ViewerDesign;
  initialView?: ViewerView;
  /** Controlled mode for hosts that provide their own view buttons. */
  view?: ViewerView;
  showViewControls?: boolean;
  onViewChange?: (view: ViewerView) => void;
  /** Reports the effective mode, including WebGL fallback. */
  onViewStateChange?: (state: ViewerViewState) => void;
  assetsBaseUrl?: string;
  /** Overrides assetsBaseUrl, for example with validated archive object URLs. */
  assetResolver?: AssetResolver;
  unitSystem?: MeasurementUnitSystem;
  theme?: "light" | "dark";
  labels?: Partial<TrackViewerLabels["canvasOverlay"]>;
  showObstacleNumbers?: boolean;
  /** Test-only: force the WebGL-unsupported fallback path. */
  forceWebglUnsupported?: boolean;
}
