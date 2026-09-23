import type { TrackDesign } from "../types";

export function getDesignShapes(design: TrackDesign) {
  return design.shapes;
}

export function getDesignShapeById(design: TrackDesign, id: string) {
  return design.shapes.find((shape) => shape.id === id) ?? null;
}
