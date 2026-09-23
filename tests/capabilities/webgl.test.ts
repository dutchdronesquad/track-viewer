// @vitest-environment happy-dom

import { describe, expect, it, vi } from "vitest";
import { detectWebglSupport } from "@trackdraw/viewer/capabilities/webgl";

function fakeCanvas(context: unknown): HTMLCanvasElement {
  return {
    getContext: () => context,
  } as unknown as HTMLCanvasElement;
}

describe("detectWebglSupport", () => {
  it("returns supported when getContext yields a context", () => {
    expect(detectWebglSupport(() => fakeCanvas({}))).toBe("supported");
  });

  it("returns unsupported when getContext returns null", () => {
    expect(detectWebglSupport(() => fakeCanvas(null))).toBe("unsupported");
  });

  it("returns unsupported when getContext throws", () => {
    const canvas = {
      getContext: () => {
        throw new Error("no webgl");
      },
    } as unknown as HTMLCanvasElement;
    expect(detectWebglSupport(() => canvas)).toBe("unsupported");
  });
});

it("rejects WebGL1-only environments", () => {
  const getContext = vi.fn((name) => (name === "webgl2" ? null : {}));
  expect(
    detectWebglSupport(() => ({ getContext }) as unknown as HTMLCanvasElement)
  ).toBe("unsupported");
  expect(getContext).toHaveBeenCalledExactlyOnceWith("webgl2");
});
it("releases the temporary detection context", () => {
  const loseContext = vi.fn();
  expect(
    detectWebglSupport(() =>
      fakeCanvas({ getExtension: () => ({ loseContext }) })
    )
  ).toBe("supported");
  expect(loseContext).toHaveBeenCalledOnce();
});
