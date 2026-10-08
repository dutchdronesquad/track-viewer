<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/dutchdronesquad/trackdraw/main/public/assets/brand/trackdraw-logo-color-darkbg.svg">
    <source media="(prefers-color-scheme: light)" srcset="https://raw.githubusercontent.com/dutchdronesquad/trackdraw/main/public/assets/brand/trackdraw-logo-color-lightbg.svg">
    <img alt="TrackDraw" src="https://raw.githubusercontent.com/dutchdronesquad/trackdraw/main/public/assets/brand/trackdraw-logo-color-lightbg.svg" width="320">
  </picture>
</p>

<h1 align="center">TrackDraw Viewer</h1>

<p align="center">
  <strong>Embed interactive 2D and 3D FPV race tracks in your website or application.</strong>
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/@trackdraw/viewer"><img alt="npm version" src="https://img.shields.io/npm/v/@trackdraw/viewer.svg"></a>
  <a href="https://www.npmjs.com/package/@trackdraw/viewer"><img alt="npm downloads" src="https://img.shields.io/npm/dm/@trackdraw/viewer.svg"></a>
  <a href="LICENSE"><img alt="License" src="https://img.shields.io/github/license/dutchdronesquad/track-viewer.svg"></a>
  <img alt="Project stage" src="https://img.shields.io/badge/project%20stage-stable-green.svg">
  <img alt="Project maintenance" src="https://img.shields.io/maintenance/yes/2026.svg">
</p>

<p align="center">
  <a href="https://github.com/dutchdronesquad/track-viewer/actions/workflows/linting.yml"><img alt="Linting" src="https://github.com/dutchdronesquad/track-viewer/actions/workflows/linting.yml/badge.svg"></a>
  <a href="https://github.com/dutchdronesquad/track-viewer/actions/workflows/tests.yaml"><img alt="Tests" src="https://github.com/dutchdronesquad/track-viewer/actions/workflows/tests.yaml/badge.svg"></a>
  <a href="https://github.com/dutchdronesquad/track-viewer/actions/workflows/publish.yml"><img alt="Publish to npm" src="https://github.com/dutchdronesquad/track-viewer/actions/workflows/publish.yml/badge.svg"></a>
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/@trackdraw/viewer"><strong>npm package</strong></a>
  &middot;
  <a href="#quick-start"><strong>Quick start</strong></a>
  &middot;
  <a href="https://github.com/dutchdronesquad/track-viewer/blob/main/docs/integration.md"><strong>Integration guide</strong></a>
</p>

<p align="center">
  <strong>@trackdraw/viewer</strong> renders portable <a href="https://trackdraw.app">TrackDraw</a> track designs in a read-only viewer, with a plain JavaScript API and support for offline track archives.
</p>

<p align="center">
  <img alt="The same FPV race circuit rendered by TrackDraw Viewer in a 2D track overview and an interactive 3D view" src="https://raw.githubusercontent.com/dutchdronesquad/track-viewer/72aa6697425f41b9ccad764de8e474fcfa8ad04b/docs/images/viewer-showcase.jpg" width="800">
</p>

<p align="center">
  <em>Example integration showing two viewer instances with the same track design. Your application controls the surrounding layout.</em>
</p>

## Display tracks anywhere

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

### Shared schema

Use `@trackdraw/schema` when you only need portable snapshot types, validation, identity, archives or asset helpers. It works without installing a renderer. This repository contains both packages in `packages/schema` and `packages/viewer`; they share a release version, with schema published first.

Existing viewer data subpaths remain available through viewer 1.x. See [Shared schema migration](docs/schema-migration.md) for the migration guide.

## Offline viewing and assets

A `.tdviewer.zip` archive carries `snapshot.json` and the catalog textures used by that track. Load it with `readViewerArchive`, then use `createViewerArchiveAssets` to provide an `assetResolver` to the viewer. Dispose of the asset URLs after destroying the viewer. The [integration guide](https://github.com/dutchdronesquad/track-viewer/blob/main/docs/integration.md#offline-track-archives) includes a complete example.

Install the viewer JavaScript and CSS locally for offline use; archives contain data and images, not executable code. User-uploaded imagery and maps are outside the current archive format.

Online catalog textures load from `https://assets.trackdraw.app` by default. Set `assetsBaseUrl` or `assetResolver` to use your own local assets; `assetResolver` takes precedence. Third-party catalog textures are not bundled in the npm package. The TrackDraw watermark is embedded and requires no network request.

## Browser support

Use a modern browser with ES modules, ResizeObserver, and CSS nesting support. The 3D view requires WebGL2; the 2D view remains available when WebGL2 is unavailable or 3D initialization fails.

Each viewer owns its theme and viewport. Styles are scoped to the viewer, and the package does not install account calls, analytics, or persistent browser storage. A 2D-only viewer does not mount a WebGL renderer or load 3D textures.

## Related repositories

- [TrackDraw](https://github.com/dutchdronesquad/trackdraw) — the browser-based FPV track designer for creating, sharing and exporting the race layouts displayed by this viewer.
- [Track assets](https://github.com/dutchdronesquad/track-assets) — obstacle artwork collections, editable templates and the shared catalog textures used by TrackDraw and the viewer, with a [browser artwork designer](https://designer.trackdraw.app) for gate and flag sheets.

## Development and support

See [Contributing](https://github.com/dutchdronesquad/track-viewer/blob/main/CONTRIBUTING.md) for local setup, validation commands, and dependency maintenance, and [Publishing](https://github.com/dutchdronesquad/track-viewer/blob/main/docs/publishing.md) for the release workflow.

Report bugs or request features in [GitHub Issues](https://github.com/dutchdronesquad/track-viewer/issues). For rendering problems, include the viewer version, browser, and a minimal track that reproduces the issue.

### Demo and development examples

Try the [live viewer demo](https://track-viewer-demo.sweet-mountain-8a35.workers.dev/) to explore what the package can do on a website. Events and layouts are illustrative samples.

Explore the viewer locally with `npm run dev:lab`: a website showcase featuring the viewer as a hero, an event page with switchable race tracks and interactive obstacle previews. Open `/?mode=develop` for six live integration recipes, copyable HTML/JavaScript and downloadable sample tracks. Separate scenario tools at `/?mode=lab` provide deterministic scenes, live settings, viewer comparisons and local snapshot/archive imports. See [Visual lab development](CONTRIBUTING.md#visual-lab) for setup and visual checks. The lab is separate from the published packages.

## License

[Apache-2.0](LICENSE). See [NOTICE.md](NOTICE.md) for attribution and third-party asset information.
