# Contributing

Use Node.js 24 and npm, matching the CI environment.

```sh
npm ci
npm run typecheck
npm run lint
npm run format:check
npm run test
npm run build
npm run test:package
```

`npm ci` also builds both packages, schema before viewer through the `prepare` script. After making changes, run the checks above before opening a pull request. Package checks inspect emitted chunks and install a packed tarball in a temporary consumer without React; they prefer the npm cache and fetch missing dependencies from the registry.

## Build outputs

- `packages/schema/dist/` contains renderer-independent contract and asset entry points.
- `packages/viewer/dist/` contains the self-contained ESM mount API and lightweight snapshot/asset entry points. TypeScript declarations are emitted under `dist/`.
- `packages/viewer/dist/static/trackdraw-viewer.global.js` bundles the viewer and its JavaScript dependencies for plain HTML hosts.
- `packages/viewer/dist/static/trackdraw-viewer.css` contains scoped styles for both ESM and static consumers.

Renderer libraries, including React and React DOM, are build-time dependencies bundled into the ESM and static outputs. The viewer depends on schema; neither published package has peer dependencies. Keep the public mount types free of React imports.

Declarations are emitted with `tsc -p tsconfig.build.json`, separately from tsup. See each package's `tsup.config.ts` for the build configuration. Serve the repository with a local HTTP server after building to try [the static archive example](examples/static.html).

## Rendering sources

**Vendored, not shared, source.** Files under `packages/viewer/src/lib/` and `packages/viewer/src/components/` originated as copies of pure/leaf logic from the trackdraw app (`src/lib/track/*`, `src/components/canvas/*`, `src/hooks/*`) — not re-exports or a shared module. They will not automatically pick up future changes to trackdraw's originals; keep them in sync manually if the app's copy changes in a way that matters for rendering fidelity. A few app-only exports were intentionally dropped during vendoring (e.g. `design.ts`'s serialize/normalize/create functions, which pulled in map-reference and inventory-planning code this read-only viewer never needs) — see the file-level comments on the trimmed copies.

## Presentation validation

After building, serve the repository over HTTP and open [the transparent presentation example](examples/presentation.html). Check the small, large, elongated and rotated obstacles on light/dark page backgrounds and a narrow container. Orbit, zoom and reset; the alpha inspector reports clear, opaque and antialiased pixel counts plus an image signature that should return after reset. Exercise the explicit WebGL fallback. Before release, also validate one-finger orbit and two-finger pinch/zoom on a touch device; resizing a desktop viewport alone does not prove touch behavior.

## Dependency updates

[Renovate](.github/renovate.json) extends the shared [Dutch Drone Squad dependency policy](https://github.com/dutchdronesquad/.github/blob/main/renovate-base.json). Scheduling, labels, the dependency dashboard, GitHub Actions digest pinning and minor/patch automerge, and automated lock-file maintenance are maintained centrally.

Local rules enable vulnerability alerts and group npm minor and patch updates with automerge. Radix UI and Vitest each have a package-family rule for related updates. Major updates do not enable automerge.

The Renovate GitHub App needs access to this repository, and the configuration must reach the default branch before it can take effect. Repository permissions and required status checks still govern merging. See the [Renovate configuration reference](https://docs.renovatebot.com/configuration-options/) for option behavior.

## Releases

Stable GitHub Releases publish the package to npm. Follow the [publishing guide](docs/publishing.md); keep repository manifests at `0.0.0` and let the release workflow derive the published version from the tag.

## History

This package started life inside the trackdraw monorepo at `packages/viewer/` and moved here once it was fully self-contained:

- Phase 1 ([trackdraw#859](https://github.com/dutchdronesquad/trackdraw/issues/859)) proved extraction, finalized the display-metadata allowlist (`src/snapshot/`), and fixed the eager whole-catalog texture preload.
- Phase 2 ([trackdraw#860](https://github.com/dutchdronesquad/trackdraw/issues/860)) added `package.json`, the ESM + static builds, the asset manifest (`src/assets/manifest.ts`), schema-validated snapshots (`src/snapshot/schema.ts`), and the shared snapshot builder's first real callers in the app.
- [trackdraw#870](https://github.com/dutchdronesquad/trackdraw/issues/870) vendored the package's remaining app-internal dependencies (2D/3D catalog rendering, geometry, and shape utilities) into `packages/viewer/src/lib/` and `packages/viewer/src/components/`, so `src/**` had zero remaining imports into the app.
- [trackdraw#871](https://github.com/dutchdronesquad/trackdraw/issues/871) split this directory out into its own repository (`dutchdronesquad/track-viewer`), preserving its git history, with its own CI and a single root `LICENSE` instead of per-file headers.

## Shared contract ownership

See [Shared schema migration](docs/schema-migration.md) for ownership, compatibility and consumer release order. Schema must not import viewer/catalog geometry or rendering libraries. Run `npm run assets:catalog-manifest` when catalog texture references change; package tests inspect every emitted schema import and install schema alone without renderer dependencies or DOM initialization. Keep root and package manifests at `0.0.0` in Git.

## Visual lab

Run `npm run dev:lab` and open `http://localhost:5180`. Set `LAB_PORT` to use another port. The lab bundles the current source through the public viewer mount API; source and lab CSS changes rebuild and reload the preview while preserving URL settings. If viewer stylesheet utilities change, restart `dev:lab` to regenerate the scoped package CSS.

The default page is a website showcase: a transparent hero track, an event page with switchable qualifying/final tracks and a 2D/3D embed, a framed track briefing with measurement-unit and numbering controls, and an obstacle collection with interactive previews and gate-back colour choices. Offscreen examples unmount their viewers to release WebGL resources. Open `/?mode=lab` directly for the separate scenario workspace; the showcase links each integration to its code example. Open `/?mode=develop` for six live integration recipes, installation and container markup, copyable ESM code, downloadable validated sample snapshots, and offline archive loading. Recipe links retain their selection in the URL. The development page and scenario tools are separate from the showcase.

Choose a scene from Tracks, Items or Edge cases. Finetune controls framed/transparent presentation, viewer theme independently of the host background, responsive container presets, units, obstacle numbering, viewer controls, camera presets, gate-back colours and custom overlay copy. Compare mounts a second independent viewer with the opposite theme and view. The URL records these settings; Copy clean preview URL hides the lab chrome for screenshots. Hover or focus the bottom-right Back to lab button to return.

Import track accepts validated viewer snapshot JSON and `.tdviewer.zip` archives. Imports are local and never uploaded. Snapshot validation and renderer compatibility are checked separately. Archives use their embedded textures; choosing a built-in scene or replacing an import destroys the old viewers before releasing archive URLs. Local imports are not encoded in copied URLs or retained across source reloads. JSON catalog textures normally come from `assets.trackdraw.app`; the built-in generic track requires no catalog requests.

Use Force WebGL unavailable to exercise the 2D fallback, and choose Obstacle catalog with Catalog textures set to missing to inspect failed texture loading. Runtime status reports each viewer's effective mode; container presets are bounded by available space, rather than simulating browser/device dimensions. Verify actual mobile breakpoints and touch interaction separately.

Before changing the lab, run the normal checks and `npm run build:lab`. This creates an unhosted build under `lab/dist`; the lab is excluded from both published npm packages. The public demo uses Cloudflare Workers Static Assets; see [Demo deployment](docs/demo-deployment.md). The lab adds no account, API credential or analytics integration.

Browser acceptance checks:

- Switch scenes and views; orbit/zoom and reset the transparent overview on light, dark, gradient and checker backgrounds.
- Resize the host, test phone/tablet containers, and compare independent viewers. Check the real page at a narrow browser viewport too.
- Force WebGL fallback and inspect the effective mode and custom explanation. Restore defaults and confirm 3D returns.
- Import valid JSON and an offline archive, reject malformed/incompatible files, then replace the import or select a fixture. Verify textures and viewer cleanup.
- Reload a configured URL, inspect the clean preview, and use keyboard-only navigation in Finetune (Tab, Shift+Tab and Escape).
