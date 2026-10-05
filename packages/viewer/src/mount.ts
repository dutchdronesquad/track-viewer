import { createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { TrackViewer } from "./TrackViewer";
import type { TrackDrawViewerOptions } from "./viewer-options";

export interface TrackDrawViewerHandle {
  /** Re-renders with new options (e.g. after refreshing a snapshot). */
  update(options: TrackDrawViewerOptions): void;
  /** Unmounts and releases the React root. */
  destroy(): void;
}

/**
 * Mount a read-only viewer in a host-owned container. The published build
 * includes its own rendering runtime and needs no React installation.
 */
export function createTrackDrawViewer(
  container: HTMLElement,
  options: TrackDrawViewerOptions
): TrackDrawViewerHandle {
  const root: Root = createRoot(container);
  root.render(createElement(TrackViewer, options));

  return {
    update(next) {
      root.render(createElement(TrackViewer, next));
    },
    destroy() {
      root.unmount();
    },
  };
}
