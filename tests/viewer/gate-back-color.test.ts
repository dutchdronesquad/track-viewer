import { describe, expect, it } from "vitest";
import { getTrackElementCatalogEntry } from "../../packages/viewer/src/lib/track/elements/catalog";
import { withGateBackColor } from "../../packages/viewer/src/viewer-3d/items/gate-back-color";

describe("host gate back colour", () => {
  it("colours all unprinted panels while preserving front artwork and the catalog", () => {
    const visual = getTrackElementCatalogEntry(
      "multigp-standard-gate-5x5"
    )!.visual;
    if (!visual || visual.kind !== "gate" || visual.variant !== "panel-frame")
      throw new Error("expected gate");
    const before = structuredClone(visual);
    const result = withGateBackColor(visual, "#112233");
    if (result.variant !== "panel-frame") throw new Error("expected gate");
    expect(Object.values(result.panels).map((panel) => panel.color)).toEqual([
      "#112233",
      "#112233",
      "#112233",
    ]);
    expect(result.textures).toBe(visual.textures);
    expect(visual).toEqual(before);
    expect(withGateBackColor(visual)).toBe(visual);
    expect(withGateBackColor(visual, "invalid")).toBe(visual);
  });
});
