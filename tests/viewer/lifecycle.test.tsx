// @vitest-environment happy-dom
import { act } from "react";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { createTrackDrawViewer } from "../../src/mount";
import { snapshotFixture } from "../helpers/snapshot";

const state = vi.hoisted(() => ({ fail: false }));
vi.mock("../../src/capabilities/useWebglSupport", () => ({
  useWebglSupport: (forced: boolean) => (forced ? "unsupported" : "supported"),
}));
vi.mock("../../src/viewer-2d/TrackViewer2D", () => ({
  default: () => <div data-view="2d" />,
}));
vi.mock("../../src/viewer-3d/TrackViewer3D", () => ({
  default: ({ active }: { active: boolean }) => {
    if (state.fail) throw new Error("WebGL initialization failed");
    return <div data-view="3d" data-active={String(active)} />;
  },
}));

beforeEach(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  state.fail = false;
});
afterEach(() => {
  document.body.innerHTML = "";
});

async function mount(initialView: "2d" | "3d" = "2d", forced = false) {
  const container = document.createElement("div");
  document.body.append(container);
  let handle!: ReturnType<typeof createTrackDrawViewer>;
  await act(async () => {
    handle = createTrackDrawViewer(container, {
      design: snapshotFixture().design,
      initialView,
      forceWebglUnsupported: forced,
    });
  });
  return { container, handle };
}

describe("standalone mount lifecycle", () => {
  it("keeps 2D-only instances free of a 3D mount, pauses hidden 3D, and tears down", async () => {
    const { container, handle } = await mount();
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 850));
    });
    expect(container.querySelector('[data-view="3d"]')).toBeNull();
    await act(async () => {
      (container.querySelectorAll("button")[1] as HTMLButtonElement).click();
    });
    expect(
      container.querySelector('[data-view="3d"]')?.getAttribute("data-active")
    ).toBe("true");
    await act(async () => {
      (container.querySelectorAll("button")[0] as HTMLButtonElement).click();
    });
    expect(
      container.querySelector('[data-view="3d"]')?.getAttribute("data-active")
    ).toBe("false");
    await act(async () => handle.destroy());
    expect(container.innerHTML).toBe("");
  });
  it("keeps initial 3D requests in 2D when unsupported", async () => {
    const { container, handle } = await mount("3d", true);
    expect(container.querySelector('[data-view="3d"]')).toBeNull();
    expect(
      container.querySelector<HTMLElement>('[data-view="2d"]')?.parentElement
        ?.style.visibility
    ).toBe("visible");
    await act(async () => handle.destroy());
  });
  it("recovers renderer failure into 2D", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    state.fail = true;
    const { container, handle } = await mount("3d");
    expect(
      container.querySelector<HTMLElement>('[data-view="2d"]')?.parentElement
        ?.style.visibility
    ).toBe("visible");
    expect(container.querySelector('[data-view="3d"]')).toBeNull();
    await act(async () => handle.destroy());
  });
  it("isolates view and theme between instances", async () => {
    const a = await mount();
    const b = await mount();
    await act(async () => {
      (a.container.querySelectorAll("button")[1] as HTMLButtonElement).click();
      b.handle.update({ design: snapshotFixture().design, theme: "dark" });
    });
    expect(a.container.querySelector('[data-view="3d"]')).not.toBeNull();
    expect(b.container.querySelector('[data-view="3d"]')).toBeNull();
    expect(a.container.firstElementChild?.getAttribute("data-theme")).toBe(
      "light"
    );
    expect(b.container.firstElementChild?.getAttribute("data-theme")).toBe(
      "dark"
    );
    await act(async () => {
      a.handle.destroy();
      b.handle.destroy();
    });
  });
});
