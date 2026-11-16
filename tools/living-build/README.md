# Living birthday views

The deployed website remains a static `dist/` site. Only this optional Three.js
view layer is bundled; the original scripts still own routing, editable notes,
camera permissions, five individual wick collisions, fireworks and memories.

```sh
npm ci --prefix tools/living-build
npm run --prefix tools/living-build build
```

Source is in `src/living/`. Three.js 0.180.0 and esbuild 0.25.10 are pinned in the
lockfile. The browser downloads a local IIFE and GLBs, never a runtime npm CDN.
The original photographs/SVGs remain visible until each view renders, and return
on model or WebGL failure. Context restore reuses the scene. Only the active
chapter draws; hidden tabs/modal states sleep. The existing pause switch freezes
ambient geometry; reduced motion renders a static composition, while deliberate
object interactions remain usable. Device pixel ratio is capped and frames are
capped at 30; these are budgets, not a measured physical iPad frame-rate claim.

## Blender sources

Blender 4.3.2. Rebuild the calibrated lighter source using the pre-existing script:

```sh
blender -b --threads 2 --factory-startup --python tools/blender/render_birthday_layers.py -- --output /tmp/winter-lighter-source --only-lighter
blender -b --threads 2 --factory-startup --python-exit-code 1 --python tools/blender/build_living_assets.py -- --output dist/assets/living --papers /tmp/winter-living-source --lighter-blend /tmp/winter-lighter-source/lighter.blend
python3 tools/blender/pack_living_papers.py /tmp/winter-living-source dist/assets/living
```

The generator saves editable `.blend` files alongside its paper renders. GLBs
contain a real three-tier cake (eight merged material surfaces, five named wick
nodes), independently hinged envelope flap/bow/paper folds, an orthographic
lighter with lid/wheel pivots, a photo-projected relief, grass and an articulated
puppy. Six Blender-baked paper surfaces are reused by the existing 22 note buttons
instead of allocating 22 WebGL contexts. All existing note IDs/storage stay intact.

The small lake/stone camera foreground remains the original photographic fallback.
No real exploration environment, Shenzhen game, new life chapter or town is added.

## Guarded candle integration

`CandleTip_0..4` world positions are projected through the live 3D camera, then
mapped into the original visible SVG's coordinate system with its inverse CTM.
The unchanged `cake-five-candles.js` reads those positions, so camera/hand readiness,
nearest-wick dwell, departure from the previous wick, and all five separate
ignitions are still required. The transparent SVG keeps layout geometry; it is
never removed with `display:none`. Inspecting the lighter by touch cannot ignite
a candle. While the camera is active, its original hand pipeline owns movement.

```sh
node --test tests/routes.test.cjs tests/journey.test.cjs tests/cake-five-candles.test.cjs
WINTER_PREVIEW_URL=http://127.0.0.1:4173 node tests/living-birthday.browser.cjs
WINTER_PREVIEW_URL=http://127.0.0.1:4173 node tests/birthday-polish.browser.cjs
```

Browser screenshots/reports are written outside `dist/`. Synthetic video and
detector coordinates exercise collision integration, not real hand tracking.
Physical iPad Safari, real-hand accuracy and GPU frame rate need device testing.
