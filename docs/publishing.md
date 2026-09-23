# Publishing @trackdraw/viewer

Part of [trackdraw#876](https://github.com/dutchdronesquad/trackdraw/issues/876). The first registry publication is still pending; adding this workflow alone does not complete the issue.

## Release model

Keep `package.json` and `package-lock.json` at `0.0.0` in Git. Publish a GitHub Release tagged `vX.Y.Z`; that tag is the release version. No version-bump PR, release-please or Changesets setup is needed. Only a stable release's `published` event publishes to npm; draft releases, prereleases and tag pushes alone do not. `0.0.0` is reserved for development.

The workflow validates the tag, uses `npm version --no-git-tag-version` in its temporary checkout, installs/builds with `npm ci`, then runs `npm publish`. The renderer reads the package version, so there is no separate source rewrite. The package's `publishConfig` selects the public npm registry and public access; npm uses `latest`. Runs are serialized without cancelling an active publish.

Lint, formatting, typechecks and tests stay in the existing CI workflow. Publish releases only from reviewed commits with green CI; the publication workflow does not repeat or enforce those checks. `npm ci` builds through the existing `prepare` lifecycle; `npm publish --ignore-scripts` avoids building a second time.

## One-time npm setup

A Dutch Drone Squad maintainer must establish ownership of the `@trackdraw` npm organization and grant the publishing account access. Do not create an organization under an arbitrary personal owner. Credentials belong in npm/GitHub settings, never in this repository or a chat.

Prefer [npm trusted publishing](https://docs.npmjs.com/trusted-publishers/). Configure the package's trusted publisher with these exact values once the package settings are available:

- Provider: GitHub Actions
- Organization: `dutchdronesquad`
- Repository: `track-viewer`
- Workflow filename: `publish.yml`
- Environment: leave empty (the workflow does not use a GitHub environment)
- Allow direct `npm publish` if the npm settings offer an allowed-actions choice.

For a new package whose trusted-publisher settings are not yet available, bootstrap the first release through the same workflow using a short-lived granular npm write token, permitted to create `@trackdraw/viewer`, with bypass-2FA permission for CI. Store it as the repository Actions secret `NPM_TOKEN`. After the first successful publication, configure trusted publishing, remove the secret and revoke the bootstrap token. Subsequent releases use OIDC without a stored token. The workflow uses a GitHub-hosted runner, Node 24 and npm 11 (trusted publishing requires npm >=11.5.1).

No account creation, token setup or live publication is performed by merging the workflow PR.

## Each release

1. Merge the intended code changes after CI passes; leave both package manifests at `0.0.0`.
2. In GitHub Releases, create a release targeting the merged commit with a stable version tag, for example `v0.1.0`. Review the notes and publish the release. The tag's commit must contain this workflow.
3. Check the **Publish to npm** run, then verify `npm view @trackdraw/viewer@<version> version dist.integrity` and install that exact version in a clean consumer. A published GitHub Release does not by itself prove npm publication succeeded.

`RENDERER_VERSION` reads `package.json`, so the shipped code reports the actual release version. For an unreleased `0.0.0` checkout it falls back to the development renderer's supported baseline (`0.1.0`). Keep `CURRENT_REQUIRED_VIEWER.minRendererVersion` at the oldest renderer that actually supports that snapshot contract; do not automatically raise the compatibility floor for every release. The release tag must be at least that floor.

If a run fails before publishing, fix setup and rerun the failed job where appropriate. If the package version already exists, inspect the registry before retrying: npm versions cannot be overwritten. Code changes require a new version and release, not moving an existing published tag. Prerelease channels are deliberately not part of this initial workflow.

## Complete the consumer migration

Only after the registry version exists, open the TrackDraw adoption PR: replace its pinned Git dependency with `@trackdraw/viewer@^<version>`, regenerate its lockfile, update the PVA's interim-distribution notes and run its required checks. Confirm a clean registry install before closing #876. DDS event embedding remains #861; host adapters remain separate work.
