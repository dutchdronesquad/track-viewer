# TrackDraw Viewer

Embed interactive 2D and 3D FPV race tracks in your website or application. **@trackdraw/viewer** renders portable [TrackDraw](https://trackdraw.app) track designs in a read-only viewer, with a plain JavaScript API and support for offline track archives.

- **2D and 3D views** with per-instance themes, measurement units, labels, and obstacle numbering.
- **Portable track data** with validation and renderer compatibility checks.
- **Offline viewing** from `.tdviewer.zip` archives containing a track and its catalog textures.
- **Self-contained integration** with scoped styles and no TrackDraw account or editor state required.

## Installation

For an application with a JavaScript bundler:

```sh
npm install @trackdraw/viewer
```

No separate React installation is needed. Import the viewer stylesheet once; no Tailwind configuration is required in the host application.

For a site without a bundler, use the [plain HTML integration](#plain-html).

## Quick start

The default API bundles its own rendering runtime. Your application does not need React:

```ts
import { createTrackDrawViewer } from "@trackdraw/viewer";
import "@trackdraw/viewer/static/trackdraw-viewer.css";

// container is an HTMLElement with an explicit width and height.
// snapshot is a validated, compatible viewer snapshot.
const viewer = createTrackDrawViewer(container, {
  design: snapshot.design,
  theme: "light",
});

// Supply the complete options when updating the viewer.
viewer.update({ design: nextSnapshot.design, theme: "light" });

// Release resources when removing the preview.
viewer.destroy();
```

## Plain HTML

Copy `dist/static/trackdraw-viewer.global.js` and `dist/static/trackdraw-viewer.css` from the installed package to your site's public files. The JavaScript bundle includes React and its other JavaScript dependencies.

```html
<link rel="stylesheet" href="/vendor/trackdraw-viewer.css" />
<div id="track" style="height: 420px; width: 100%"></div>
<script src="/vendor/trackdraw-viewer.global.js"></script>
<script>
  // Provide a validated, compatible viewer snapshot from your application.
  const viewer = TrackDrawViewer.createTrackDrawViewer(
    document.getElementById("track"),
    { design: snapshot.design, theme: "light" }
  );
  window.addEventListener("pagehide", () => viewer.destroy());
</script>
```

See the [complete HTML example](https://github.com/dutchdronesquad/track-viewer/blob/main/examples/static.html) for archive upload, validation, error handling, and cleanup.

## Track data

A viewer snapshot contains the track geometry, display metadata, required renderer capabilities, and an asset manifest. It does not require editor storage, inventory, ownership, or account data.

For imported JSON, use `validateViewerDesignSnapshot` from `@trackdraw/viewer/snapshot/schema`, then check `isViewerCompatible` from `@trackdraw/viewer/snapshot/version` before rendering. Validation and renderer compatibility are separate checks.

For TrackDraw REST API responses, pass `response.data` through `viewerSnapshotFromApi` from `@trackdraw/viewer/snapshot/api`. Raw API shapes use a different format and should not be passed directly to the viewer.

The [integration guide](https://github.com/dutchdronesquad/track-viewer/blob/main/docs/integration.md) includes a validation example, mount options, external 2D/3D controls, and archive creation.

## Offline viewing and assets

A `.tdviewer.zip` archive carries `snapshot.json` and the catalog textures used by that track. Load it with `readViewerArchive`, then use `createViewerArchiveAssets` to provide an `assetResolver` to the viewer. Dispose of the asset URLs after destroying the viewer. The [integration guide](https://github.com/dutchdronesquad/track-viewer/blob/main/docs/integration.md#offline-track-archives) includes a complete example.

Install the viewer JavaScript and CSS locally for offline use; archives contain data and images, not executable code. User-uploaded imagery and maps are outside the current archive format.

Online catalog textures load from `https://assets.trackdraw.app` by default. Set `assetsBaseUrl` or `assetResolver` to use your own local assets; `assetResolver` takes precedence. Third-party catalog textures are not bundled in the npm package. The TrackDraw watermark is embedded and requires no network request.

## Browser support

Use a modern browser with ES modules, ResizeObserver, and CSS nesting support. The 3D view requires WebGL2; the 2D view remains available when WebGL2 is unavailable or 3D initialization fails.

Each viewer owns its theme and viewport. Styles are scoped to the viewer, and the package does not install account calls, analytics, or persistent browser storage. A 2D-only viewer does not mount a WebGL renderer or load 3D textures.

## Development and support

See [Contributing](https://github.com/dutchdronesquad/track-viewer/blob/main/CONTRIBUTING.md) for local setup, validation commands, and dependency maintenance, and [Publishing](https://github.com/dutchdronesquad/track-viewer/blob/main/docs/publishing.md) for the release workflow.

Report bugs or request features in [GitHub Issues](https://github.com/dutchdronesquad/track-viewer/issues). For rendering problems, include the viewer version, browser, and a minimal track that reproduces the issue.

## License

[Apache-2.0](LICENSE). See [NOTICE.md](NOTICE.md) for attribution and third-party asset information.
