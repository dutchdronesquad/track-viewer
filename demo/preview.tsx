import { useEffect, useRef, useState } from "react";
import {
  mountTrack,
  type MountedTrack,
  type TrackDrawViewerOptions,
  type ViewerViewState,
} from "@trackdraw/viewer";
import { sampleSnapshot } from "./examples";

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
  const viewer = useRef<MountedTrack | null>(null);
  const latest = useRef({ options, onState });
  useEffect(() => {
    latest.current = { options, onState };
  }, [options, onState]);
  const [error, setError] = useState<{
    design: TrackDrawViewerOptions["design"];
    message: string;
  } | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    const {
      design,
      assetResolver: _resolver,
      ...display
    } = latest.current.options;
    void mountTrack(container.current!, {
      ...display,
      source: sampleSnapshot(design),
      signal: controller.signal,
      onViewStateChange: latest.current.onState,
    })
      .then((handle) => {
        if (controller.signal.aborted) {
          handle.destroy();
          return;
        }
        viewer.current = handle;
        const {
          design: _design,
          assetResolver: _assets,
          ...current
        } = latest.current.options;
        handle.update({
          ...current,
          onViewStateChange: latest.current.onState,
        });
      })
      .catch((reason) => {
        if (!controller.signal.aborted)
          setError({
            design,
            message:
              reason instanceof Error
                ? reason.message
                : "Could not load the track",
          });
      });
    return () => {
      controller.abort();
      const handle = viewer.current;
      viewer.current = null;
      if (handle) queueMicrotask(() => handle.destroy());
    };
  }, [options.design]);
  useEffect(() => {
    const { design: _design, assetResolver: _assets, ...display } = options;
    viewer.current?.update({ ...display, onViewStateChange: onState });
  }, [options, onState]);
  useEffect(() => {
    if (resetRevision) viewer.current?.resetOverview();
  }, [resetRevision]);
  return (
    <>
      <div ref={container} className="viewer-mount" />
      {error?.design === options.design && <p role="alert">{error.message}</p>}
    </>
  );
}
