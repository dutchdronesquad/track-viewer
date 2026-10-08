# Viewer demo deployment

The demo is a static showcase of the `@trackdraw/viewer` package. It includes a transparent hero, a fictional event with switchable qualifying/final layouts, a track briefing, obstacle previews, developer recipes and separate scenario tools. Labels identify the site as a demo and its tracks/events as samples. Examples follow this repository's source, including options that may not yet be released on npm.

Public demo: [TrackDraw Viewer demo](https://viewer.trackdraw.app/).

## Build and preview

Run `npm ci`, then `npm run build:demo`. Production output lives in `demo/dist`, is minified and excludes source maps, development reload code and npm package contents. It is rebuilt from scratch to avoid deploying stale chunks. The demo remains outside the published packages.

Run `npm run preview:demo` to build and serve through Wrangler's local Static Assets runtime. Check `/`, `/develop?recipe=controls`, `/develop?recipe=fallback` and `/scenarios`. The static build emits explicit HTML entry points for `/`, `/develop` and `/scenarios`; query parameters select recipes and scenario settings. No server-side application or SPA path fallback is needed. Unknown asset paths return 404. Stable entry files revalidate through the deployed `_headers` file.

## Publish

The dedicated Worker is `track-viewer-demo`, configured in `wrangler.demo.jsonc`. It has only static assets: no database, storage binding, API credentials in the browser or server-side code. Catalog artwork is requested from the public asset service. Imported tracks remain local to the user's browser.

Authenticate Wrangler with the intended Cloudflare account and run `npm run deploy:demo`. With multiple accounts, explicitly set `CLOUDFLARE_ACCOUNT_ID`. The demo is served at `https://viewer.trackdraw.app/`, configured as a Worker Custom Domain in `wrangler.demo.jsonc`. Verify that hostname after deployment; the automatically assigned `workers.dev` URL is not the primary demo address.

After publishing, verify the demo identity, qualifying/final switching, 2D/3D controls, developer snippets, sample downloads, catalog textures, fallback, narrow layout and response headers. Check real touch-device interaction separately before declaring touch acceptance.

## GitHub deployment

`.github/workflows/demo.yml` deploys through the GitHub environment `cf-demo` and can run manually with `workflow_dispatch`. Configure repository secrets `CLOUDFLARE_ACCOUNT_ID` and `CLOUDFLARE_API_TOKEN` for the intended account, using the [Edit Cloudflare Workers API token template](https://developers.cloudflare.com/workers/ci-cd/external-cicd/github-actions/) scoped to the intended account and the `trackdraw.app` zone. Never copy a local OAuth credential into CI. Environment protection rules can gate publishing independently of package releases.

Pushes to `main` publish automatically through `cf-demo`. Configure its deployment credentials before merging the demo workflow. Deployments run typecheck, lint and tests before building; concurrent publishes are serialized. Pull requests validate the minified site and Wrangler dry-run but do not publish.

The GitHub environment is a deployment/credential boundary. The Cloudflare target remains the dedicated `track-viewer-demo` Worker in `wrangler.demo.jsonc`; no additional Wrangler environment is required for this single demo target. `viewer.trackdraw.app` is the connected custom hostname and the public demo address.

The demo is independently deployable from a reviewed branch. Merging the demo PR and publishing an npm release are separate actions. If this PR is stacked on the transparent-presentation PR, merge that dependency first and retarget the demo PR to `main`.

## Hosting reference

- [Workers Static Assets](https://developers.cloudflare.com/workers/static-assets/)
- [Wrangler asset configuration](https://developers.cloudflare.com/workers/wrangler/configuration/#assets)
- [GitHub Actions deployment](https://developers.cloudflare.com/workers/ci-cd/external-cicd/github-actions/)
