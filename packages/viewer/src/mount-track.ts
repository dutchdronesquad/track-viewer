import { createTrackDrawViewer, type TrackDrawViewerHandle } from "./mount";
import type { TrackDrawViewerOptions } from "./viewer-options";
import type { ViewerDesignSnapshot } from "@trackdraw/schema/snapshot/types";
import {
  validateViewerDesignSnapshot,
  MAX_VIEWER_SNAPSHOT_BYTES,
} from "@trackdraw/schema/snapshot/schema";
import {
  readViewerArchive,
  createViewerArchiveAssets,
  MAX_VIEWER_ARCHIVE_BYTES,
  assertViewerSnapshotSupported,
} from "./snapshot/archive";

/** A public snapshot, a JSON/archive URL, or a locally selected JSON/ZIP file. */
export type TrackSource = string | URL | Blob | ViewerDesignSnapshot;
export type MountTrackOptions = Omit<
  TrackDrawViewerOptions,
  "design" | "assetResolver"
> & {
  source: TrackSource;
  /** Cancel initial loading when the host removes its container. */
  signal?: AbortSignal;
};
export interface MountedTrack {
  /** Merge display options, preserving the track and existing callbacks. */
  update(options: Partial<Omit<MountTrackOptions, "source" | "signal">>): void;
  /** Load a new track. Failed loads preserve the current track; latest request wins.
   * Returns false if superseded or destroyed while loading. */
  setSource(source: TrackSource): Promise<boolean>;
  resetOverview(): void;
  /** Cancel pending loads, unmount and release owned archive texture URLs. */
  destroy(): void;
}

type LoadedTrack = {
  snapshot: ViewerDesignSnapshot;
  assets?: ReturnType<typeof createViewerArchiveAssets>;
};

async function readResponse(
  response: Response,
  limit: number
): Promise<Uint8Array> {
  if (!response.ok)
    throw new Error(`Could not load track (HTTP ${response.status}).`);
  if (Number(response.headers.get("content-length")) > limit) {
    await response.body?.cancel();
    throw new Error("Track source exceeds the supported size limit.");
  }
  const reader = response.body?.getReader();
  if (!reader) throw new Error("Track source has no response body.");
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > limit) {
        await reader.cancel();
        throw new Error("Track source exceeds the supported size limit.");
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.length;
  }
  return bytes;
}

async function loadTrack(
  source: TrackSource,
  signal: AbortSignal
): Promise<LoadedTrack> {
  let snapshot: ViewerDesignSnapshot;
  if (
    typeof source === "string" ||
    source instanceof URL ||
    source instanceof Blob
  ) {
    let bytes: Uint8Array;
    if (source instanceof Blob) {
      if (source.size > MAX_VIEWER_ARCHIVE_BYTES)
        throw new Error("Track source exceeds the supported size limit.");
      bytes = new Uint8Array(await source.arrayBuffer());
    } else {
      const response = await fetch(source, { signal });
      const archive =
        /\.zip(?:[?#]|$)/i.test(String(source)) ||
        /zip/i.test(response.headers.get("content-type") ?? "");
      bytes = await readResponse(
        response,
        archive ? MAX_VIEWER_ARCHIVE_BYTES : MAX_VIEWER_SNAPSHOT_BYTES
      );
    }
    signal.throwIfAborted();
    if (bytes[0] === 0x50 && bytes[1] === 0x4b) {
      const archive = readViewerArchive(bytes);
      return {
        snapshot: archive.snapshot,
        assets: createViewerArchiveAssets(archive),
      };
    }
    if (bytes.length > MAX_VIEWER_SNAPSHOT_BYTES)
      throw new Error("Track snapshot exceeds the supported size limit.");
    snapshot = validateViewerDesignSnapshot(
      JSON.parse(new TextDecoder().decode(bytes))
    );
  } else {
    snapshot = validateViewerDesignSnapshot(source);
  }
  assertViewerSnapshotSupported(snapshot);
  signal.throwIfAborted();
  return { snapshot };
}

/** Load, validate and mount a track using the package's own rendering runtime. */
export async function mountTrack(
  container: HTMLElement | string,
  options: MountTrackOptions
): Promise<MountedTrack> {
  const element =
    typeof container === "string"
      ? document.querySelector<HTMLElement>(container)
      : container;
  if (!(element instanceof HTMLElement))
    throw new Error("Track viewer container must be an existing HTMLElement.");
  const { source, signal, ...initial } = options;
  let display = initial;
  let pending = new AbortController();
  let destroyed = false;
  let revision = 0;
  const abort = () => pending.abort(signal?.reason);
  signal?.addEventListener("abort", abort, { once: true });
  let current!: LoadedTrack;
  try {
    signal?.throwIfAborted();
    current = await loadTrack(source, pending.signal);
    signal?.throwIfAborted();
  } catch (error) {
    current?.assets?.dispose();
    throw error;
  } finally {
    signal?.removeEventListener("abort", abort);
  }
  const mount = (track: LoadedTrack) =>
    createTrackDrawViewer(element, {
      ...display,
      design: track.snapshot.design,
      assetResolver: track.assets?.assetResolver,
    });
  let viewer: TrackDrawViewerHandle;
  try {
    viewer = mount(current);
  } catch (error) {
    current.assets?.dispose();
    throw error;
  }
  return {
    update(next) {
      if (destroyed) return;
      display = { ...display, ...next };
      viewer.update({
        ...display,
        design: current.snapshot.design,
        assetResolver: current.assets?.assetResolver,
      });
    },
    async setSource(nextSource) {
      if (destroyed) return false;
      const request = ++revision;
      pending.abort();
      pending = new AbortController();
      let next: LoadedTrack;
      try {
        next = await loadTrack(nextSource, pending.signal);
      } catch (error) {
        if (destroyed || request !== revision) return false;
        throw error;
      }
      if (destroyed || request !== revision) {
        next.assets?.dispose();
        return false;
      }
      // Unmount before revoking texture URLs used by the old scene.
      viewer.destroy();
      current.assets?.dispose();
      current = next;
      try {
        viewer = mount(current);
      } catch (error) {
        current.assets?.dispose();
        destroyed = true;
        throw error;
      }
      return true;
    },
    resetOverview() {
      if (!destroyed) viewer.resetOverview();
    },
    destroy() {
      if (destroyed) return;
      destroyed = true;
      pending.abort();
      viewer.destroy();
      current.assets?.dispose();
    },
  };
}
