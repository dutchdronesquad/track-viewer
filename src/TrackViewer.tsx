"use client";

import { lazy, Suspense, useEffect, useState } from "react";
import { useWebglSupport } from "./capabilities/useWebglSupport";
import { Viewer3DBoundary } from "./capabilities/Viewer3DBoundary";
import { TooltipProvider } from "./components/AppTooltip";
import { ViewerContainerContext } from "./components/viewer-container";
import type { TrackViewerLabels } from "./i18n/labels";
import type { MeasurementUnitSystem } from "./types";
import type { ViewerDesign } from "./snapshot/types";
import type { AssetResolver } from "./assets/asset-url";
import TrackViewer2D from "./viewer-2d/TrackViewer2D";

const TrackViewer3D = lazy(() => import("./viewer-3d/TrackViewer3D"));

export type ViewerView = "2d" | "3d";

export interface ViewerViewState {
  view: ViewerView;
  available3D: boolean;
}

export interface TrackViewerProps {
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

export function TrackViewer({
  design,
  initialView = "2d",
  view: controlledView,
  showViewControls = true,
  onViewStateChange,
  onViewChange,
  assetsBaseUrl,
  assetResolver,
  unitSystem,
  theme = "light",
  labels,
  showObstacleNumbers,
  forceWebglUnsupported = false,
}: TrackViewerProps) {
  const webglSupported = useWebglSupport(forceWebglUnsupported) === "supported";
  const [failed3D, setFailed3D] = useState(false);
  const [internalView, setView] = useState(initialView);
  const view = controlledView ?? internalView;
  const [has3DLoaded, setHas3DLoaded] = useState(initialView === "3d");
  const [container, setContainer] = useState<HTMLDivElement | null>(null);
  const available3D = webglSupported && !failed3D;
  const active3D = available3D && view === "3d";
  const handle3DFailure = () => setFailed3D(true);
  if (view === "3d" && !has3DLoaded) {
    setHas3DLoaded(true);
  }
  useEffect(() => {
    onViewStateChange?.({ view: active3D ? "3d" : "2d", available3D });
  }, [active3D, available3D, onViewStateChange]);

  return (
    <div
      ref={setContainer}
      className="trackdraw-viewer"
      data-theme={theme}
      style={{
        position: "relative",
        height: "100%",
        width: "100%",
        isolation: "isolate",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <ViewerContainerContext.Provider value={container}>
        <TooltipProvider>
          {showViewControls && available3D ? (
            <div
              data-viewer-toolbar
              role="group"
              aria-label="View"
              className="border-border bg-card flex shrink-0 gap-1 border-b p-2"
            >
              {(["2d", "3d"] as const).map((next) => (
                <button
                  key={next}
                  type="button"
                  aria-pressed={(active3D ? "3d" : "2d") === next}
                  onClick={() => {
                    setView(next);
                    onViewChange?.(next);
                    if (next === "3d") setHas3DLoaded(true);
                  }}
                  className="border-border text-foreground hover:bg-muted aria-pressed:bg-primary aria-pressed:text-primary-foreground focus-visible:outline-primary min-h-11 min-w-12 rounded-md border px-3 py-2 text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-2"
                >
                  {next.toUpperCase()}
                </button>
              ))}
            </div>
          ) : null}
          <div
            data-viewer-canvas
            style={{ position: "relative", flex: "1 1 0%", minHeight: 0 }}
          >
            <div
              style={{ visibility: active3D ? "hidden" : "visible" }}
              className="absolute inset-0"
            >
              <TrackViewer2D
                design={design}
                unitSystem={unitSystem}
                theme={theme}
                labels={labels}
                showObstacleNumbers={showObstacleNumbers}
              />
            </div>
            {available3D && (has3DLoaded || view === "3d") ? (
              <div
                style={{ visibility: active3D ? "visible" : "hidden" }}
                className="absolute inset-0"
              >
                <Viewer3DBoundary onUnavailable={handle3DFailure}>
                  <Suspense fallback={null}>
                    <TrackViewer3D
                      design={design}
                      theme={theme}
                      assetsBaseUrl={assetsBaseUrl}
                      assetResolver={assetResolver}
                      active={active3D}
                      onUnavailable={handle3DFailure}
                    />
                  </Suspense>
                </Viewer3DBoundary>
              </div>
            ) : null}
          </div>
        </TooltipProvider>
      </ViewerContainerContext.Provider>
    </div>
  );
}
