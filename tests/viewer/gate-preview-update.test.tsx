// @vitest-environment happy-dom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { expect, it, vi } from "vitest";
import { MemoShape3D } from "../../src/viewer-3d/items/TrackItem3D";
import { SCENE_3D_THEME } from "../../src/theme";
import type { GateShape } from "../../src/types";
vi.mock("../../src/viewer-3d/items/Gate3D", () => ({
  Gate3D: ({ backColor }: { backColor?: string }) => (
    <div data-back={backColor} />
  ),
}));
it("updates a back colour without replacing the geometry or resolver", async () => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  const container = document.createElement("div"),
    root = createRoot(container);
  const shape: GateShape = {
    id: "gate",
    kind: "gate",
    width: 1.5,
    height: 1.5,
    x: 0,
    y: 0,
    rotation: 0,
  };
  const props = {
    shape,
    assetResolver: (path: string) => path,
    isPrimaryPolyline: false,
    isSelected: false,
    onSelect: () => {},
    theme: SCENE_3D_THEME.light,
  };
  await act(async () =>
    root.render(<MemoShape3D {...props} gateBackColor="#112233" />)
  );
  expect(
    container.querySelector("[data-back]")?.getAttribute("data-back")
  ).toBe("#112233");
  await act(async () =>
    root.render(<MemoShape3D {...props} gateBackColor="#22c55e" />)
  );
  expect(
    container.querySelector("[data-back]")?.getAttribute("data-back")
  ).toBe("#22c55e");
  await act(async () => root.unmount());
});
