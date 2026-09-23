// @vitest-environment happy-dom
import { expect, it, vi } from "vitest";
import { getPolylineArrowMarkers } from "../../src/lib/track/geometry";
import { createTextTexture } from "../../src/components/canvas/preview3d/items/texture-cache";

it("bounds arrow generation for tiny positive spacing", () => {
  const markers = getPolylineArrowMarkers(
    [
      { x: 0, y: 0 },
      { x: 1, y: 0 },
    ],
    1e-9
  );
  expect(markers.length).toBeGreaterThan(0);
  expect(markers.length).toBeLessThanOrEqual(1000);
});

it("scales long label textures within portable canvas limits", () => {
  const context = { scale: vi.fn(), clearRect: vi.fn(), fillText: vi.fn() };
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(
    context as unknown as CanvasRenderingContext2D
  );
  const texture = createTextTexture("x".repeat(1000), "#fff", 512, {
    fontFamily: "sans-serif",
    fontStyle: "normal",
    fontWeight: 600,
    letterSpacing: 0,
  });
  expect(texture.image.width).toBeLessThanOrEqual(2048);
  expect(texture.image.height).toBeLessThanOrEqual(2048);
  expect(context.scale).toHaveBeenCalled();
  texture.dispose();
});

it("reports missing canvas support without dereferencing null", () => {
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);
  expect(() =>
    createTextTexture("label", "#fff", 18, {
      fontFamily: "sans-serif",
      fontStyle: "normal",
      fontWeight: 600,
      letterSpacing: 0,
    })
  ).toThrow(/canvas is unavailable/);
});
