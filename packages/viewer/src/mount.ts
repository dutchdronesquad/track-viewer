import { createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { TrackViewer } from "./TrackViewer";
import type { TrackDrawViewerOptions } from "./viewer-options";

export interface TrackDrawViewerHandle {
  /** Re-renders with new options (e.g. after refreshing a snapshot). */
  update(options: TrackDrawViewerOptions): void;
  /** Restore the canonical fitted overview in transparent presentation. */
  resetOverview(): void;
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
  let current = options;
  let resetRevision = 0;
  const render = () =>
    root.render(createElement(TrackViewer, { ...current, resetRevision }));
  render();

  return {
    update(next) {
      current = next;
      render();
    },
    resetOverview() {
      resetRevision++;
      render();
    },
    destroy() {
      root.unmount();
    },
  };
}
