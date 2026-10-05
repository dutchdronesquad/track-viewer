export type * from "@trackdraw/schema/shape-types";
import type { ShapeKind } from "@trackdraw/schema/shape-types";

export type InventoryShapeKind = Extract<
  ShapeKind,
  "gate" | "flag" | "cone" | "startfinish" | "ladder" | "divegate" | "barrier"
>;

export type InventoryProfile = Record<InventoryShapeKind, number>;
