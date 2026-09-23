# @trackdraw/viewer

Framework-neutral 2D/3D track viewer for TrackDraw course designs. `TrackViewer` takes a portable `ViewerDesign` as its `design` prop and has no dependency on any editor state, `next-intl`, or `next/navigation` — this package builds, tests, and lints entirely standalone.

Licensed Apache-2.0 (see [LICENSE](LICENSE)/[NOTICE.md](NOTICE.md)) — deliberately more permissive than [`dutchdronesquad/trackdraw`](https://github.com/dutchdronesquad/trackdraw)'s `AGPL-3.0-only` editor/server, so hosts such as FPVScores or RotorHazard can depend on it without AGPL's copyleft obligations reaching their own codebase.

## History

This package started life inside the trackdraw monorepo at `packages/viewer/` and moved here once it was fully self-contained:

- Phase 1 ([trackdraw#859](https://github.com/dutchdronesquad/trackdraw/issues/859)) proved extraction, finalized the display-metadata allowlist (`src/snapshot/`), and fixed the eager whole-catalog texture preload.
- Phase 2 ([trackdraw#860](https://github.com/dutchdronesquad/trackdraw/issues/860)) added `package.json`, the ESM + static builds, the asset manifest (`src/assets/manifest.ts`), schema-validated snapshots (`src/snapshot/schema.ts`), and the shared snapshot builder's first real callers in the app.
- [trackdraw#870](https://github.com/dutchdronesquad/trackdraw/issues/870) vendored the package's remaining app-internal dependencies (2D/3D catalog rendering, geometry, and shape utilities) into `src/lib/` and `src/components/`, so `src/**` had zero remaining imports into the app.
- [trackdraw#871](https://github.com/dutchdronesquad/trackdraw/issues/871) split this directory out into its own repository (`dutchdronesquad/track-viewer`), preserving its git history, with its own CI and a single root `LICENSE` instead of per-file headers.

## Development

```sh
npm install
npm run typecheck
npm run lint
npm run test
npm run build
```

**First npm publication pending.** Stable GitHub Releases publish through `.github/workflows/publish.yml` after building. Follow the [first-publication checklist](docs/publishing.md#first-publication-maintainer-checklist) to set up the npm organization, temporary first-release token and trusted publishing. The same guide covers subsequent releases. Until the first successful publication, TrackDraw continues to pin a git dependency.

## Builds

`npm run build` produces:

- `dist/*.js` — ESM build, multi-entry (`.`, `./mount`, `./snapshot/*`, `./assets/*`) so server code can import light subpaths without pulling in React/three/konva.
- `dist/static/trackdraw-viewer.global.js` + `dist/static/trackdraw-viewer.css` — a self-contained IIFE bundle (`window.TrackDrawViewer`) plus a compiled Tailwind stylesheet, for hosts with no npm/bundler of their own (e.g. a future RotorHazard plugin). Load both:
  ```html
  <link rel="stylesheet" href=".../trackdraw-viewer.css" />
  <script src=".../trackdraw-viewer.global.js"></script>
  <script>
    const handle = TrackDrawViewer.createTrackDrawViewer(container, { design });
  </script>
  ```
- ESM/React consumers use `createTrackDrawViewer` (or the `<TrackViewer/>` component) from `@trackdraw/viewer` and import `@trackdraw/viewer/static/trackdraw-viewer.css`. No host Tailwind setup is needed. All generated selectors and theme tokens are scoped to `.trackdraw-viewer`; tooltip portals stay inside that instance.

Type declarations (`dist/**/*.d.ts`) are emitted by a separate `tsc -p tsconfig.build.json` pass, not by `tsup`'s own `dts` option — `tsup`'s bundled copy of `rollup-plugin-dts` isn't compatible with this repo's TypeScript 7 (see the comment in `tsup.config.ts`). A plain `tsc --declaration` pass works because this package's `rootDir` no longer reaches outside its own `src/`, now that it's a standalone repository.

**Vendored, not shared, source.** Files under `src/lib/` and `src/components/` originated as copies of pure/leaf logic from the trackdraw app (`src/lib/track/*`, `src/components/canvas/*`, `src/hooks/*`) — not re-exports or a shared module. They will not automatically pick up future changes to trackdraw's originals; keep them in sync manually if the app's copy changes in a way that matters for rendering fidelity. A few app-only exports were intentionally dropped during vendoring (e.g. `design.ts`'s serialize/normalize/create functions, which pulled in map-reference and inventory-planning code this read-only viewer never needs) — see the file-level comments on the trimmed copies.

**Catalog texture bytes are not bundled.** MultiGP textures travel in each course archive; the TrackDraw-owned watermark is embedded in the viewer so it does not make a network request. See [NOTICE.md](NOTICE.md).

## Portable course contract

`ViewerDesignSnapshot.design` is accepted directly by both `TrackViewer` and the mount API. It contains `version: 2`, `title`, `field`, `shapes`, and `updatedAt`; editor storage, inventory, ownership, and account data are not required. Validate untrusted JSON with `validateViewerDesignSnapshot` before rendering. Validation requires each shape kind's geometry, strips unknown fields, limits counts/dimensions and rejects duplicate IDs. `isViewerCompatible` checks the renderer floor and required capabilities separately.

TrackDraw's REST API retains its existing snake_case response. Pass its `response.data` through `viewerSnapshotFromApi` (also exported at `./snapshot/api`) to obtain the same camelCase snapshot as a local export; private project provenance is stripped. Do not pass raw API shapes directly to the renderer.

`getViewerSnapshotId` computes a deterministic SHA-256 identifier from validated public content. Property insertion order and asset/capability ordering do not change the ID. Geometry, display metadata, source update time and asset hashes do. Build the snapshot, validate it, then set `snapshotId` to this ID.

## Offline course archives

A `.tdviewer.zip` contains `snapshot.json` and exactly the texture files listed in its manifest, under `assets/...`. It contains no executable code. The viewer's static script/CSS must be installed separately on the host. MultiGP images are included only for the course that uses them, not redistributed inside this npm package.

```ts
import { createTrackDrawViewer } from "@trackdraw/viewer/mount";
import {
  readViewerArchive,
  createViewerArchiveAssets,
} from "@trackdraw/viewer/snapshot/archive";
import "@trackdraw/viewer/static/trackdraw-viewer.css";

const archive = readViewerArchive(new Uint8Array(await file.arrayBuffer()));
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

The static global exposes the same archive reader/object-URL helper alongside `createTrackDrawViewer`. See [the plain HTML example](examples/static.html). For persistent hosting, store the verified archive files locally and use `assetsBaseUrl` pointing at their parent directory instead of temporary object URLs. Complete validation before replacing an existing event attachment.

`createViewerArchive(snapshot, readAsset)` lets browser exports and backend API adapters build the same archive. It never fetches implicitly: the caller supplies approved local bytes or an approved fetcher. It verifies catalog manifest completeness, renderer compatibility, stable snapshot identity, sizes and SHA-256 hashes before returning bytes. Import rejects missing, extra, duplicate and unsafe paths, unsupported courses, corrupt assets, and oversized archives (4 MB snapshot, 8 MB per asset, 64 MB archive/expanded total). Hashes check integrity, not authorship. V1 supports the installed catalog assets only; user-uploaded imagery/maps are outside this contract.

## Runtime and lifecycle

Provide an explicitly sized container, e.g. `height: 420px; width: 100%`. Each viewer owns its theme and viewport; no host-wide reset, storage, account calls or analytics are installed. Choose `theme`, `unitSystem`, `labels`, `initialView`, and `showObstacleNumbers` per instance. `assetResolver` overrides `assetsBaseUrl` when supplied.

2D-only instances do not mount a WebGL renderer or load 3D textures. Once visited, a hidden 3D scene pauses its frame loop while retaining its camera. 3D requires WebGL2; unavailable or failed initialization/context loss leaves the existing 2D view usable. `destroy()` unmounts the React root and releases instance resources. The watermark is embedded and requires no CDN CORS configuration; externally hosted catalog textures still require the asset host to permit CORS.

Use a modern browser with ES modules, ResizeObserver, and CSS nesting support; WebGL2 is optional. The static artifact bundles React and all JavaScript dependencies. ESM users provide the declared React peers and a bundler that resolves the package dependencies/chunks. Serve the static JavaScript and CSS locally for cold offline use.
