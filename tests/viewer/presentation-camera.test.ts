import { describe, expect, it } from "vitest";
import * as THREE from "three";
import {
  fitPresentationCamera,
  getPresentationBounds,
  PRESENTATION_DIRECTION,
} from "../../packages/viewer/src/viewer-3d/presentation-camera";

describe("canonical presentation overview", () => {
  for (const [width, height, depth] of [
    [2, 3, 2],
    [300, 18, 200],
    [200, 12, 4],
    [4, 12, 200],
  ]) {
    for (const aspect of [0.5, 1, 2.5]) {
      it(`fits ${width}×${height}×${depth} at aspect ${aspect} and resets deterministically`, () => {
        const bounds = new THREE.Box3(
          new THREE.Vector3(-12, -0.1, -8),
          new THREE.Vector3(width, height, depth)
        );
        const camera = new THREE.PerspectiveCamera(46, aspect, 0.1, 500);
        const target = fitPresentationCamera(camera, bounds);
        const initial = camera.position.clone();
        expect(
          camera.position
            .clone()
            .sub(target)
            .normalize()
            .distanceTo(PRESENTATION_DIRECTION)
        ).toBeLessThan(1e-10);
        for (const x of [bounds.min.x, bounds.max.x])
          for (const y of [bounds.min.y, bounds.max.y])
            for (const z of [bounds.min.z, bounds.max.z]) {
              const projected = new THREE.Vector3(x, y, z).project(camera);
              expect(Math.abs(projected.x)).toBeLessThanOrEqual(
                1 / 1.15 + 1e-8
              );
              expect(Math.abs(projected.y)).toBeLessThanOrEqual(
                1 / 1.15 + 1e-8
              );
              expect(Math.abs(projected.z)).toBeLessThan(1);
            }
        camera.position.set(500, 60, -100);
        camera.lookAt(0, 0, 0);
        fitPresentationCamera(camera, bounds);
        expect(camera.position.distanceTo(initial)).toBeLessThan(1e-10);
      });
    }
  }
});

it("fits physical floor and rotated obstacles while excluding shader-only grid bounds", () => {
  const scene = new THREE.Group();
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(60, 40));
  floor.rotation.x = -Math.PI / 2;
  scene.add(floor);
  const grid = new THREE.Mesh(new THREE.PlaneGeometry(60, 40));
  grid.userData.presentationIgnoreBounds = true;
  scene.add(grid);
  const obstacle = new THREE.Mesh(new THREE.BoxGeometry(3, 4, 1));
  obstacle.position.set(30, 2, 20);
  obstacle.rotation.y = Math.PI / 4;
  scene.add(obstacle);
  const bounds = getPresentationBounds(scene);
  expect(bounds.max.y).toBe(4);
  expect(bounds.min.y).toBeCloseTo(0);
  expect(bounds.max.x).toBeGreaterThan(30);
  expect(bounds.max.z).toBeGreaterThan(20);
});
