import { describe, expect, it } from "vitest";
import {
  createCatalogShapeDraft,
  getTrackElementCatalogEntry,
  RACEGOW_GATE_ELEMENT_ID,
} from "../../packages/viewer/src/lib/track/elements/catalog";
import { getGateVisualSpec } from "../../packages/viewer/src/lib/track/elements/visual";
import { getPvcSetGate3DParts } from "../../packages/viewer/src/lib/track/render3d-layout";
import { getGate2DShape } from "../../packages/viewer/src/lib/track/shape2d";
import type { GateShape } from "../../packages/viewer/src/types";
import { RENDERER_CAPABILITIES } from "../../packages/viewer/src/snapshot/version";

describe("RaceGOW gate support", () => {
  it("advertises RaceGOW renderer compatibility", () => {
    expect(RENDERER_CAPABILITIES).toContain("catalog:racegow");
  });

  it("resolves the official RaceGOW gate and PVC visual", () => {
    const entry = getTrackElementCatalogEntry(RACEGOW_GATE_ELEMENT_ID);
    expect(entry).toMatchObject({
      name: "RaceGOW Gate",
      organization: "RaceGOW",
      kind: "gate",
      official: true,
      dimensions: {
        widthMeters: 0.6096,
        heightMeters: 0.6096,
      },
      visual: {
        kind: "gate",
        variant: "pvc-set",
      },
    });

    const shape = createCatalogShapeDraft(RACEGOW_GATE_ELEMENT_ID, {
      x: 0,
      y: 0,
      includeCatalogMetadata: true,
    }) as GateShape;

    expect(getGateVisualSpec(shape).variant).toBe("pvc-set");
    expect(getGate2DShape(shape, 50).variant).toBe("pvc-set");

    const visual = getGateVisualSpec(shape);
    if (visual.variant !== "pvc-set") throw new Error("expected pvc-set");
    const parts = getPvcSetGate3DParts(shape, visual);
    expect(parts.tubes.map((part) => part.key).sort()).toEqual([
      "post-left",
      "post-right",
      "top-bar",
    ]);
    expect(parts.hubs).toHaveLength(4);
    expect(parts.sleeves).toHaveLength(14);
  });
});
