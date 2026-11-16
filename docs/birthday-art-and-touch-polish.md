# Birthday art and touch refinement

Base: `main` at `5f6a391348c5e6470012e8f6f8b54999296af571`.

## Foreground and Blender workflow

The previous camera foreground sampled the native photograph with half-resolution
coordinates. Its stone shelf therefore included enlarged cake decorations. The
browser also performed a low-resolution photographic difference on every aspect
change. These operations are replaced by two cached native-resolution alpha layers.

The ornate three-tier cake remains the existing image. Image generation supplied
extraction silhouettes only; Blender maps those silhouettes to the original camera
coordinates and keeps the original RGB. No new fully modelled cake is claimed.
The source masks live in `tools/blender/masks/`. Original extraction generations:
`exec-3fa21b80-aa3c-4d27-b3d5-24c21a58bf7a.png` (wide) and
`exec-b1931a25-aa49-4caa-a2ea-1eea48ba1f9e.png` (portrait).

Blender 4.3.2 creates a continuous slate shelf, soft contact shadow, and a bevelled
silver lighter with an open lid and a W. monogram. The slate uses object-space
procedural grain rather than a stretched photograph. Ivory key light and blue rim
light coordinate the materials with the existing cake. The web assets are baked
RGBA WebP images, preserving the buildless website and mobile rendering budget.
Live candle flames and the five independent wick interactions remain in the browser.

Recreate the renders with Blender, then encode the resulting PNGs as RGBA WebP:

```sh
blender -b --threads 2 --factory-startup --python-exit-code 1 \
  --python tools/blender/render_birthday_layers.py -- --output /tmp/winter-renders
```

`--only-stone`, `--only-lighter` and `--only-masks` allow isolated rebuilds. The
optional `--mask-wide` and `--mask-portrait` inputs recreate the source silhouettes.
Render-source `.blend` files and original PNGs are retained outside the repository
at `/workspace/artifacts/birthday-polish-source/`. The lighter's flame anchor in the
HTML matches the camera-projected burner point from the Blender manifest.

## Layout and interaction

- Camera activation clears the phone navigation and retains a 44px target.
- About's mosaic cannot flex-shrink into its heading. On phones the heading, 22
  notes, portrait rows and Gwen's original ink have separate flow space.
- Paper has soft individual curl and crease detail; note IDs and storage are intact.
- The captured wallpaper receives Gwen's original birthday message before its one
  side-key action becomes available. The key and its attached label share one hit
  target. Capture, retake, save and close remain available. Stale image work and
  pending notifications/transitions are cancelled on retake, close or route exit.
- Balloons and confetti fade when the phone opens.
- The mobile creator studio uses a full-width canvas and a bottom tool drawer.
  Palette, eraser, brush, clearing, camera, PNG preview/share and navigation retain
  their IDs and handlers. Desktop keeps the side toolbar.

## Validation

```sh
node tests/routes.test.cjs
node tests/journey.test.cjs
node tests/cake-five-candles.test.cjs
# Serve dist/ on a local port, then use the installed Playwright/Chromium:
WINTER_PREVIEW_URL=http://127.0.0.1:4173 node tests/birthday-polish.browser.cjs
```

The browser suite uses isolated local note storage and synthetic camera video.
It covers four viewport sizes, foreground resolution, zero accidental candle
completion, navigation clearance, note editing/persistence, author-ink clearance,
Gwen's notification, retake cancellation, the side-key transition, all 19 photos,
mobile tool folding, real canvas strokes and PNG export. It does not verify real
hands or physical iPad/Safari behaviour. The existing five-wick unit suite covers
independent ignition and the mandatory 5/5 gate. QA captures are retained at
`/workspace/artifacts/birthday-polish-review/`.
