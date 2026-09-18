# @trackdraw/viewer

Framework-neutral 2D/3D track viewer for TrackDraw course designs. `TrackViewer` takes a plain `design` prop and has no dependency on any editor state, `next-intl`, or `next/navigation` — this package builds, tests, and lints entirely standalone.

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

**Not yet published to npm.** `npm run build` produces `dist/`, but nothing publishes it to a registry yet — that's deferred until a real consumer needs an installable version. Until then, trackdraw (and any other consumer) pins a git dependency on a specific commit of this repo.

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
- ESM/React consumers use `createTrackDrawViewer` (or the `<TrackViewer/>` component) from `@trackdraw/viewer` directly and are expected to already run Tailwind; they can optionally load the same `trackdraw-viewer.css`.

Type declarations (`dist/**/*.d.ts`) are emitted by a separate `tsc -p tsconfig.build.json` pass, not by `tsup`'s own `dts` option — `tsup`'s bundled copy of `rollup-plugin-dts` isn't compatible with this repo's TypeScript 7 (see the comment in `tsup.config.ts`). A plain `tsc --declaration` pass works because this package's `rootDir` no longer reaches outside its own `src/`, now that it's a standalone repository.

**Vendored, not shared, source.** Files under `src/lib/` and `src/components/` originated as copies of pure/leaf logic from the trackdraw app (`src/lib/track/*`, `src/components/canvas/*`, `src/hooks/*`) — not re-exports or a shared module. They will not automatically pick up future changes to trackdraw's originals; keep them in sync manually if the app's copy changes in a way that matters for rendering fidelity. A few app-only exports were intentionally dropped during vendoring (e.g. `design.ts`'s serialize/normalize/create functions, which pulled in map-reference and inventory-planning code this read-only viewer never needs) — see the file-level comments on the trimmed copies.

**Asset textures are not bundled.** This repository contains no texture image bytes — see [NOTICE.md](NOTICE.md).
