import { describe, expect, it } from "vitest";
import { transform } from "esbuild";
import { assertViewerSnapshotSupported } from "@trackdraw/viewer";
import {
  eventTracks,
  recipes,
  recipeCode,
  sampleSnapshot,
} from "../../demo/examples";

describe("developer integration recipes", () => {
  it("exports compatible sample tracks for every practical example", () => {
    for (const { design } of [...eventTracks, ...recipes]) {
      const snapshot = sampleSnapshot(design);
      expect(() => assertViewerSnapshotSupported(snapshot)).not.toThrow();
      expect(snapshot.design.shapes).toEqual(design.shapes);
    }
    expect(eventTracks[0].design.shapes).not.toEqual(
      eventTracks[1].design.shapes
    );
  });
  it("generates valid JavaScript with the preview options and public stylesheet", async () => {
    for (const recipe of recipes) {
      const code = recipeCode(recipe, recipe.options);
      await expect(
        transform(code, { loader: "js", target: "es2022" })
      ).resolves.toHaveProperty("code");
      expect(code).toContain("@trackdraw/viewer/static/trackdraw-viewer.css");
      expect(code).toContain("mountTrack");
      expect(code).toContain("viewer.destroy()");
      const { forceWebglUnsupported: _forced, ...options } = recipe.options;
      for (const [key, value] of Object.entries(options)) {
        expect(code).toContain(
          `"${key}": ${JSON.stringify(value, null, 2).split("\n")[0]}`
        );
      }
    }
  });
  it("updates copied briefing code when measurement units change", () => {
    const recipe = recipes.find((recipe) => recipe.id === "briefing")!;
    const code = recipeCode(recipe, {
      ...recipe.options,
      unitSystem: "imperial",
    });
    expect(code).toContain('"unitSystem": "imperial"');
    expect(code).not.toContain('"unitSystem": "metric"');
  });
  it("starts copied track-switching code with the currently previewed layout", () => {
    const recipe = recipes.find((recipe) => recipe.id === "controls")!;
    expect(recipeCode(recipe, recipe.options, "final.snapshot.json")).toContain(
      'source: "./final.snapshot.json"'
    );
  });
});
