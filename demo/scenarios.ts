import type { ViewerDesign, ViewerShape, ShapeKind } from "@trackdraw/viewer";
import {
  createCatalogShapeDraft,
  trackElementCatalog,
} from "../packages/viewer/src/lib/track/elements/catalog";

export interface Scenario {
  id: string;
  name: string;
  group: string;
  description: string;
  design: ViewerDesign;
}
const base = (
  title: string,
  shapes: ViewerShape[],
  width = 60,
  height = 40
): ViewerDesign => ({
  version: 2,
  title,
  updatedAt: "2026-01-01T00:00:00.000Z",
  field: { width, height, origin: "tl", gridStep: 1, ppm: 20 },
  shapes,
});
const obstacleShapes: ViewerShape[] = [
  { id: "start", kind: "startfinish", x: 8, y: 30, rotation: 0, width: 4 },
  { id: "gate", kind: "gate", x: 12, y: 12, rotation: 25, width: 3, height: 2 },
  {
    id: "tower",
    kind: "tower",
    x: 28,
    y: 10,
    rotation: -25,
    width: 3,
    height: 2,
    levels: 3,
    elevation: 1,
  },
  {
    id: "flag",
    kind: "flag",
    x: 46,
    y: 12,
    rotation: 0,
    radius: 1,
    poleHeight: 4,
  },
  { id: "cone", kind: "cone", x: 50, y: 27, rotation: 0, radius: 0.5 },
  {
    ...createCatalogShapeDraft("trackdraw-generic-ladder", {
      x: 37,
      y: 28,
      rotation: 90,
    }),
    id: "ladder",
  },
  {
    id: "divegate",
    kind: "divegate",
    x: 24,
    y: 29,
    rotation: 45,
    width: 3,
    height: 3,
    elevation: 4,
    tilt: 70,
  },
  ...(["hurdle", "banner", "fence", "net"] as const).map(
    (variant, i): ViewerShape => ({
      id: variant,
      kind: "barrier",
      variant,
      x: 8 + i * 12,
      y: 36,
      rotation: 0,
      width: 5,
      height: 1.5,
    })
  ),
  {
    id: "label",
    kind: "label",
    x: 30,
    y: 20,
    rotation: 0,
    text: "TRACKDRAW • DEMO TRACK",
    fontSize: 20,
  },
  {
    id: "line",
    kind: "polyline",
    x: 0,
    y: 0,
    rotation: 0,
    points: [
      { x: 8, y: 30, z: 1 },
      { x: 12, y: 12, z: 1 },
      { x: 28, y: 10, z: 4 },
      { x: 46, y: 12, z: 2 },
      { x: 50, y: 27, z: 1 },
      { x: 37, y: 28, z: 4 },
      { x: 24, y: 29, z: 4 },
    ],
    smooth: true,
    showArrows: true,
    strokeWidth: 0.15,
    color: "#f0761d",
  },
];
const catalog: ViewerShape[] = trackElementCatalog.map(
  (entry, i) =>
    ({
      ...createCatalogShapeDraft(entry.id, {
        x: 6 + (i % 6) * 9,
        y: 6 + Math.floor(i / 6) * 9,
        rotation: (i % 4) * 45,
        includeCatalogMetadata: true,
      }),
      id: `catalog-${entry.id}`,
    }) as ViewerShape
);
export const scenarios: Scenario[] = [
  {
    id: "circuit",
    name: "Flight circuit",
    group: "Tracks",
    description:
      "A complete track with every shape family, elevated obstacles and a racing line.",
    design: base("Flight circuit", obstacleShapes),
  },
  {
    id: "catalog",
    name: "Obstacle catalog",
    group: "Tracks",
    description:
      "Every catalog entry, including branded artwork and rotated frames. Textures load from the public asset service.",
    design: base("Obstacle catalog", catalog, 60, 60),
  },
  ...(
    [...new Set(obstacleShapes.map((s) => s.kind))] satisfies ShapeKind[]
  ).map((kind) => ({
    id: kind,
    name:
      kind === "polyline"
        ? "Racing line"
        : kind === "startfinish"
          ? "Start / finish"
          : kind === "divegate"
            ? "Dive gate"
            : kind.charAt(0).toUpperCase() + kind.slice(1),
    group: "Items",
    description: `Inspect ${kind} geometry in isolation.`,
    design:
      kind === "polyline" || kind === "barrier"
        ? base(
            kind,
            obstacleShapes.filter((s) => s.kind === kind)
          )
        : base(
            kind,
            obstacleShapes
              .filter((s) => s.kind === kind)
              .map((s) => ({ ...s, x: 6, y: 6 })),
            12,
            12
          ),
  })),
  {
    id: "empty",
    name: "Empty field",
    group: "Edge cases",
    description: "A valid design without obstacles.",
    design: base("Empty field", []),
  },
  ...(
    [
      ["small", 12, 8],
      ["large", 300, 200],
      ["wide", 200, 12],
      ["tall", 12, 200],
    ] as const
  ).map(([id, width, height]) => ({
    id,
    name: `${width} × ${height} m`,
    group: "Edge cases",
    description: "Check fitted overview and resizing at unusual aspect ratios.",
    design: base(
      id,
      [{ ...obstacleShapes[1], x: width / 2, y: height / 2 }],
      width,
      height
    ),
  })),
  {
    id: "dense",
    name: "Dense track",
    group: "Edge cases",
    description: "400 generic gates for rendering and navigation checks.",
    design: base(
      "Dense track",
      Array.from({ length: 400 }, (_, i) => ({
        id: `gate-${i}`,
        kind: "gate",
        x: 5 + (i % 20) * 5,
        y: 5 + Math.floor(i / 20) * 5,
        rotation: i % 360,
        width: 2,
        height: 2,
      })),
      105,
      105
    ),
  },
];
