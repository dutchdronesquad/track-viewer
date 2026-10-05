import { useTexture } from "@react-three/drei";
import { useEffect } from "react";
import type { Texture } from "three";

const leases = new Map<string, number>();

/** Blob panels belong to a live preview; release cached GPU textures after the last angle retires. */
export function usePreviewTextures(paths: string[]): Texture[] {
  const textures = useTexture(paths) as Texture[];
  const key = JSON.stringify(paths);
  useEffect(() => {
    if (!paths.every((path) => path.startsWith("blob:"))) return;
    leases.set(key, (leases.get(key) ?? 0) + 1);
    return () => {
      const remaining = (leases.get(key) ?? 1) - 1;
      if (remaining) leases.set(key, remaining);
      else {
        leases.delete(key);
        textures.forEach((texture) => texture.dispose());
        useTexture.clear(JSON.parse(key) as string[]);
      }
    };
    // Equivalent URL arrays share one loader cache entry.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, textures]);
  return textures;
}
