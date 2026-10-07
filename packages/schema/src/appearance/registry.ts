import { z } from "zod";
import type { Shape } from "../shape-types.js";
import { sha256Hex } from "../snapshot/identity.js";
import { OBSTACLE_ASSETS_URL } from "../assets/asset-url.js";

const id = z
  .string()
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
  .max(100);
// The outer contract is source-aware. Unknown future sources retain their stable IDs.
export const appearanceReferenceSchema = z
  .object({
    source: id,
    collectionId: id.optional(),
    textureId: id.optional(),
    templateId: id,
    assetId: id.optional(),
  })
  .superRefine((value, ctx) => {
    if (
      value.source === "registry" &&
      (!value.collectionId || !value.textureId)
    )
      ctx.addIssue({
        code: "custom",
        message: "Registry appearances require collection and texture IDs.",
      });
  });
export type AppearanceReference = z.infer<typeof appearanceReferenceSchema>;

const text = z.string().min(1).max(4000);
const panelPath = z
  .string()
  .regex(/^\/assets\/registry\/[a-z0-9-]+\/[A-Za-z0-9_-]+\.webp$/);
export const resolvedAppearanceSchema = z
  .object({
    reference: appearanceReferenceSchema,
    name: text,
    collectionName: text,
    attribution: text,
    usage: z.object({
      terms: text,
      portable: z.enum(["allowed", "not-granted"]),
    }),
    panels: z.object({ left: panelPath, right: panelPath, top: panelPath }),
    backColor: z
      .string()
      .regex(/^#[0-9a-fA-F]{6}$/)
      .optional(),
    assets: z
      .array(
        z.object({
          path: panelPath,
          contentType: z.literal("image/webp"),
          sizeBytes: z.number().int().min(12).max(524288),
          sha256: z.string().regex(/^[0-9a-f]{64}$/),
          attribution: text,
        })
      )
      .min(1)
      .max(3),
  })
  .superRefine((value, ctx) => {
    const prefix = `/assets/registry/${value.reference.collectionId}/`;
    const paths = new Set(Object.values(value.panels));
    if (
      value.reference.source !== "registry" ||
      value.reference.templateId !== "gate-standard-v1" ||
      [...paths].some((path) => !path.startsWith(prefix)) ||
      value.assets.length !== paths.size ||
      value.assets.some((asset) => !paths.delete(asset.path)) ||
      paths.size
    )
      ctx.addIssue({
        code: "custom",
        message:
          "Appearance panels and assets must match their collection and supported template.",
      });
  });
export type ResolvedAppearance = z.infer<typeof resolvedAppearanceSchema>;

export function appearanceKey(ref: AppearanceReference): string {
  return JSON.stringify([
    ref.source,
    ref.collectionId,
    ref.textureId,
    ref.templateId,
    ref.assetId,
  ]);
}
export function getAppearanceTemplate(shape: Shape): string | null {
  const catalog = shape.meta?.catalog as
    | { elementId?: unknown; assignedKind?: unknown; version?: unknown }
    | undefined;
  return shape.kind === "gate" &&
    catalog?.version === 1 &&
    catalog.assignedKind === "gate" &&
    catalog.elementId === "multigp-standard-gate-5x5"
    ? "gate-standard-v1"
    : null;
}
export function findShapeAppearance(
  shape: Shape,
  appearances: readonly ResolvedAppearance[]
): ResolvedAppearance | undefined {
  if (
    !shape.appearance ||
    getAppearanceTemplate(shape) !== shape.appearance.templateId
  )
    return;
  return appearances.find(
    (entry) =>
      appearanceKey(entry.reference) === appearanceKey(shape.appearance!)
  );
}

const usageSchema = z.object({
  terms: text,
  portable: z.enum(["allowed", "not-granted"]),
});
const publishedPanel = z.string().regex(/^\/[a-z0-9-]+\/[A-Za-z0-9_-]+\.webp$/);
const manifestSchema = z.object({
  schemaVersion: z.literal(1),
  id,
  name: text,
  status: z.literal("published"),
  author: text,
  attribution: text,
  usage: usageSchema,
  textures: z
    .array(
      z.object({
        id,
        name: text,
        template: id,
        panels: z.record(z.string(), publishedPanel),
        backColor: z
          .string()
          .regex(/^#[0-9a-fA-F]{6}$/)
          .optional(),
      })
    )
    .min(1)
    .max(200),
});
const indexSchema = z.object({
  schemaVersion: z.literal(1),
  collections: z
    .array(
      z.object({
        id,
        name: text,
        manifest: z.string().regex(/^\/[a-z0-9-]+\/manifest\.json$/),
      })
    )
    .max(200),
});
export interface AppearanceChoice {
  reference: AppearanceReference;
  name: string;
  collectionName: string;
}

async function readJson(
  path: string,
  fetchAsset: typeof fetch
): Promise<unknown> {
  const response = await fetchAsset(`${OBSTACLE_ASSETS_URL}${path}`, {
    credentials: "omit",
    redirect: "error",
    signal: AbortSignal.timeout(10000),
  });
  if (!response.ok) throw new Error("Artwork metadata is unavailable.");
  const body = await response.text();
  if (body.length > 1_000_000)
    throw new Error("Artwork metadata is too large.");
  return JSON.parse(body);
}
async function readManifest(collectionId: string, fetchAsset: typeof fetch) {
  id.parse(collectionId);
  const manifest = manifestSchema.parse(
    await readJson(`/${collectionId}/manifest.json`, fetchAsset)
  );
  if (
    manifest.id !== collectionId ||
    new Set(manifest.textures.map((texture) => texture.id)).size !==
      manifest.textures.length ||
    manifest.textures.some((texture) =>
      Object.values(texture.panels).some(
        (path) => !path.startsWith(`/${collectionId}/`)
      )
    )
  )
    throw new Error("Artwork manifest identity or paths do not match.");
  return manifest;
}
export async function discoverAppearances(
  fetchAsset: typeof fetch = fetch
): Promise<AppearanceChoice[]> {
  const index = indexSchema.parse(
    await readJson("/collections.json", fetchAsset)
  );
  if (
    new Set(index.collections.map((entry) => entry.id)).size !==
      index.collections.length ||
    index.collections.some(
      (entry) => entry.manifest !== `/${entry.id}/manifest.json`
    )
  )
    throw new Error("Invalid artwork discovery index.");
  const manifests = await Promise.allSettled(
    index.collections.map((entry) => readManifest(entry.id, fetchAsset))
  );
  return manifests.flatMap((result) =>
    result.status === "fulfilled"
      ? result.value.textures
          .filter(
            (texture) =>
              texture.template === "gate-standard-v1" &&
              texture.panels.left &&
              texture.panels.right &&
              texture.panels.top
          )
          .map((texture) => ({
            reference: {
              source: "registry",
              collectionId: result.value.id,
              textureId: texture.id,
              templateId: texture.template,
            },
            name: texture.name,
            collectionName: result.value.name,
          }))
      : []
  );
}

export async function resolveRegistryAppearance(
  ref: AppearanceReference,
  fetchAsset: typeof fetch = fetch
): Promise<ResolvedAppearance> {
  appearanceReferenceSchema.parse(ref);
  if (ref.source !== "registry" || ref.templateId !== "gate-standard-v1")
    throw new Error("Unsupported artwork source or template.");
  const manifest = await readManifest(ref.collectionId!, fetchAsset);
  const texture = manifest.textures.find(
    (entry) => entry.id === ref.textureId && entry.template === ref.templateId
  );
  if (
    !texture ||
    !texture.panels.left ||
    !texture.panels.right ||
    !texture.panels.top
  )
    throw new Error("Artwork is unavailable.");
  const panels = {
    left: `/assets/registry${texture.panels.left}`,
    right: `/assets/registry${texture.panels.right}`,
    top: `/assets/registry${texture.panels.top}`,
  };
  const assets = await Promise.all(
    [...new Set(Object.values(panels))].map(async (path) => {
      const response = await fetchAsset(
        `${OBSTACLE_ASSETS_URL}${path.slice("/assets/registry".length)}`,
        {
          credentials: "omit",
          redirect: "error",
          signal: AbortSignal.timeout(10000),
        }
      );
      if (
        !response.ok ||
        response.headers.get("content-type")?.split(";")[0] !== "image/webp"
      )
        throw new Error("Artwork panel is unavailable.");
      const bytes = new Uint8Array(await response.arrayBuffer());
      if (
        bytes.length > 524288 ||
        bytes.length < 12 ||
        new TextDecoder().decode(bytes.slice(0, 4)) !== "RIFF" ||
        new TextDecoder().decode(bytes.slice(8, 12)) !== "WEBP"
      )
        throw new Error("Invalid artwork panel.");
      return {
        path,
        contentType: "image/webp" as const,
        sizeBytes: bytes.length,
        sha256: sha256Hex(bytes),
        attribution: manifest.attribution,
      };
    })
  );
  return resolvedAppearanceSchema.parse({
    reference: ref,
    name: texture.name,
    collectionName: manifest.name,
    attribution: manifest.attribution,
    usage: manifest.usage,
    panels,
    backColor: texture.backColor,
    assets,
  });
}

// Transient runtime resolution; only references belong in editable saved designs.
const entries = new Map<string, ResolvedAppearance>();
const pending = new Map<string, Promise<ResolvedAppearance>>();
const listeners = new Set<() => void>();
let revision = 0;
export const getAppearanceRevision = () => revision;
export function subscribeAppearances(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
export function getResolvedAppearance(
  ref?: AppearanceReference
): ResolvedAppearance | undefined {
  return ref ? entries.get(appearanceKey(ref)) : undefined;
}
export function loadAppearance(
  ref: AppearanceReference,
  fetchAsset: typeof fetch = fetch
): Promise<ResolvedAppearance> {
  const key = appearanceKey(ref);
  const existing = entries.get(key);
  if (existing) return Promise.resolve(existing);
  const running = pending.get(key);
  if (running) return running;
  const task = resolveRegistryAppearance(ref, fetchAsset)
    .then((entry) => {
      entries.set(key, entry);
      revision++;
      listeners.forEach((listener) => listener());
      return entry;
    })
    .finally(() => pending.delete(key));
  pending.set(key, task);
  return task;
}

/** Consumer geometry stays intact; the template defines the printed-front orientation. */
export function applyGateAppearance<
  T extends {
    panels: {
      left: { color: string };
      right: { color: string };
      top: { color: string };
    };
    textures: { left: string; right: string; top?: string };
  },
>(visual: T, entry: ResolvedAppearance, resolve: (path: string) => string): T {
  return {
    ...visual,
    panels: {
      ...visual.panels,
      left: {
        ...visual.panels.left,
        color: entry.backColor ?? visual.panels.left.color,
      },
      right: {
        ...visual.panels.right,
        color: entry.backColor ?? visual.panels.right.color,
      },
      top: {
        ...visual.panels.top,
        color: entry.backColor ?? visual.panels.top.color,
      },
    },
    textures: {
      left: resolve(entry.panels.left),
      right: resolve(entry.panels.right),
      top: resolve(entry.panels.top),
      placement: {
        left: { source: "left", orientation: { textureTopEdgeFaces: "top" } },
        right: { source: "right", orientation: { textureTopEdgeFaces: "top" } },
        top: { source: "top", orientation: { textureTopEdgeFaces: "top" } },
      },
    },
  };
}
