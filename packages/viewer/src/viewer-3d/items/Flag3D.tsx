// Vendored from TrackDraw; keep the flag model and clock in sync.
"use client";

import type { AssetResolver } from "@trackdraw/schema/assets/asset-url";
import { usePreviewTextures } from "./use-preview-textures";
import { useThree } from "@react-three/fiber";
import { Suspense, useEffect, useMemo, type Ref } from "react";
import * as THREE from "three";
import { createBeachflag } from "../../lib/track/beachflag";
import { getFlagVisualSpec } from "../../lib/track/elements/visual";
import type { FlagShape } from "../../types";
import { useFlagMotion } from "../flag-motion";
import { PanelTextureBoundary } from "./PanelTextureBoundary";

function FlagArtwork({
  model,
  frontPath,
  backPath,
}: {
  model: ReturnType<typeof createBeachflag>;
  frontPath: string;
  backPath: string;
}) {
  const [front, back] = usePreviewTextures([frontPath, backPath]);
  const invalidate = useThree((state) => state.invalidate);
  useEffect(() => {
    for (const texture of [front, back]) {
      if (texture.colorSpace === THREE.SRGBColorSpace) continue;
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.anisotropy = 4;
      texture.needsUpdate = true;
    }
    model.setTextures({ front, back });
    invalidate();
    return () => model.setTextures(null);
  }, [model, front, back, invalidate]);
  return null;
}

export function Flag3D({
  selected = false,
  shape,
  outerRef,
  assetResolver,
}: {
  selected?: boolean;
  shape: FlagShape;
  assetResolver: AssetResolver;
  outerRef?: Ref<THREE.Group>;
}) {
  const visual = getFlagVisualSpec(shape);
  const { id, poleHeight = 3.5, color = "#a855f7" } = shape;
  const poleColor = visual?.poleColor;
  const frontPath = visual && assetResolver(visual.textures.front);
  const backPath = visual && assetResolver(visual.textures.back);
  const model = useMemo(
    () => createBeachflag({ height: poleHeight, poleColor, color, id }),
    [poleHeight, poleColor, color, id]
  );
  const invalidate = useThree((state) => state.invalidate);
  useFlagMotion(model.setTime);
  useEffect(() => () => model.dispose(), [model]);
  useEffect(() => {
    model.setSelected(selected);
    invalidate();
  }, [model, selected, invalidate]);

  return (
    <group
      ref={outerRef}
      position={[shape.x, 0, shape.y]}
      rotation={[0, (-shape.rotation * Math.PI) / 180, 0]}
    >
      <primitive object={model.group} />
      {frontPath && backPath && (
        <PanelTextureBoundary key={frontPath + backPath}>
          <Suspense fallback={null}>
            <FlagArtwork
              model={model}
              frontPath={frontPath}
              backPath={backPath}
            />
          </Suspense>
        </PanelTextureBoundary>
      )}
    </group>
  );
}
