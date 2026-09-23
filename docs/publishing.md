# Publishing @trackdraw/viewer

Part of [trackdraw#876](https://github.com/dutchdronesquad/trackdraw/issues/876). The first registry publication is still pending; adding this workflow alone does not complete the issue.

## Release model

Keep `package.json` and `package-lock.json` at `0.0.0` in Git. Publish a GitHub Release tagged `vX.Y.Z`; that tag is the release version. No version-bump PR, release-please or Changesets setup is needed. Only a stable release's `published` event publishes to npm; draft releases, prereleases and tag pushes alone do not. `0.0.0` is reserved for development.

The workflow validates the tag, uses `npm version --no-git-tag-version` in its temporary checkout, installs/builds with `npm ci`, then runs `npm publish`. The renderer reads the package version, so there is no separate source rewrite. The package's `publishConfig` selects the public npm registry and public access; npm uses `latest`. Runs are serialized without cancelling an active publish.

Lint, formatting, typechecks and tests stay in the existing CI workflow. Publish releases only from reviewed commits with green CI; the publication workflow does not repeat or enforce those checks. `npm ci` builds through the existing `prepare` lifecycle; `npm publish --ignore-scripts` avoids building a second time.

## Why no separate publish action?

We use the official `actions/setup-node` action and npm's own publish command. [`JS-DevTools/npm-publish`](https://github.com/JS-DevTools/npm-publish#readme) exists, but its maintainers recommend this direct approach for tag-based releases. Its extra version-detection logic is unnecessary here: our release tag already selects the version.

## First publication: maintainer checklist

These are manual npm/GitHub account steps. Merging this PR does not create an organization, configure authentication or publish a package. Keep credentials in account settings, never in this repository or a chat.

### 1. Create or confirm the npm organization

Sign in to [npm](https://www.npmjs.com/) using the maintainer's own account. From the profile menu choose **Add an Organization**, name it **trackdraw** (without `@`), and select the free **Unlimited public packages** plan. Agree within Dutch Drone Squad who owns/administers the organization and ensure the publishing account can publish under its scope. If the name is unavailable, resolve ownership before continuing; do not silently change the package name.

The npm scope is `@trackdraw`; the GitHub organization is `dutchdronesquad`. They do not need the same name. See [npm organization setup](https://docs.npmjs.com/creating-an-organization/).

### 2. Set up the first-publication token

The intended steady state is trusted publishing. If the package does not exist yet and its publisher settings are unavailable, use a temporary token for the first release:

1. In npm's profile menu, open **Access Tokens → Generate New Token**.
2. Name it `track-viewer-first-publish`; choose a short expiration, for example one day.
3. Under **Packages and scopes**, select **Read and write (publish and stage)** and restrict it to the `@trackdraw` scope. The new package cannot yet be selected individually. The token's account must already have publishing rights.
4. Enable **Bypass two-factor authentication** for this CI token. Leave organization-management permissions at **No access**; those permissions do not grant package publishing rights.
5. Copy the generated token into [track-viewer's Actions secrets](https://github.com/dutchdronesquad/track-viewer/settings/secrets/actions): **New repository secret**, name **NPM_TOKEN**.

See [npm's token instructions](https://docs.npmjs.com/creating-and-viewing-access-tokens/). Do not use `GITHUB_TOKEN` for the npm registry.

### 3. Publish the first release

Merge the workflow and wait for green CI. Open [New GitHub release](https://github.com/dutchdronesquad/track-viewer/releases/new), create tag **v0.1.0** targeting the merged commit, add release notes, leave **pre-release** unchecked and publish.

Watch **Publish to npm** in [Actions](https://github.com/dutchdronesquad/track-viewer/actions/workflows/publish.yml). Confirm the package at [npm](https://www.npmjs.com/package/@trackdraw/viewer) and run:

```sh
npm view @trackdraw/viewer@0.1.0 version dist.integrity
```

Use a clean temporary project to check installation:

```sh
mkdir viewer-install-check
cd viewer-install-check
npm init -y
npm install @trackdraw/viewer@0.1.0
```

### 4. Switch to trusted publishing

Once the package exists, open its **Settings → Trusted Publisher** on npm and select **GitHub Actions**. Enter:

| Field                     | Value                      |
| ------------------------- | -------------------------- |
| Organization or user      | `dutchdronesquad`          |
| Repository                | `track-viewer`             |
| Workflow filename         | `publish.yml`              |
| Environment               | Leave empty                |
| Allowed actions, if shown | Allow direct `npm publish` |

Save, remove the GitHub `NPM_TOKEN` secret and revoke the temporary token in npm. The next release uses OIDC; the workflow already has `id-token: write`, a GitHub-hosted runner and a compatible npm version. No new secret is needed. Configuration is not proof of a successful OIDC publish: verify the next genuine release's workflow and npm result. No empty test release is necessary.

See [npm trusted publishing](https://docs.npmjs.com/trusted-publishers/). If authentication fails, check those exact field values and the workflow log before changing anything else.

## Each release

1. Merge the intended code changes after CI passes; leave both package manifests at `0.0.0`.
2. In GitHub Releases, create a release targeting the merged commit with a stable version tag, for example `v0.1.0`. Review the notes and publish the release. The tag's commit must contain this workflow.
3. Check the **Publish to npm** run, then verify `npm view @trackdraw/viewer@<version> version dist.integrity` and install that exact version in a clean consumer. A published GitHub Release does not by itself prove npm publication succeeded.

`RENDERER_VERSION` reads `package.json`, so the shipped code reports the actual release version. For an unreleased `0.0.0` checkout it falls back to the development renderer's supported baseline (`0.1.0`). Keep `CURRENT_REQUIRED_VIEWER.minRendererVersion` at the oldest renderer that actually supports that snapshot contract; do not automatically raise the compatibility floor for every release. The release tag must be at least that floor.

If a run fails before publishing, fix setup and rerun the failed job where appropriate. If the package version already exists, inspect the registry before retrying: npm versions cannot be overwritten. Code changes require a new version and release, not moving an existing published tag. Prerelease channels are deliberately not part of this initial workflow.

## Complete the consumer migration

Only after the registry version exists, open the TrackDraw adoption PR: replace its pinned Git dependency with `@trackdraw/viewer@^<version>`, regenerate its lockfile, update the PVA's interim-distribution notes and run its required checks. Confirm a clean registry install before closing #876. DDS event embedding remains #861; host adapters remain separate work.
