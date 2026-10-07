import { describe, expect, it, vi } from "vitest";
import {
  appearanceReferenceSchema,
  discoverAppearances,
  resolveRegistryAppearance,
  applyGateAppearance,
  getAppearanceTemplate,
  type AppearanceReference,
} from "../../packages/schema/src/appearance/registry";
import {
  viewerShapeSchema,
  validateViewerDesignSnapshot,
} from "../../packages/schema/src/snapshot/schema";
import { getDesignAssetManifest } from "../../packages/schema/src/assets/manifest";
import { createAssetResolver } from "../../packages/schema/src/assets/asset-url";
import {
  createViewerArchive,
  readViewerArchive,
} from "../../packages/schema/src/snapshot/archive";
import { getViewerSnapshotId } from "../../packages/schema/src/snapshot/identity";
import { snapshotFixture } from "../helpers/snapshot";
import { getGateVisualSpec } from "../../packages/viewer/src/lib/track/elements/visual";
import type { GateShape } from "../../packages/schema/src/shape-types";

const ref: AppearanceReference = {
  source: "registry",
  collectionId: "dds",
  textureId: "standard-gate",
  templateId: "gate-standard-v1",
};
const panelBytes = new TextEncoder().encode("RIFF0000WEBPfixture");
function fixtureFetch(overrides: Record<string, unknown> = {}) {
  const manifest = {
    schemaVersion: 1,
    id: "dds",
    name: "Dutch Drone Squad",
    status: "published",
    author: "DDS",
    attribution: "DDS artwork",
    usage: { terms: "DDS permits offline track export", portable: "allowed" },
    textures: [
      {
        id: "standard-gate",
        name: "Standard gate",
        template: "gate-standard-v1",
        backColor: "#123456",
        panels: {
          left: "/dds/standard-gate-left.webp",
          right: "/dds/standard-gate-right.webp",
          top: "/dds/standard-gate-top.webp",
        },
      },
    ],
    ...overrides,
  };
  return vi.fn<typeof fetch>(async (input) => {
    const path = String(input).replace("https://assets.trackdraw.app", "");
    if (path === "/collections.json")
      return Response.json({
        schemaVersion: 1,
        collections: [
          { id: "dds", name: "DDS", manifest: "/dds/manifest.json" },
        ],
      });
    if (path === "/dds/manifest.json") return Response.json(manifest);
    if (path.endsWith(".webp"))
      return new Response(panelBytes, {
        headers: { "content-type": "image/webp" },
      });
    throw new Error("Unexpected request");
  });
}
function gate(): GateShape {
  return {
    id: "gate",
    kind: "gate",
    width: 1.524,
    height: 1.524,
    x: 0,
    y: 0,
    rotation: 0,
    appearance: ref,
    meta: {
      catalog: {
        version: 1,
        elementId: "multigp-standard-gate-5x5",
        assignedKind: "gate",
        official: true,
        snapshot: {
          name: "Standard gate",
          organization: "MultiGP",
          dimensionsLabel: "5×5",
        },
      },
    },
  };
}

describe("public registry appearance contract", () => {
  it("discovers published texture identities and resolves only same-origin validated panels", async () => {
    const fetcher = fixtureFetch();
    expect(await discoverAppearances(fetcher)).toEqual([
      {
        reference: ref,
        name: "Standard gate",
        collectionName: "Dutch Drone Squad",
      },
    ]);
    const resolved = await resolveRegistryAppearance(ref, fetcher);
    expect(resolved.assets).toHaveLength(3);
    expect(resolved.backColor).toBe("#123456");
    expect(resolved.assets[0].sha256).toMatch(/^[0-9a-f]{64}$/);
    expect(createAssetResolver()(resolved.panels.left)).toBe(
      "https://assets.trackdraw.app/dds/standard-gate-left.webp"
    );
    expect(
      fetcher.mock.calls.every(
        ([, options]) =>
          options?.credentials === "omit" && options.redirect === "error"
      )
    ).toBe(true);
  });
  it("preserves stable references and another source without storing URLs in the shape", () => {
    const parsed = viewerShapeSchema.parse({
      ...gate(),
      appearance: { ...ref, url: "https://untrusted.test/panel.webp" },
    });
    expect(parsed.appearance).toEqual(ref);
    const privateRef = {
      source: "private",
      assetId: "my-gate",
      templateId: "gate-standard-v1",
    };
    expect(
      viewerShapeSchema.parse({ ...gate(), appearance: privateRef }).appearance
    ).toEqual(privateRef);
    expect(() =>
      appearanceReferenceSchema.parse({ ...ref, collectionId: "../../evil" })
    ).toThrow();
  });
  it("rejects unsupported versions, foreign collections, malformed images and unknown templates", async () => {
    await expect(
      resolveRegistryAppearance(ref, fixtureFetch({ schemaVersion: 2 }))
    ).rejects.toThrow();
    await expect(
      resolveRegistryAppearance(ref, fixtureFetch({ id: "other" }))
    ).rejects.toThrow();
    await expect(
      resolveRegistryAppearance(
        { ...ref, templateId: "gate-standard-v2" },
        fixtureFetch()
      )
    ).rejects.toThrow(/Unsupported/);
    const fetcher = fixtureFetch();
    const invalid = vi.fn<typeof fetch>(async (input, options) =>
      String(input).endsWith(".webp")
        ? new Response("not an image", {
            headers: { "content-type": "image/webp" },
          })
        : fetcher(input, options)
    );
    await expect(resolveRegistryAppearance(ref, invalid)).rejects.toThrow(
      /Invalid/
    );
    await expect(
      resolveRegistryAppearance(
        ref,
        fixtureFetch({
          textures: [
            {
              id: "standard-gate",
              name: "Bad",
              template: "gate-standard-v1",
              panels: { left: "https://evil.test/a.webp" },
            },
          ],
        })
      )
    ).rejects.toThrow();
  });
  it("does not infer compatibility from dimensions or another obstacle family", () => {
    expect(getAppearanceTemplate(gate())).toBe("gate-standard-v1");
    expect(getAppearanceTemplate({ ...gate(), meta: undefined })).toBeNull();
    expect(getAppearanceTemplate({ ...gate(), kind: "tower" })).toBeNull();
    expect(
      getAppearanceTemplate({
        ...gate(),
        meta: {
          catalog: {
            version: 1,
            assignedKind: "gate",
            elementId: "multigp-championship-gate-7x6",
          },
        },
      })
    ).toBeNull();
  });
  it("keeps geometry and applies printed-front orientation and solid backs", async () => {
    const base = getGateVisualSpec(gate());
    if (base.variant !== "panel-frame")
      throw new Error("Expected panel geometry");
    const entry = await resolveRegistryAppearance(ref, fixtureFetch());
    const visual = applyGateAppearance(base, entry, (path) => path);
    expect(visual.panels.left.widthMeters).toBe(base.panels.left.widthMeters);
    expect(visual.panels.top.heightMeters).toBe(base.panels.top.heightMeters);
    expect(visual.frame).toEqual(base.frame);
    expect(
      Object.values(visual.panels).every((panel) => panel.color === "#123456")
    ).toBe(true);
    expect(visual.textures.placement?.left).toEqual({
      source: "left",
      orientation: { textureTopEdgeFaces: "top" },
    });
    expect(getGateVisualSpec({ ...gate(), appearance: undefined })).toEqual(
      base
    );
  });
  it("round-trips the DDS archive without metadata or texture network requests on cold read", async () => {
    const entry = await resolveRegistryAppearance(ref, fixtureFetch());
    const snapshot = snapshotFixture();
    snapshot.design.shapes = [gate()];
    snapshot.design.appearances = [entry];
    snapshot.assets = getDesignAssetManifest(snapshot.design.shapes, [entry]);
    snapshot.snapshotId = getViewerSnapshotId(snapshot);
    const validated = validateViewerDesignSnapshot(
      JSON.parse(JSON.stringify(snapshot))
    );
    const bytes = await createViewerArchive(validated, async () => panelBytes);
    const network = vi
      .spyOn(globalThis, "fetch")
      .mockRejectedValue(new Error("Offline"));
    try {
      const archive = readViewerArchive(bytes);
      expect(archive.snapshot.design.shapes[0].appearance).toEqual(ref);
      expect(archive.snapshot.design.appearances?.[0].usage.portable).toBe(
        "allowed"
      );
      expect(archive.assets.size).toBe(3);
      expect(network).not.toHaveBeenCalled();
    } finally {
      network.mockRestore();
    }
  });
  it("reports missing resolution and denied portable terms before any export fetch", async () => {
    const snapshot = snapshotFixture();
    snapshot.design.shapes = [gate()];
    snapshot.snapshotId = getViewerSnapshotId(snapshot);
    const read = vi.fn(async () => panelBytes);
    await expect(createViewerArchive(snapshot, read)).rejects.toThrow(
      /resolved/
    );
    const entry = await resolveRegistryAppearance(
      ref,
      fixtureFetch({ usage: { terms: "Online only", portable: "not-granted" } })
    );
    snapshot.design.appearances = [entry];
    snapshot.assets = getDesignAssetManifest(snapshot.design.shapes, [entry]);
    snapshot.snapshotId = getViewerSnapshotId(snapshot);
    await expect(createViewerArchive(snapshot, read)).rejects.toThrow(/permit/);
    expect(read).not.toHaveBeenCalled();
  });
});
