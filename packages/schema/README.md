# @trackdraw/schema

Portable TrackDraw snapshot types, validation, content identity, API-envelope conversion, offline ZIP archives, and asset references. The package runs in Node.js or a browser without importing React, Three.js, Konva, CSS, or a renderer. It performs no DOM initialization or implicit network requests.

```ts
import {
  viewerSnapshotFromApi,
  createViewerArchiveWithCurrentAssets,
  readViewerArchive,
  getRequiredViewer,
} from "@trackdraw/schema";

const snapshot = viewerSnapshotFromApi(apiResponse.data);
const requirements = getRequiredViewer(snapshot.design.shapes);
const bytes = await createViewerArchiveWithCurrentAssets(
  snapshot,
  readApprovedAsset
);
const archive = readViewerArchive(bytes);
```

`readApprovedAsset` supplies the bytes for each manifest entry. Archive helpers validate format, catalog asset completeness, identity, sizes, paths and SHA-256 integrity. A renderer must separately check `requiredViewer` before rendering. The package contains asset metadata and references, never third-party artwork bytes.

Root exports and `snapshot/{types,schema,version,api,identity,archive}`, `assets/{manifest,texture-paths,asset-url}`, and `shape-types` subpaths are available. `getRequiredViewer` reports each shape kind and catalog organization actually used; it does not intersect requirements with one renderer's support list. The schema version and original renderer floor remain unchanged, independently of npm package versions.

See the repository's [integration guide](https://github.com/dutchdronesquad/track-viewer/blob/main/docs/integration.md), [migration guide](https://github.com/dutchdronesquad/track-viewer/blob/main/docs/schema-migration.md), and [publishing guide](https://github.com/dutchdronesquad/track-viewer/blob/main/docs/publishing.md). This package and `@trackdraw/viewer` share a release version; schema publishes first.
