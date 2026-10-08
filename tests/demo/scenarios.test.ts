import { describe, expect, it } from "vitest";
import { scenarios } from "../../demo/scenarios";
import { defaults, readState, stateQuery } from "../../demo/state";
import { createCatalogShapeDraft } from "../../packages/viewer/src/lib/track/elements/catalog";
import {
  validateViewerDesignSnapshot,
  VIEWER_SNAPSHOT_SCHEMA,
  getDesignAssetManifest,
  getRequiredViewer,
} from "@trackdraw/schema";

describe("demo fixtures", () => {
  it("shows the circuit ladder with standard openings and ground clearance", () => {
    const standard = createCatalogShapeDraft("trackdraw-generic-ladder", {
      x: 0,
      y: 0,
    });
    if (standard.kind !== "ladder")
      throw new Error("Expected ladder catalog entry");
    for (const id of ["circuit", "ladder"]) {
      const ladder = scenarios
        .find((scenario) => scenario.id === id)!
        .design.shapes.find((shape) => shape.kind === "ladder")!;
      expect(ladder).toMatchObject({
        width: standard.width,
        height: standard.height,
        rungs: standard.rungs,
        elevation: standard.elevation,
      });
    }
  });
  it("contains unique, valid portable scenarios with complete asset manifests", () => {
    expect(new Set(scenarios.map((s) => s.id)).size).toBe(scenarios.length);
    for (const scenario of scenarios) {
      expect(() =>
        validateViewerDesignSnapshot({
          schema: VIEWER_SNAPSHOT_SCHEMA,
          snapshotId: scenario.id,
          requiredViewer: getRequiredViewer(scenario.design.shapes),
          design: scenario.design,
          assets: getDesignAssetManifest(scenario.design.shapes),
        })
      ).not.toThrow();
    }
  });
  it("covers all renderer shape capabilities", () => {
    const kinds = new Set(
      scenarios.flatMap((s) => s.design.shapes.map((shape) => shape.kind))
    );
    expect([...kinds].sort()).toEqual([
      "barrier",
      "cone",
      "divegate",
      "flag",
      "gate",
      "label",
      "ladder",
      "polyline",
      "startfinish",
      "tower",
    ]);
  });
  it("restores a complete scenario and ignores unsupported URL values", () => {
    const state = {
      ...defaults,
      scenario: "catalog",
      theme: "dark",
      presentation: "transparent",
      fallback: "on",
      viewport: "phone",
      compare: "on",
    } as const;
    expect(readState(stateQuery(state))).toEqual(state);
    expect(readState("scenario=does-not-exist&theme=oops&view=4d")).toEqual(
      defaults
    );
  });
});
