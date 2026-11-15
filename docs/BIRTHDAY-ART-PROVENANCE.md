# Birthday letter and portrait asset provenance

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
