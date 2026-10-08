/**
 * Replaces next-intl in the extracted viewer: a plain, overridable string
 * table instead of a framework-coupled translation hook.
 */
export interface TrackViewerLabels {
  canvasOverlay: {
    grid: (gridLabel: string) => string;
    viewerPanZoom: string;
    fitToWindow: string;
    resetOverview?: string;
    loading3D?: string;
    unavailable3D?: string;
  };
}

export const DEFAULT_VIEWER_LABELS: TrackViewerLabels = {
  canvasOverlay: {
    grid: (gridLabel) => `Grid ${gridLabel}`,
    viewerPanZoom: "Drag to pan, wheel to zoom",
    fitToWindow: "Fit to window",
    resetOverview: "Reset overview",
    loading3D: "Loading 3D track…",
    unavailable3D: "3D is unavailable. Showing the 2D track instead.",
  },
};

export function mergeViewerLabels(
  overrides?: Partial<{
    canvasOverlay: Partial<TrackViewerLabels["canvasOverlay"]>;
  }>
): TrackViewerLabels {
  if (!overrides) return DEFAULT_VIEWER_LABELS;
  return {
    canvasOverlay: {
      ...DEFAULT_VIEWER_LABELS.canvasOverlay,
      ...overrides.canvasOverlay,
    },
  };
}
