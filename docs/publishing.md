# Publishing @trackdraw/viewer

Publish a stable GitHub Release to release the package to npm. The repository uses trusted publishing through GitHub Actions; normal releases do not require an npm token.

## Release a version

1. Merge the intended changes and wait for **Linting** and **Tests** to pass on the commit you intend to release. The build job includes the packed-package installation checks.
2. Open the generated draft under [GitHub Releases](https://github.com/dutchdronesquad/track-viewer/releases). Check its target commit, version tag, and notes. For the mount-only API release, use **v1.0.0** and include the migration notes below. Leave **pre-release** unchecked.
3. Publish the release. This triggers [Publish to npm](https://github.com/dutchdronesquad/track-viewer/actions/workflows/publish.yml).
4. After the workflow succeeds, verify the exact version in the registry and install it in a clean consumer:

```sh
npm view @trackdraw/viewer@1.0.0 version dist.integrity

mkdir viewer-install-check
cd viewer-install-check
npm init -y
npm install @trackdraw/viewer@1.0.0
```

For later releases, substitute the intended version. Confirm that the host can render a track, switch between 2D and 3D where WebGL2 is available, and remove the viewer cleanly. A GitHub Release alone does not prove npm publication or host integration succeeded.

Keep `package.json` and `package-lock.json` at `0.0.0` in Git. The `vX.Y.Z` tag supplies the published version; no version-bump PR is needed. The publish workflow sets that version only in its temporary checkout, runs `npm ci` to install and build, then publishes with provenance. `npm publish --ignore-scripts` avoids building twice.

Only a stable release's `published` event publishes to npm. Drafts, prereleases, and tag pushes alone do not. The workflow does not repeat or enforce the quality checks, so choose a reviewed commit with green CI. Runs are serialized without cancelling an active publish.

## v1.0.0 migration notes

Include these points in the release notes so consumers can upgrade deliberately:

- The npm viewer bundles its rendering runtime and no longer requires React or React DOM peer dependencies.
- The public `TrackViewer` React component has been removed. Use `createTrackDrawViewer(container, options)` and call `destroy()` when removing the preview.
- Replace `TrackViewerProps` with `TrackDrawViewerOptions`, or derive it with `Parameters<typeof createTrackDrawViewer>[1]`.
- The existing `/mount`, snapshot/asset subpaths, and stylesheet import remain available. Snapshot schema `trackdraw.viewer-snapshot.v1` and design version `2` are unchanged.

Consumers pinned to `^0.2.0` or `^0.3.0` will not receive 1.0.0 automatically. Update their dependency ranges and lockfiles after publication, and run their own checks. See the [integration guide](integration.md) for the mount contract.

## Trusted publishing configuration

The workflow uses Node.js 24, npm 11, `id-token: write`, and the GitHub Environment `release`. The npm trusted publisher must match:

| Field                | Value             |
| -------------------- | ----------------- |
| Organization or user | `dutchdronesquad` |
| Repository           | `track-viewer`    |
| Workflow filename    | `publish.yml`     |
| Environment          | `release`         |

Keep the matching [GitHub environment](https://github.com/dutchdronesquad/track-viewer/settings/environments) and allow direct publishing in the npm publisher configuration. Any environment protection rules apply before publication. If authentication fails, check these values and the workflow log against [npm's trusted publishing documentation](https://docs.npmjs.com/trusted-publishers/).

The npm scope is `@trackdraw`; the GitHub organization is `dutchdronesquad`. Credentials belong in account settings, never in this repository or a chat.

## Release drafts and labels

[Release Drafter](../.github/workflows/release-drafter.yml) updates the draft after pushes to `main` and supports manual runs. It inherits the [organization's GitHub defaults](https://github.com/dutchdronesquad/.github#readme). Apply appropriate PR labels, particularly `breaking-change` for incompatible public API changes. Review generated notes and the suggested version before publishing.

[Sync labels](../.github/workflows/sync-labels.yml) synchronizes the shared labels weekly and can be run manually. It preserves additional repository labels.

## Renderer compatibility and retries

`RENDERER_VERSION` reads the package version, so the published 1.0.0 package reports `1.0.0`. Unreleased `0.0.0` checkouts use the development baseline `0.1.0`. This is separate from the snapshot schema and design version. Keep `CURRENT_REQUIRED_VIEWER.minRendererVersion` at the oldest renderer that supports the snapshot contract; do not raise it simply because the npm package reaches 1.0.0. Compatibility also checks required capabilities.

If a run fails before publishing, fix the setup and rerun where appropriate. If the package version already exists, inspect the registry before retrying: published npm versions cannot be overwritten. Code changes require a new version and release, not moving an existing published tag.
