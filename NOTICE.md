# @trackdraw/viewer Notice

Copyright 2026 Dutch Drone Squad

Licensed under the Apache License, Version 2.0. See [LICENSE](LICENSE) for the full, unmodified license text — do not fill in or edit the Appendix placeholders in that file; this NOTICE carries the copyright attribution instead.

## Status

This repository is the standalone home of `@trackdraw/viewer`, a framework-neutral 2D/3D viewer for TrackDraw course designs. It was extracted from [`dutchdronesquad/trackdraw`](https://github.com/dutchdronesquad/trackdraw)'s `packages/viewer/` directory (tracked there as issue [#871](https://github.com/dutchdronesquad/trackdraw/issues/871)), preserving that directory's git history. `src/` has no source-level dependency on the trackdraw application — everything it needs (2D/3D catalog rendering, geometry, shape utilities) was vendored as copies before the split (trackdraw issue [#870](https://github.com/dutchdronesquad/trackdraw/issues/870)).

Separating this package from trackdraw's `AGPL-3.0-only` application makes the Apache-2.0 license boundary a structural fact rather than a code-review convention: hosts such as FPVScores or RotorHazard can depend on `@trackdraw/viewer` as a normal npm package without AGPL's copyleft obligations reaching their own codebase.

## Third-Party Assets

This repository does not contain any texture image bytes. `src/assets/generated/texture-manifest.json` records only metadata (content type, size, sha256) for textures that a host application (trackdraw) serves separately; `src/assets/asset-url.ts` resolves texture paths against a caller-supplied base URL at runtime. Do not add actual texture/image binaries to this repository — MultiGP-branded catalog textures in particular must not be bundled or redistributed by this package (see trackdraw's asset-workflow docs for the underlying licensing reason).
