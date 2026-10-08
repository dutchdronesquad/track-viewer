// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mountTrack } from "../../packages/viewer/src/mount-track";
import { createTrackDrawViewer } from "../../packages/viewer/src/mount";
import { snapshotFixture } from "../helpers/snapshot";
import { createViewerArchive } from "../../packages/schema/src/snapshot/archive";
import {
  getViewerSnapshotId,
  sha256Hex,
} from "../../packages/schema/src/snapshot/identity";
import * as manifest from "../../packages/schema/src/assets/manifest";

vi.mock("../../packages/viewer/src/mount", () => ({
  createTrackDrawViewer: vi.fn(() => ({
    update: vi.fn(),
    destroy: vi.fn(),
    resetOverview: vi.fn(),
  })),
}));
const mount = vi.mocked(createTrackDrawViewer);
function json(snapshot = snapshotFixture()) {
  return new Response(JSON.stringify(snapshot));
}
beforeEach(() => {
  document.body.innerHTML = '<div id="track"></div>';
});
afterEach(() => {
  vi.unstubAllGlobals();
});

describe("simple track mounting", () => {
  it("loads a snapshot URL and merges display updates without losing the design or callbacks", async () => {
    const fetcher = vi.fn().mockResolvedValue(json());
    vi.stubGlobal("fetch", fetcher);
    const callback = vi.fn();
    const viewer = await mountTrack("#track", {
      source: "/track.json",
      theme: "dark",
      onViewStateChange: callback,
    });
    expect(fetcher).toHaveBeenCalledWith(
      "/track.json",
      expect.objectContaining({ signal: expect.any(AbortSignal) })
    );
    const internal = mount.mock.results[0].value;
    viewer.update({ view: "2d" });
    expect(internal.update).toHaveBeenCalledWith(
      expect.objectContaining({
        design: snapshotFixture().design,
        theme: "dark",
        view: "2d",
        onViewStateChange: callback,
      })
    );
    viewer.resetOverview();
    expect(internal.resetOverview).toHaveBeenCalledOnce();
    viewer.destroy();
    viewer.destroy();
    viewer.update({ theme: "light" });
    expect(internal.destroy).toHaveBeenCalledOnce();
    expect(internal.update).toHaveBeenCalledOnce();
  });
  it("validates object and file inputs and rejects invalid or unsupported snapshots before mounting", async () => {
    const viewer = await mountTrack("#track", {
      source: new Blob([JSON.stringify(snapshotFixture())]),
    });
    viewer.destroy();
    const bad = snapshotFixture();
    bad.requiredViewer.minRendererVersion = "999.0.0";
    await expect(mountTrack("#track", { source: bad })).rejects.toThrow(
      /unsupported/
    );
    await expect(
      mountTrack("#track", { source: new Blob(["{}"]) })
    ).rejects.toThrow();
    expect(mount).toHaveBeenCalledOnce();
  });
  it("rejects missing containers before fetching", async () => {
    const fetcher = vi.fn();
    vi.stubGlobal("fetch", fetcher);
    await expect(
      mountTrack("#missing", { source: "/track.json" })
    ).rejects.toThrow(/container/);
    expect(fetcher).not.toHaveBeenCalled();
  });
  it("preserves the current track on failed replacements", async () => {
    const viewer = await mountTrack("#track", { source: snapshotFixture() });
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response("missing", { status: 404 }))
    );
    await expect(viewer.setSource("/missing.json")).rejects.toThrow(/404/);
    expect(mount.mock.results[0].value.destroy).not.toHaveBeenCalled();
    viewer.destroy();
  });
  it("enforces size limits even without a content-length header", async () => {
    const viewer = await mountTrack("#track", { source: snapshotFixture() });
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response(" ".repeat(4_000_001)))
    );
    await expect(viewer.setSource("/large.json")).rejects.toThrow(/size limit/);
    expect(mount.mock.results[0].value.destroy).not.toHaveBeenCalled();
    viewer.destroy();
  });
  it("keeps only the latest source and cancels pending work on destroy", async () => {
    const viewer = await mountTrack("#track", {
      source: snapshotFixture(),
      theme: "dark",
    });
    let finish!: (response: Response) => void;
    const fetcher = vi.fn().mockImplementation(
      () =>
        new Promise<Response>((resolve) => {
          finish = resolve;
        })
    );
    vi.stubGlobal("fetch", fetcher);
    const stale = viewer.setSource("/slow.json");
    const next = snapshotFixture();
    next.design.title = "Latest";
    expect(await viewer.setSource(next)).toBe(true);
    finish(json());
    expect(await stale).toBe(false);
    expect(mount.mock.calls.at(-1)?.[1]).toMatchObject({
      theme: "dark",
      design: { title: "Latest" },
    });
    const waiting = viewer.setSource("/slow.json");
    viewer.destroy();
    expect(fetcher.mock.calls.at(-1)?.[1].signal.aborted).toBe(true);
    finish(json());
    expect(await waiting).toBe(false);
    expect(await viewer.setSource(next)).toBe(false);
  });
  it("supports cancelling the initial download without mounting", async () => {
    const controller = new AbortController();
    vi.stubGlobal(
      "fetch",
      vi.fn(
        (_url, { signal }) =>
          new Promise((_resolve, reject) =>
            signal.addEventListener("abort", () => reject(signal.reason))
          )
      )
    );
    const pending = mountTrack("#track", {
      source: "/slow.json",
      signal: controller.signal,
    });
    controller.abort();
    await expect(pending).rejects.toThrow();
    expect(mount).not.toHaveBeenCalled();
  });
  it("owns archive URLs and unmounts before revoking them on replacement and destroy", async () => {
    const bytes = new Uint8Array([1, 2, 3]);
    const asset = {
      path: "/assets/test.webp",
      contentType: "image/webp",
      sizeBytes: bytes.length,
      sha256: sha256Hex(bytes),
    };
    vi.spyOn(manifest, "getDesignAssetManifest").mockReturnValue([asset]);
    const snapshot = snapshotFixture();
    snapshot.assets = [asset];
    snapshot.snapshotId = getViewerSnapshotId(snapshot);
    const zip = await createViewerArchive(snapshot, async () => bytes);
    const create = vi
      .spyOn(URL, "createObjectURL")
      .mockReturnValue("blob:track");
    const revoke = vi
      .spyOn(URL, "revokeObjectURL")
      .mockImplementation(() => {});
    const file = new Blob([new Uint8Array(zip)]);
    const viewer = await mountTrack("#track", { source: file });
    const internal = mount.mock.results[0].value;
    expect(mount.mock.calls[0][1].assetResolver?.(asset.path)).toBe(
      "blob:track"
    );
    await viewer.setSource(snapshot);
    expect(
      vi.mocked(internal.destroy).mock.invocationCallOrder[0]
    ).toBeLessThan(revoke.mock.invocationCallOrder[0]);
    await viewer.setSource(file);
    viewer.destroy();
    expect(create).toHaveBeenCalledTimes(2);
    expect(revoke).toHaveBeenCalledTimes(2);
  });
});
