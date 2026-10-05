# Live obstacle previews

Hosts can frame a compact preview without simulated mouse gestures:

```ts
createTrackDrawViewer(container, {
  design,
  initialView: "3d",
  showViewControls: false,
  camera3D: { position: [5, 3, 12], target: [5, 1, 2.5], minDistance: 4 },
  gateBackColors: {
    "view-0": "#112233",
    "view-1": "#112233",
    "view-2": "#112233",
  },
  assetResolver: (path) => panels[path],
});
```

`camera3D` supplies initial framing and the orbit target. Keep the same camera object when only artwork changes to retain the user's camera position. Omitting it preserves the existing field camera and zoom limits. Coordinates use the viewer's 3D world: X across the field, Y upwards and Z along the field.

`gateBackColors` is a transient presentation override keyed by shape ID. It changes the solid panel material on panel-frame gates, preserves their front textures and does not alter the persisted design, catalog or snapshot schema. Only six-digit hexadecimal colours are accepted. Other gate variants retain their existing materials.

For changing textures, return unique object URLs from `assetResolver`. Gate and flag renderers release their loader cache and GPU textures after the last angle stops using a blob panel. The host still owns and revokes the object URLs, after allowing in-flight loads to finish. Stable HTTP and data URLs retain the existing shared cache behaviour.
