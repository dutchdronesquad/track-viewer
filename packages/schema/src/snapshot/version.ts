import {
  VIEWER_SNAPSHOT_SCHEMA,
  type RequiredViewer,
  type ViewerShape,
} from "./types.js";

/** Original renderer floor for the v1 format, independent of package release versions. */
export const MIN_RENDERER_VERSION = "0.1.0";

/** Report actual requirements, including capabilities an installed renderer may not support. */
export function getRequiredViewer(
  shapes: readonly ViewerShape[]
): RequiredViewer {
  const capabilities = new Set<string>();
  for (const shape of shapes) {
    capabilities.add(`shape:${shape.kind}`);
    const organization = shape.meta?.catalog?.snapshot.organization;
    if (organization) capabilities.add(`catalog:${organization.toLowerCase()}`);
  }
  return {
    schema: VIEWER_SNAPSHOT_SCHEMA,
    minRendererVersion: MIN_RENDERER_VERSION,
    capabilities: [...capabilities].sort(),
  };
}

/** Format and requirements check against support explicitly supplied by a renderer. */
export function isViewerCompatible(
  required: RequiredViewer,
  installed: { rendererVersion: string; capabilities: ReadonlySet<string> }
): boolean {
  if (required.schema !== VIEWER_SNAPSHOT_SCHEMA) return false;
  const valid = /^\d+\.\d+\.\d+$/;
  if (
    !valid.test(installed.rendererVersion) ||
    !valid.test(required.minRendererVersion)
  )
    return false;
  const actual = installed.rendererVersion.split(".").map(Number);
  const minimum = required.minRendererVersion.split(".").map(Number);
  for (let i = 0; i < 3; i++) {
    if (actual[i] < minimum[i]) return false;
    if (actual[i] > minimum[i]) break;
  }
  return required.capabilities.every((capability) =>
    installed.capabilities.has(capability)
  );
}
