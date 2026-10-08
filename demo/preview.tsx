import { useEffect, useRef } from "react";
import {
  createTrackDrawViewer,
  type TrackDrawViewerHandle,
  type TrackDrawViewerOptions,
  type ViewerViewState,
} from "@trackdraw/viewer";

export function Preview({
  options,
  resetRevision,
  onState,
}: {
  options: TrackDrawViewerOptions;
  resetRevision: number;
  onState: (state: ViewerViewState) => void;
}) {
  const container = useRef<HTMLDivElement>(null);
  const viewer = useRef<TrackDrawViewerHandle | null>(null);
  useEffect(() => {
    if (!viewer.current)
      viewer.current = createTrackDrawViewer(container.current!, {
        ...options,
        onViewStateChange: onState,
      });
    else viewer.current.update({ ...options, onViewStateChange: onState });
  }, [options, onState]);
  useEffect(
    () => () => {
      const handle = viewer.current;
      viewer.current = null;
      if (handle) queueMicrotask(() => handle.destroy());
    },
    []
  );
  useEffect(() => {
    if (resetRevision) viewer.current?.resetOverview();
  }, [resetRevision]);
  return <div ref={container} className="viewer-mount" />;
}
