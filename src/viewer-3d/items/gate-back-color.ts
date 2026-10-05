import type { GateVisualSpec } from "../../lib/track/elements/catalog";

/** Host preview override; never mutates the catalog or persisted geometry. */
export function withGateBackColor(
  visual: GateVisualSpec,
  color?: string
): GateVisualSpec {
  if (
    visual.variant !== "panel-frame" ||
    !color ||
    !/^#[0-9a-f]{6}$/i.test(color)
  )
    return visual;
  return {
    ...visual,
    panels: {
      left: { ...visual.panels.left, color },
      right: { ...visual.panels.right, color },
      top: { ...visual.panels.top, color },
    },
  };
}
