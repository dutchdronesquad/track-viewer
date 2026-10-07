import {
  findShapeAppearance,
  type ResolvedAppearance,
} from "../appearance/registry.js";
import catalogTextures from "./generated/catalog-textures.json";
import type { Shape } from "../shape-types.js";

const pathsByElement: Readonly<Record<string, readonly string[]>> =
  catalogTextures;
const placeableKinds = new Set([
  "gate",
  "tower",
  "flag",
  "cone",
  "label",
  "startfinish",
  "ladder",
  "divegate",
  "barrier",
]);

/** Only the texture references used by this design; no rendering catalog dependency. */
export function getDesignTexturePaths(
  shapes: readonly Shape[],
  appearances: readonly ResolvedAppearance[] = []
): string[] {
  const paths = new Set<string>();
  for (const shape of shapes) {
    const appearance = findShapeAppearance(shape, appearances);
    if (appearance) {
      Object.values(appearance.panels).forEach((path) => paths.add(path));
      continue;
    }
    const catalog = shape.meta?.catalog;
    if (!catalog || typeof catalog !== "object") continue;
    const identity = catalog as Record<string, unknown>;
    const snapshot = identity.snapshot;
    if (
      identity.version !== 1 ||
      typeof identity.elementId !== "string" ||
      !Object.hasOwn(pathsByElement, identity.elementId) ||
      typeof identity.assignedKind !== "string" ||
      !placeableKinds.has(identity.assignedKind) ||
      typeof identity.official !== "boolean" ||
      !snapshot ||
      typeof snapshot !== "object"
    )
      continue;
    const metadata = snapshot as Record<string, unknown>;
    if (
      typeof metadata.name !== "string" ||
      typeof metadata.dimensionsLabel !== "string" ||
      ("organization" in metadata && typeof metadata.organization !== "string")
    )
      continue;
    for (const path of pathsByElement[identity.elementId]) paths.add(path);
  }
  return [...paths];
}
