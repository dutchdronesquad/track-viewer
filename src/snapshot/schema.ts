import { z } from "zod";
import { VIEWER_SNAPSHOT_SCHEMA } from "./types";
import type { ViewerDesignSnapshot } from "./types";

const catalogIdentitySchema = z.object({
  version: z.number(),
  elementId: z.string(),
  assignedKind: z.string(),
  official: z.boolean(),
  snapshot: z.object({
    name: z.string(),
    organization: z.string().optional(),
    dimensionsLabel: z.string(),
  }),
});

const dimension = z.number().positive().max(100_000);
const coordinate = z.number().min(-100_000).max(100_000);
const base = {
  id: z.string().min(1).max(256),
  name: z.string().max(1000).optional(),
  x: coordinate,
  y: coordinate,
  rotation: coordinate,
  frontOffsetDeg: coordinate.optional(),
  locked: z.boolean().optional(),
  color: z.string().max(100).optional(),
  meta: z.object({ catalog: catalogIdentitySchema.optional() }).optional(),
};

// z.object strips unknown fields at every level, including imported shapes.
export const viewerShapeSchema = z.discriminatedUnion("kind", [
  z.object({
    ...base,
    kind: z.literal("gate"),
    width: dimension,
    height: dimension,
    thick: dimension.optional(),
  }),
  z.object({
    ...base,
    kind: z.literal("tower"),
    width: dimension,
    height: dimension,
    levels: z.number().int().min(1).max(100).optional(),
    elevation: coordinate.optional(),
    thick: dimension.optional(),
  }),
  z.object({
    ...base,
    kind: z.literal("flag"),
    radius: dimension,
    poleHeight: dimension.optional(),
  }),
  z.object({ ...base, kind: z.literal("cone"), radius: dimension }),
  z.object({
    ...base,
    kind: z.literal("label"),
    text: z.string().max(1000),
    fontSize: z.number().positive().max(512).optional(),
    project: z.boolean().optional(),
  }),
  z.object({ ...base, kind: z.literal("startfinish"), width: dimension }),
  z.object({
    ...base,
    kind: z.literal("ladder"),
    width: dimension,
    height: dimension,
    rungs: z.number().int().min(1).max(100),
    elevation: coordinate.optional(),
  }),
  z.object({
    ...base,
    kind: z.literal("divegate"),
    width: dimension,
    height: dimension.optional(),
    thick: dimension.optional(),
    tilt: coordinate.optional(),
    elevation: coordinate.optional(),
  }),
  z.object({
    ...base,
    kind: z.literal("barrier"),
    variant: z.enum(["hurdle", "banner", "fence", "net"]),
    width: dimension,
    height: dimension,
  }),
  z.object({
    ...base,
    kind: z.literal("polyline"),
    points: z
      .array(
        z.object({ x: coordinate, y: coordinate, z: coordinate.optional() })
      )
      .max(10_000),
    closed: z.boolean().optional(),
    strokeWidth: dimension.optional(),
    showArrows: z.boolean().optional(),
    arrowSpacing: dimension.optional(),
    smooth: z.boolean().optional(),
  }),
]);

const assetManifestEntrySchema = z.object({
  path: z
    .string()
    .regex(/^\/assets\/(?:[a-zA-Z0-9_-]+\/)*[a-zA-Z0-9_-]+\.(?:webp|png|svg)$/),
  contentType: z.string(),
  sizeBytes: z.number().int().nonnegative(),
  sha256: z
    .string()
    .regex(/^[0-9a-f]{64}$/, "must be a lowercase hex sha256 digest"),
  attribution: z.string().optional(),
});

export const viewerDesignSnapshotSchema = z.object({
  schema: z.literal(VIEWER_SNAPSHOT_SCHEMA),
  snapshotId: z.string(),
  requiredViewer: z.object({
    schema: z.literal(VIEWER_SNAPSHOT_SCHEMA),
    minRendererVersion: z
      .string()
      .regex(/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/),
    capabilities: z.array(z.string()),
  }),
  design: z.object({
    version: z.literal(2),
    title: z.string(),
    field: z.object({
      width: dimension,
      height: dimension,
      origin: z.enum(["tl", "bl"]),
      gridStep: dimension,
      ppm: dimension,
    }),
    shapes: z
      .array(viewerShapeSchema)
      .max(5000)
      .refine(
        (shapes) =>
          new Set(shapes.map((shape) => shape.id)).size === shapes.length,
        "Shape IDs must be unique"
      ),
    updatedAt: z.string(),
  }),
  assets: z.array(assetManifestEntrySchema),
});

/**
 * No embedded asset bytes ship in the snapshot JSON, so this is a generous
 * ceiling meant to catch a genuinely corrupt/runaway design, not a tight limit.
 */
export const MAX_VIEWER_SNAPSHOT_BYTES = 4_000_000;

export type ViewerSnapshotValidationFailure =
  | { type: "schema"; issues: z.core.$ZodIssue[] }
  | { type: "too_large"; byteLength: number };

export class ViewerSnapshotValidationError extends Error {
  constructor(
    message: string,
    readonly cause_: ViewerSnapshotValidationFailure
  ) {
    super(message);
    this.name = "ViewerSnapshotValidationError";
  }
}

/**
 * Validates a candidate viewer snapshot against the schema and a maximum
 * serialized-byte-size cap, throwing ViewerSnapshotValidationError on
 * failure. Used by the shared snapshot builder (src/lib/track/viewer-snapshot.ts)
 * before handing a snapshot to either the manual-export path or the API
 * route - and will also be the consumer-side validator for an untrusted
 * incoming snapshot in a future import path (e.g. RotorHazard local import).
 */
export function validateViewerDesignSnapshot(
  value: unknown
): ViewerDesignSnapshot {
  const parsed = viewerDesignSnapshotSchema.safeParse(value);
  if (!parsed.success) {
    throw new ViewerSnapshotValidationError(
      "Viewer snapshot failed schema validation.",
      { type: "schema", issues: parsed.error.issues }
    );
  }

  const byteLength = new TextEncoder().encode(
    JSON.stringify(parsed.data)
  ).byteLength;
  if (byteLength > MAX_VIEWER_SNAPSHOT_BYTES) {
    throw new ViewerSnapshotValidationError(
      `Viewer snapshot (${byteLength} bytes) exceeds the ${MAX_VIEWER_SNAPSHOT_BYTES}-byte limit.`,
      { type: "too_large", byteLength }
    );
  }

  return parsed.data;
}
