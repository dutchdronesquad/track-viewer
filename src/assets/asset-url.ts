export type AssetResolver = (path: string) => string;

export const OBSTACLE_ASSETS_URL = "https://obstacles.trackdraw.app";

/** Resolve legacy catalog identifiers to hosted textures; explicit bases keep local/offline hosting. */
export function createAssetResolver(baseUrl?: string): AssetResolver {
  if (baseUrl !== undefined) {
    const trimmed = baseUrl.replace(/\/+$/, "");
    return (path) => `${trimmed}${path}`;
  }
  return (path) => {
    const match =
      /^\/assets\/models\/textures\/multigp-obstacles\/([a-zA-Z0-9_-]+\.webp)$/.exec(
        path
      );
    return match ? `${OBSTACLE_ASSETS_URL}/multigp/${match[1]}` : path;
  };
}

export const IDENTITY_ASSET_RESOLVER: AssetResolver = (path) => path;
