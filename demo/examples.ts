import type { TrackDrawViewerOptions, ViewerDesign } from "@trackdraw/viewer";
import {
  getDesignAssetManifest,
  getRequiredViewer,
  validateViewerDesignSnapshot,
  VIEWER_SNAPSHOT_SCHEMA,
} from "@trackdraw/schema";
import { createCatalogShapeDraft } from "../packages/viewer/src/lib/track/elements/catalog";
import { scenarios } from "./scenarios";

const technical = scenarios.find(
  (scenario) => scenario.id === "circuit"
)!.design;
const flow: ViewerDesign = {
  ...technical,
  title: "Flow circuit",
  shapes: [
    { id: "start", kind: "startfinish", x: 8, y: 30, rotation: 0, width: 4 },
    ...[
      [12, 12, 20],
      [30, 8, 90],
      [48, 14, 145],
      [47, 30, 210],
      [25, 30, 270],
    ].map(([x, y, rotation], i) => ({
      id: `flow-gate-${i + 1}`,
      kind: "gate" as const,
      x,
      y,
      rotation,
      width: 3,
      height: 2,
    })),
    {
      id: "flow-line",
      kind: "polyline",
      x: 0,
      y: 0,
      rotation: 0,
      smooth: true,
      showArrows: true,
      strokeWidth: 0.15,
      color: "#f0761d",
      points: [
        { x: 8, y: 30, z: 1 },
        { x: 12, y: 12, z: 1 },
        { x: 30, y: 8, z: 1 },
        { x: 48, y: 14, z: 1 },
        { x: 47, y: 30, z: 1 },
        { x: 25, y: 30, z: 1 },
      ],
    },
  ],
};
export const eventTracks = [
  {
    id: "qualifying",
    label: "Qualifying",
    time: "10:00",
    design: flow,
    note: "Five gates, wide turns. Follow the orange line from the start pads and build a consistent lap.",
  },
  {
    id: "final",
    label: "Final",
    time: "14:00",
    design: technical,
    note: "A technical layout with a tower, ladder and dive gate. Switch to 3D to check the changes in height.",
  },
] as const;
const obstacle: ViewerDesign = {
  ...technical,
  title: "MultiGP standard gate",
  field: { ...technical.field, width: 4, height: 4 },
  shapes: [
    {
      ...createCatalogShapeDraft("multigp-standard-gate-5x5", {
        x: 2,
        y: 2,
        includeCatalogMetadata: true,
      }),
      id: "product-gate",
    },
  ],
};
export interface Recipe {
  id: string;
  title: string;
  use: string;
  explanation: string;
  design: ViewerDesign;
  options: Omit<TrackDrawViewerOptions, "design">;
}
export const recipes: Recipe[] = [
  {
    id: "embed",
    title: "A first embed",
    use: "Event pages & club websites",
    explanation:
      "Mount a read-only track in a sized element. The viewer supplies its own 2D/3D buttons, pan, orbit and zoom.",
    design: flow,
    options: { initialView: "3d", theme: "light", showViewControls: true },
  },
  {
    id: "hero",
    title: "A transparent hero",
    use: "Landing pages & announcements",
    explanation:
      "Let the host background show through around the bounded track. Hide the viewer chrome and keep a host reset button for a clear opening section.",
    design: technical,
    options: {
      presentation: "transparent",
      initialView: "3d",
      theme: "light",
      showViewControls: false,
      show3DAxes: false,
      showResetControl: false,
    },
  },
  {
    id: "controls",
    title: "Your own controls",
    use: "Switchable race layouts",
    explanation:
      "Control the view from your own buttons with partial update() calls. Use setSource() to load another track; the package validates it and preserves your display options.",
    design: flow,
    options: {
      presentation: "transparent",
      view: "3d",
      theme: "light",
      showViewControls: false,
      show3DAxes: false,
    },
  },
  {
    id: "briefing",
    title: "A pilot briefing",
    use: "Layouts, units & obstacle order",
    explanation:
      "Start with an overhead layout, show obstacle numbers and choose the units your pilots use. The built-in controls still let them inspect the height in 3D.",
    design: technical,
    options: {
      initialView: "2d",
      presentation: "framed",
      unitSystem: "metric",
      showObstacleNumbers: true,
      labels: {
        fitToWindow: "Fit track",
        viewerPanZoom: "Drag to explore the track, scroll to zoom",
      },
    },
  },
  {
    id: "product",
    title: "An obstacle preview",
    use: "Equipment catalogs & build guides",
    explanation:
      "A design with one catalog obstacle uses the same mount API. Branded textures come from the asset service; the back-panel colour is a temporary viewer override.",
    design: obstacle,
    options: {
      presentation: "transparent",
      initialView: "3d",
      showViewControls: false,
      show3DAxes: false,
      gateBackColors: { "product-gate": "#f0761d" },
    },
  },
  {
    id: "fallback",
    title: "A reliable fallback",
    use: "Devices without WebGL",
    explanation:
      "The viewer falls back to 2D when 3D is unavailable. Use onViewStateChange to report the effective view. This preview deliberately simulates that condition.",
    design: flow,
    options: { initialView: "3d", forceWebglUnsupported: true },
  },
];

export function recipeCode(
  recipe: Recipe,
  options: Recipe["options"],
  snapshotFile?: string
): string {
  const { forceWebglUnsupported: _forced, ...publicOptions } = options;
  const controlled = recipe.id === "controls";
  return `import { mountTrack } from "@trackdraw/viewer";
import "@trackdraw/viewer/static/trackdraw-viewer.css";

// Host the downloaded sample at this URL, or use your own snapshot/archive.
const viewer = await mountTrack("#track", {
  source: ${JSON.stringify(`./${snapshotFile ?? (controlled ? "qualifying.snapshot.json" : "track.snapshot.json")}`)},
${JSON.stringify(publicOptions, null, 2).slice(2, -2)}${
    recipe.id === "fallback"
      ? `,
  onViewStateChange: ({ view, available3D }) => {
    document.querySelector("#status").textContent =
      available3D ? "Viewing in " + view.toUpperCase() : "Viewing in 2D: 3D is unavailable";
  }`
      : ""
  }
});
${recipe.id === "hero" ? '\ndocument.querySelector("#reset").addEventListener("click", () => viewer.resetOverview());\n' : ""}${controlled ? '\nfor (const button of document.querySelectorAll("[data-view]")) {\n  button.addEventListener("click", () => viewer.update({ view: button.dataset.view }));\n}\n\nfor (const button of document.querySelectorAll("[data-track]")) {\n  button.addEventListener("click", async () => {\n    try {\n      await viewer.setSource(button.dataset.track);\n    } catch {\n      document.querySelector("#status").textContent = "Could not load the selected track";\n    }\n  });\n}\n' : ""}${recipe.id === "fallback" ? "\n// WebGL fallback is automatic. For development testing only:\n// viewer.update({ forceWebglUnsupported: true });\n" : ""}
// Call when the host removes this embed, e.g. during route cleanup.
// viewer.destroy();`;
}
export function sampleSnapshot(design: ViewerDesign) {
  return validateViewerDesignSnapshot({
    schema: VIEWER_SNAPSHOT_SCHEMA,
    snapshotId: `showcase-${design.title!.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
    requiredViewer: getRequiredViewer(design.shapes),
    design,
    assets: getDesignAssetManifest(design.shapes),
  });
}
export function downloadSample(
  design: ViewerDesign,
  filename = "track.snapshot.json"
) {
  const snapshot = sampleSnapshot(design);
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(snapshot, null, 2)], { type: "application/json" })
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
