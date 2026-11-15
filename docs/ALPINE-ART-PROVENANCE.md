# Alpine keepsake asset provenance

Generated on 2026-11-15 with the `image_gen.imagegen` tool. Original generated PNGs remain in `/workspace/generated_images`. Pillow was used only for format conversion, resizing and the mobile crop; the production cutout keeps the generated alpha channel and visual pixels.

## Finale cutout

- Reference: `/workspace/work/finale-childhood-reference.png` (960 × 654).
- Generated source: `/workspace/generated_images/exec-40ce8dc1-f8c1-412e-8e5a-552d34149729.png` (1520 × 1035 RGBA).
- Production: `/workspace/sites/winter-home/dist/assets/finale-girls-cutout.webp` (1520 × 1035 RGBA, 517022 bytes, quality 93).
- PNG alternative: `/workspace/work/finale-girls-cutout.png` (1520 × 1035 RGBA, 2288923 bytes).
- Alpha range verified: 0–255; 525591 exterior pixels have alpha 0. Most foreground pixels have alpha 252–253, as returned by imagegen. Both entire faces, hair, clothing, visible hands/arms, numeral candles 25 and complete cake/plate are present. Birthday decorations, checkered cloth, bow and surrounding rectangular background were removed. The contour follows the actual subject silhouette.

Imagegen edit prompt (`transparent_background: true`, reference path supplied):

> Create a faithful high-quality transparent-background cutout by editing the attached reference image. Preserve the exact identities and facial features of BOTH girls from the reference, their entire faces, hair, hairstyle, hairclips, earrings, grey hoodie on the left girl, black shirt on the right girl, leaning/blowing pose, arms and hands, AND the complete birthday cake with the numeral candles 25, strawberries, lit candle flames and plate. This is a precise background removal and silhouette cleanup, not a redesign or a new illustration. Remove every white/pastel scene/background area, all surrounding balloons, hearts, doodles, letters, confetti, outer rectangular paper, and the checkered tablecloth and decorative pink bow. Keep both girls, their visible forearms/hands, the cake and its plate as a coherent natural foreground group. Cleanly remove background from visible negative spaces between subjects and cake while preserving hair. Apply only a fine, elegant, muted lavender contour line that closely follows the true outer silhouette of hair/heads/shoulders/arms/cake/plate; no oval, arch, rectangle, frame, broad paper border, or white sticker fill. Preserve original photorealistic soft childhood photographic detail, expressions and warm skin tones. Composition centered, tightly cropped with only a very small fully transparent margin around the subject. Entire heads/hair and cake plate must fit uncropped. True alpha transparency everywhere outside the foreground; no opaque background or checkerboard pattern.

## Encounter alpine landscape

- Generated source: `/workspace/generated_images/exec-df2e9ef1-1b55-47bf-b437-1ed16d52fe57.png` (1536 × 1024 RGB).
- Production: `/workspace/sites/winter-home/dist/assets/encounter-alpine-twilight.webp` (1536 × 1024 RGB, 230592 bytes, quality 89).
- Small: `/workspace/sites/winter-home/dist/assets/encounter-alpine-twilight-960.webp` (960 × 640 RGB, 78624 bytes, quality 85).
- Mobile: `/workspace/sites/winter-home/dist/assets/encounter-alpine-twilight-mobile.webp` (683 × 1024 RGB, 51042 bytes, quality 86). This is a center portrait crop of the generated source. The desktop scene includes more foreground trees; the portrait crop preserves open sky, distant snowy ridges, lake and stream.
- All production files were opened and visually inspected after conversion. There are no people, buildings or text. The central sky and valley are spacious and dark for cream letter copy.

Imagegen generation prompt (`transparent_background: false`, no references):

> An exquisitely beautiful, genuinely photorealistic Swiss Alpine landscape photograph at quiet blue-hour twilight, wide panoramic landscape composition 3:2. A glacial stream flows from the foreground in gentle silver blue-green curves, widening into a still alpine lake and leading the eye through a deep pine and meadow valley toward elegant distant snow-covered Swiss mountain ridges. Large natural dark evergreen pines frame the LEFT side and a smaller sparse group frames the far right, rich believable bark, needles, moss, riverstones and meadow textures in the foreground. Restrained blue-green and slate tones, subtle pale gold light along the far horizon and on a few distant summits, atmospheric depth, calm water reflections, tender romantic stillness, refined cinematic natural light, medium-format travel photography, completely authentic natural photographic textures, no fantasy or illustration. The central 55 percent of the composition must be spacious, naturally DARK and LOW DETAIL, with an expansive dusky blue-gray sky above a softly shadowed open valley/water area, suitable for cream letter copy to be overlaid later; keep bright peaks and interesting pine detail toward the sides or low on the horizon. The beautiful scenery must feel continuous and natural, not a blank text panel. No people, no buildings, no houses, no roads, no signs, no tents, no boats, no artificial lighting, no text, no lettering, no poster, no typography, no border, no letter or paper overlay. A real immersive Swiss nature vista, intimate and calm.

## Integration

No app code, Git operations, branches, or deployments were changed by this asset task. Integration and page-level visual verification remain with the main task.


# Alpine villagers sprite sheet

Generated on 2026-11-15 with `image_gen.imagegen`, with `transparent_background: true` and no reference images.

Generated source (preserved): `/workspace/generated_images/exec-c8e543f9-d714-4a74-b1ff-a4938f04d84d.png`, 1254 × 1254 RGBA.

Production files:

- `/workspace/sites/winter-home/dist/assets/alpine-villagers.webp`: 1024 × 1024 RGBA, lossless, 61334 bytes.
- `/workspace/work/alpine-villagers.png`: 1024 × 1024 RGBA, 92101 bytes.
- `/workspace/sites/winter-home/dist/assets/alpine-villagers.json`: dimensions, cells, row identities and every frame's visible bounds / foot baseline.

Pillow performed nearest-neighbor resizing from 1254 × 1254 to logical 256 × 256, then nearest-neighbor enlargement to 1024 × 1024. Thus the exact final grid is 4 rows × 4 columns, 256 × 256 output pixels per cell, 64 × 64 logical pixels per cell, with each logical pixel represented by a 4 × 4 block. No characters were painted, cut out, rearranged, padded or edited manually.

Verification: true alpha (0–255), 680496 completely transparent pixels. Every frame is contained in its own cell; using alpha ≥ 128, all sixteen frame foot baselines are exactly y = 240 inside the cell. All sixteen frames have distinct pixel data. Identical character/outfit/prop identities are maintained visually across each row. Row order is sage hiker, cream hiker, shepherd, baker. The walk animation is simple: two dominant leg silhouettes, extended and passing, with modest differences between the opposite-phase frames. Suitable for small village people; do not describe this as a sophisticated hand-authored walk cycle. No terrain, labels, paper, or painted cast shadows are present.

Exact imagegen prompt:

> A production video game PIXEL ART sprite sheet, exactly FOUR ROWS and FOUR COLUMNS, exactly 16 separate full-body human character sprites, on a completely transparent background. Square 1024 by 1024 image. Each of the sixteen square cells is exactly 256 by 256 pixels and contains exactly ONE centered character, never two characters, no missing or extra sprites. Uniform grid of invisible cells: character horizontal centers x=128,384,640,896. Every sprite's feet rest at the exact same within-cell baseline y=224; row foot baselines y=224,480,736,992. Logical 64 by 64 pixel cells, with each character about 26 pixels wide by 42 pixels tall centered in its cell; drawn using consistent chunky square pixel blocks at 4x scale, crisp nearest-neighbor edges, limited pixel art color palette, NO antialiasing, no painterly edges. Generous true transparent space within each cell around each figure so no sprites touch neighboring cells. No visible grid lines, panels, squares, backgrounds, labels, numbers, text, white paper, terrain, ground, shadows or scenery. The sheet contains these exact four character rows from top to bottom: ROW ONE a friendly adult FEMALE HIKER with dark brown shoulder-length hair, sage green jacket, warm cream backpack and brown hiking boots. ROW TWO a second friendly adult FEMALE HIKER with dark brown shoulder-length hair, warm cream jacket, muted terracotta backpack and brown hiking boots. ROW THREE an adult male SHEPHERD wearing a soft felt alpine hat, warm brown vest, sage trousers, hiking boots, holding one slender walking stick. ROW FOUR an adult male BAKER with ivory apron, muted navy shirt, warm brown trousers and shoes, holding a small golden loaf of bread. Each row shows FOUR CONSECUTIVE modest WALK-CYCLE FRAMES of the SAME CHARACTER, all facing toward screen RIGHT at the same gentle front three-quarter angle, stable head/body position and size, coherent face, hair, outfit, backpack and carried prop between frames: column1 left foot forward, column2 feet passing, column3 right foot forward, column4 feet passing with opposite arm position. Arms and legs move a few logical pixels; body stays steady, feet remain on the common baseline. Quiet warm Swiss alpine miniature world aesthetic, understated cute adult human proportions, round simple heads with tiny dark pixel eyes, roughly head one third of total height, human-scale villagers, no anime, no chibi giant heads, no photorealism, no white outlines. Desaturated sage, yellow-green, warm cream, terracotta, dark brown outlines instead of pure black. Completely flat sprite colors and simple 2-tone pixel shading, no painted cast shadows because game adds its own shadows and lighting. Strict equal grid alignment matters.

No app code, Git operations or deployments were changed.
