export type AssetResolver = (path: string) => string;

export const OBSTACLE_ASSETS_URL = "https://assets.trackdraw.app";

/** Resolve legacy catalog identifiers to hosted textures; explicit bases keep local/offline hosting. */
export function createAssetResolver(baseUrl?: string): AssetResolver {
  if (baseUrl !== undefined) {
    const trimmed = baseUrl.replace(/\/+$/, "");
    return (path) => `${trimmed}${path}`;
  }
  return (path) => {
    if (/^\/assets\/registry\/[a-z0-9-]+\/[A-Za-z0-9_-]+\.webp$/.test(path))
      return `${OBSTACLE_ASSETS_URL}${path.slice("/assets/registry".length)}`;
    const match =
      /^\/assets\/models\/textures\/multigp-obstacles\/([a-zA-Z0-9_-]+\.webp)$/.exec(
        path
      );
    return match ? `${OBSTACLE_ASSETS_URL}/multigp/${match[1]}` : path;
  };
}

export const IDENTITY_ASSET_RESOLVER: AssetResolver = (path) => path;
