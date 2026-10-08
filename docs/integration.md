# Integration guide

Try the [live demo](https://viewer.trackdraw.app/) for practical website embeds and the [developer examples](https://viewer.trackdraw.app/develop) for live previews, copyable HTML/JavaScript and sample tracks. These examples follow the current development source and may include options not yet available in the latest npm release.

## Simple website embed

Use `mountTrack` from `@trackdraw/viewer` to load a public snapshot or archive and show it in an existing element. It includes snapshot validation, renderer compatibility checks and archive texture cleanup. This API follows development source and will be available in the next npm release; use `createTrackDrawViewer` with current releases until then.

```ts
import { mountTrack } from "@trackdraw/viewer";
import "@trackdraw/viewer/static/trackdraw-viewer.css";

const viewer = await mountTrack("#track", {
  source: "/track.snapshot.json",
  initialView: "3d",
});
viewer.update({ theme: "dark" });
await viewer.setSource("/final.snapshot.json");
// On removing the embed:
viewer.destroy();
```

Give the element an explicit height, for example `<div id="track" style="height: 420px; width: 100%"></div>`. `source` accepts a JSON snapshot URL, a `.tdviewer.zip` URL, a `URL`, a local `File`/`Blob`, or a snapshot object. URL archives should use a `.zip` extension or a ZIP response content type. Public URLs need to permit browser CORS access; keep private API credentials on your server. For TrackDraw REST responses, adapt `response.data` with `viewerSnapshotFromApi` before passing that snapshot as `source`.

`update()` merges display options, preserving unspecified options, callbacks and the track. Pass `undefined` to clear an optional option. `setSource()` validates before replacing the current viewer, preserves display options and resets the camera for the new track. A failed load rejects and leaves the current track visible. Rapid switches use the latest request; superseded requests and loads cancelled by `destroy()` resolve to `false`, successful replacements resolve to `true`. `destroy()` is idempotent and releases archive object URLs after unmounting. No extra `assets.dispose()` is needed.

Loading errors are rejected promises, so show feedback in your host page. During a component lifecycle, cancel the initial load if the container is removed before the handle arrives:

```ts
const controller = new AbortController();
let viewer: Awaited<ReturnType<typeof mountTrack>> | undefined;
// Register this with your framework's cleanup hook before starting the load.
const cleanup = () => {
  controller.abort();
  viewer?.destroy();
};
try {
  viewer = await mountTrack(container, {
    source: "/track.tdviewer.zip",
    signal: controller.signal,
  });
} catch (error) {
  if (!controller.signal.aborted) showTrackError(error);
}
```

The signal applies to initial loading. Later `setSource()` loads are managed by the handle and cancelled by subsequent source changes or destruction. Use the low-level mount interface below for already prepared designs and custom asset resolvers.

## Mount API

Import `createTrackDrawViewer` from `@trackdraw/viewer` or `@trackdraw/viewer/mount`. Give it an empty, host-owned `HTMLElement` with an explicit width and height, plus `TrackDrawViewerOptions`. Keep the returned handle for updates and cleanup:

- `update(options)` replaces the options; pass the complete set, including `design` and any callbacks or asset resolver you want to retain.
- `destroy()` unmounts the viewer. Call it before removing or reusing the container. If you created archive asset URLs, dispose of those after destroying the viewer.

The renderer is browser-only. In React or another component framework, mount it after the container exists and destroy it during cleanup. Keep updates on the existing handle rather than mounting another viewer in the same container. There is no public React component or `@trackdraw/viewer/react` entry point.

| Option                | Purpose                                                                                          |
| --------------------- | ------------------------------------------------------------------------------------------------ |
| `design`              | Required portable `ViewerDesign`; use a validated snapshot's `design`.                           |
| `initialView`         | Initial `"2d"` or `"3d"` mode; defaults to `"2d"`.                                               |
| `view`                | Controlled `"2d"` or `"3d"` mode, overriding the internal selection.                             |
| `showViewControls`    | Show the built-in mode buttons; defaults to `true`.                                              |
| `onViewChange`        | Receives mode requests from the built-in buttons. A controlled host must update `view` itself.   |
| `onViewStateChange`   | Reports effective `{ view, available3D }`, including fallback to 2D.                             |
| `theme`               | `"light"` or `"dark"`; defaults to `"light"`.                                                    |
| `unitSystem`          | Choose `"metric"` or `"imperial"`.                                                               |
| `labels`              | Override the `grid`, `viewerPanZoom`, and `fitToWindow` labels; `grid` is a formatting function. |
| `showObstacleNumbers` | Configure obstacle numbering.                                                                    |
| `assetsBaseUrl`       | Override the catalog asset base URL for local or custom hosting.                                 |
| `assetResolver`       | Resolve individual asset paths; takes precedence over `assetsBaseUrl`.                           |

For a host-owned toolbar, set `showViewControls: false`, call `update({ ...options, view: nextView })` on selection, and use `onViewStateChange` to reflect the effective mode and hide or disable 3D when unavailable.

## Portable track contract

`ViewerDesignSnapshot.design` is accepted directly as the `design` option of `createTrackDrawViewer`. It contains `version: 2`, `title`, `field`, `shapes`, and `updatedAt`; editor storage, inventory, ownership, and account data are not required. Validate untrusted JSON with `validateViewerDesignSnapshot` before rendering. Validation requires each shape kind's geometry, strips unknown fields, limits counts/dimensions and rejects duplicate IDs. `isViewerCompatible` checks the renderer floor and required capabilities separately.

For snapshot JSON received from a file or API, validate before mounting:

```ts
import { validateViewerDesignSnapshot } from "@trackdraw/viewer/snapshot/schema";
import {
  isViewerCompatible,
  RENDERER_VERSION,
  RENDERER_CAPABILITIES,
} from "@trackdraw/viewer/snapshot/version";

// candidate is parsed JSON from your application's input.
const snapshot = validateViewerDesignSnapshot(candidate);
if (
  !isViewerCompatible(snapshot.requiredViewer, {
    rendererVersion: RENDERER_VERSION,
    capabilities: new Set(RENDERER_CAPABILITIES),
  })
) {
  throw new Error("This track requires a newer viewer.");
}
// Pass snapshot.design to createTrackDrawViewer.
```

Catch validation and compatibility errors in the host and show an appropriate message before replacing an existing preview. The mount API does not perform these snapshot checks for you.

TrackDraw's REST API retains its existing snake_case response. Pass its `response.data` through `viewerSnapshotFromApi` (also exported at `./snapshot/api`) to obtain the same camelCase snapshot as a local export; private project provenance is stripped. Do not pass raw API shapes directly to the renderer.

`getViewerSnapshotId` computes a deterministic SHA-256 identifier from validated public content. Property insertion order and asset/capability ordering do not change the ID. Geometry, display metadata, source update time and asset hashes do. Build the snapshot, validate it, then set `snapshotId` to this ID.

Online texture URLs are stable and may receive compatible artwork updates independently of viewer releases. Snapshot asset hashes describe a captured revision, not a runtime pin on the online host.

## Offline track archives

A `.tdviewer.zip` contains `snapshot.json` and exactly the texture files listed in its manifest, under `assets/...`. It contains no executable code. The viewer's static script/CSS must be installed separately on the host. MultiGP images are included only for the track that uses them, not redistributed inside this npm package.

```ts
import {
  createTrackDrawViewer,
  assertViewerSnapshotSupported,
} from "@trackdraw/viewer";
import {
  readViewerArchive,
  createViewerArchiveAssets,
} from "@trackdraw/schema/snapshot/archive";
import "@trackdraw/viewer/static/trackdraw-viewer.css";

const archive = readViewerArchive(new Uint8Array(await file.arrayBuffer()));
assertViewerSnapshotSupported(archive.snapshot);
const assets = createViewerArchiveAssets(archive);
const viewer = createTrackDrawViewer(container, {
  design: archive.snapshot.design,
  assetResolver: assets.assetResolver,
  theme: "light",
});
// When removing the preview:
viewer.destroy();
assets.dispose();
```

The static global exposes the same archive reader/object-URL helper alongside `createTrackDrawViewer`. See [the plain HTML example](../examples/static.html). For persistent hosting, store the verified archive files locally and use `assetsBaseUrl` pointing at their parent directory instead of temporary object URLs. Complete validation before replacing an existing event attachment.

`createViewerArchiveWithCurrentAssets(snapshot, readAsset)` captures the current approved texture bytes and updates the archive manifest and snapshot ID. Use it when exporting from the live asset host; old archives remain readable and retain their own byte-integrity checks.

`createViewerArchive(snapshot, readAsset)` lets browser exports and backend API adapters build the same archive. It never fetches implicitly: the caller supplies approved local bytes or an approved fetcher. It verifies catalog manifest completeness, stable snapshot identity, sizes and SHA-256 hashes before returning bytes. Import rejects missing, extra, duplicate and unsafe paths, corrupt assets, and oversized archives (4 MB snapshot, 8 MB per asset, 64 MB archive/expanded total). Hashes check integrity, not authorship. V1 supports the installed catalog assets only; user-uploaded imagery/maps are outside this contract.

## Runtime and lifecycle

Provide an explicitly sized container, e.g. `height: 420px; width: 100%`. Each viewer owns its theme and viewport; no host-wide reset, storage, account calls or analytics are installed. Choose `theme`, `unitSystem`, `labels`, `initialView`, and `showObstacleNumbers` per instance. `assetResolver` overrides `assetsBaseUrl` when supplied.

2D-only instances do not mount a WebGL renderer or load 3D textures. Once visited, a hidden 3D scene pauses its frame loop while retaining its camera. 3D requires WebGL2; unavailable or failed initialization/context loss leaves the existing 2D view usable. `destroy()` unmounts the React root and releases instance resources. The watermark is embedded and requires no CDN CORS configuration; externally hosted catalog textures still require the asset host to permit CORS.

Use a modern browser with ES modules, ResizeObserver, and CSS nesting support; WebGL2 is optional. The static artifact bundles React and all JavaScript dependencies. The ESM mount API also bundles React internally and requires no React installation in the host. ESM consumers need a bundler that resolves the package chunks. Serve the static JavaScript and CSS locally for cold offline use.

## Shared data package

Import new snapshot/asset helpers and types from `@trackdraw/schema`, including `viewerSnapshotFromApi`. Validate renderer compatibility with `assertViewerSnapshotSupported(snapshot)` from the viewer before mounting. Existing viewer data subpaths remain available through 1.x with the legacy archive support checks. See [Shared schema migration](schema-migration.md) for the producer adapter boundary and release order.

## Registry artwork and offline archives

`@trackdraw/schema/appearance/registry` owns source-aware shape references, validation, discovery, resolution and the gate panel mappings. Standard 5 × 5 ft panel-frame gates advertise `gate-standard-v1`; Championship 7 × 6 ft gates advertise `gate-championship-v1`. Club sheets use independent front-view left/right panels. Original MultiGP Championship normal/red artwork retains its shared side-image rotation. Keep the reference when metadata, artwork or a future source/template is unavailable; the renderer uses its existing geometry and a safe fallback.

A `ViewerDesign` may include `appearances`, containing validated resolved mappings and usage metadata. Pass `archive.snapshot.design` unchanged to the viewer, together with `createViewerArchiveAssets(archive).assetResolver`. Cold offline rendering uses the embedded appearance mapping and panel bytes; texture warmup must not request the overridden MultiGP artwork. Keep the asset URLs alive until the viewer is destroyed.

Archives require each requested appearance to be resolved and its portable permission to be `allowed`. The DDS collection permits this usage. Archive creation reports unavailable references and denied usage before producing a download, and stores current asset integrity data and attribution. Existing archives without appearances remain supported.
