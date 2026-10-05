# Shared schema migration

`@trackdraw/schema` owns the portable snapshot contract, validation, identity, API-envelope conversion, archive layout and asset references. `@trackdraw/viewer` owns rendering, its support declarations, catalog dimensions/visuals and geometry. TrackDraw keeps its application adapter and metadata allowlist. The obstacle repository keeps source models, artwork and hosted textures.

This extraction preserves `trackdraw.viewer-snapshot.v1`, design version `2`, API response casing, canonical snapshot identities and the `.tdviewer.zip` layout. Online asset URLs and offline texture capture are unchanged. Asset references are extracted from the viewer catalog with `npm run assets:catalog-manifest`; a parity test covers every catalog entry. Regenerate this small metadata table when changing catalog texture references. Do not move rendering catalog code into schema.

## Producers

After the first stable schema release is available, replace `@trackdraw/viewer/snapshot/*` and `@trackdraw/viewer/assets/*` imports with the same subpaths under `@trackdraw/schema`. Use `MIN_RENDERER_VERSION` or `getRequiredViewer(shapes)` from `@trackdraw/schema/snapshot/version` instead of the viewer's `CURRENT_REQUIRED_VIEWER`. Compute requirements from the actual public shapes, including unrecognized catalog organizations; never intersect requirements with `RENDERER_CAPABILITIES`.

TrackDraw's `toViewerDesignSnapshot` adapter stays in TrackDraw, including its allowlist. Its API snapshot routes and ZIP export can use schema without installing a renderer. Remove the direct viewer dependency once no runtime or type imports remain. Install the published version and regenerate the consumer lockfile; do not commit local tarball dependencies or source aliases. Keep this consumer migration unmerged until the registry package exists.

## Rendering consumers

```ts
import {
  readViewerArchive,
  createViewerArchiveAssets,
} from "@trackdraw/schema";
import {
  createTrackDrawViewer,
  assertViewerSnapshotSupported,
} from "@trackdraw/viewer";

const archive = readViewerArchive(bytes);
assertViewerSnapshotSupported(archive.snapshot);
const assets = createViewerArchiveAssets(archive);
const viewer = createTrackDrawViewer(container, {
  design: archive.snapshot.design,
  assetResolver: assets.assetResolver,
});
// During host cleanup:
viewer.destroy();
assets.dispose();
```

Schema checks data validity and integrity. Renderer support is a separate check: valid snapshots can require a renderer version or capability unavailable on a particular host. Static hosts retain the self-contained viewer global, including archive helpers and their support checks.

## Compatibility window

Viewer 1.x retains its existing `snapshot/*`, `assets/*`, and root data exports. Data entry points re-export schema; legacy archive helpers also retain the installed viewer's version/capability rejection. `snapshot/version` continues exposing the viewer's version and support list. These migration entry points are deprecated and will be removed in viewer 2.0, whose release notes must call out the removal. New consumers should use schema now; a format migration is not part of this extraction.

## Delivery order

1. Merge and validate the two-package workspace, then bootstrap/configure schema publishing as described in [Publishing](publishing.md).
2. Publish a stable paired release (the first extraction release is intended as `v1.1.0`): schema first, then viewer.
3. Verify the exact registry versions and clean consumer installations.
4. Complete [TrackDraw consumer migration #955](https://github.com/dutchdronesquad/trackdraw/issues/955): migrate TrackDraw's snapshot/API/export imports and remove its direct viewer dependency; run adapter, API and offline archive tests against the published package before merging.
5. Rendering hosts may upgrade independently during the viewer 1.x compatibility window. Link cross-repository consumer delivery to [issue #11](https://github.com/dutchdronesquad/track-viewer/issues/11) before closing it.

Package extraction, npm publication and deployed consumer validation are separate delivery steps.
