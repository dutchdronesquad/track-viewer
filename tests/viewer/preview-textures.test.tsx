// @vitest-environment happy-dom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { Texture } from "three";
import { expect, it, vi } from "vitest";
import { usePreviewTextures } from "../../src/viewer-3d/items/use-preview-textures";

const loader = vi.hoisted(() => ({
  cache: new Map<string, unknown[]>(),
  clear: vi.fn(),
}));
vi.mock("@react-three/drei", () => {
  const useTexture = Object.assign(
    (paths: string[]) => {
      const key = JSON.stringify(paths);
      return loader.cache.get(key);
    },
    { clear: loader.clear }
  );
  return { useTexture };
});
it("keeps shared angle textures alive until the last angle changes, then clears and disposes", async () => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  const old = new Texture(),
    next = new Texture();
  const disposed = vi.spyOn(old, "dispose"),
    retired = vi.spyOn(next, "dispose");
  loader.cache.set('["blob:old"]', [old]);
  loader.cache.set('["blob:next"]', [next]);
  const container = document.createElement("div"),
    root = createRoot(container);
  function Angle({ url }: { url: string }) {
    usePreviewTextures([url]);
    return null;
  }
  await act(async () =>
    root.render(
      <>
        <Angle url="blob:old" />
        <Angle url="blob:old" />
      </>
    )
  );
  await act(async () =>
    root.render(
      <>
        <Angle url="blob:next" />
        <Angle url="blob:old" />
      </>
    )
  );
  expect(disposed).not.toHaveBeenCalled();
  await act(async () =>
    root.render(
      <>
        <Angle url="blob:next" />
        <Angle url="blob:next" />
      </>
    )
  );
  expect(disposed).toHaveBeenCalledTimes(1);
  expect(loader.clear).toHaveBeenCalledWith(["blob:old"]);
  expect(retired).not.toHaveBeenCalled();
  await act(async () => root.unmount());
  expect(retired).toHaveBeenCalledTimes(1);
});
