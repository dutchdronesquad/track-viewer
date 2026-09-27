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

`npm ci` also builds the package through the `prepare` script. After making changes, run the checks above before opening a pull request. Package checks inspect emitted chunks and install a packed tarball in a temporary consumer without React; they prefer the npm cache and fetch missing dependencies from the registry.

## Build outputs

- `dist/` contains the self-contained ESM mount API and lightweight snapshot/asset entry points. TypeScript declarations are emitted under `dist/`.
- `dist/static/trackdraw-viewer.global.js` bundles the viewer and its JavaScript dependencies for plain HTML hosts.
- `dist/static/trackdraw-viewer.css` contains scoped styles for both ESM and static consumers.

Renderer libraries, including React and React DOM, are build-time dependencies bundled into the ESM and static outputs. The published package has no peer dependencies. Keep the public mount types free of React imports.

Declarations are emitted with `tsc -p tsconfig.build.json`, separately from tsup. See `tsup.config.ts` for the build configuration. Serve the repository with a local HTTP server after building to try [the static archive example](examples/static.html).

## Rendering sources

**Vendored, not shared, source.** Files under `src/lib/` and `src/components/` originated as copies of pure/leaf logic from the trackdraw app (`src/lib/track/*`, `src/components/canvas/*`, `src/hooks/*`) — not re-exports or a shared module. They will not automatically pick up future changes to trackdraw's originals; keep them in sync manually if the app's copy changes in a way that matters for rendering fidelity. A few app-only exports were intentionally dropped during vendoring (e.g. `design.ts`'s serialize/normalize/create functions, which pulled in map-reference and inventory-planning code this read-only viewer never needs) — see the file-level comments on the trimmed copies.

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
- [trackdraw#870](https://github.com/dutchdronesquad/trackdraw/issues/870) vendored the package's remaining app-internal dependencies (2D/3D catalog rendering, geometry, and shape utilities) into `src/lib/` and `src/components/`, so `src/**` had zero remaining imports into the app.
- [trackdraw#871](https://github.com/dutchdronesquad/trackdraw/issues/871) split this directory out into its own repository (`dutchdronesquad/track-viewer`), preserving its git history, with its own CI and a single root `LICENSE` instead of per-file headers.
