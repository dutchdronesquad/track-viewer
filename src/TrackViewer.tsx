"use client";

import { lazy, Suspense, useState } from "react";
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

export interface TrackViewerProps {
  design: ViewerDesign;
  initialView?: "2d" | "3d";
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
  const [view, setView] = useState(initialView);
  const [has3DLoaded, setHas3DLoaded] = useState(initialView === "3d");
  const [container, setContainer] = useState<HTMLDivElement | null>(null);
  const available3D = webglSupported && !failed3D;
  const active3D = available3D && view === "3d";
  const handle3DFailure = () => setFailed3D(true);

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
      }}
    >
      <ViewerContainerContext.Provider value={container}>
        <TooltipProvider>
          {available3D ? (
            <div className="absolute top-2 left-2 z-30 flex gap-1">
              {(["2d", "3d"] as const).map((next) => (
                <button
                  key={next}
                  type="button"
                  aria-pressed={view === next}
                  onClick={() => {
                    setView(next);
                    if (next === "3d") setHas3DLoaded(true);
                  }}
                  className="border-border/60 bg-card/85 rounded-md border px-2 py-1 text-xs font-medium backdrop-blur"
                >
                  {next.toUpperCase()}
                </button>
              ))}
            </div>
          ) : null}
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
          {available3D && has3DLoaded ? (
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
        </TooltipProvider>
      </ViewerContainerContext.Provider>
    </div>
  );
}
