# Blue-hour art direction, a quiet candle ceremony and the little universe

This update is based on production commit `8947f109f7259138f144e1200daf164ab2f6a3e0`
of `Capperrr/winter-birthday`. It targets the existing Vercel project
`winter-birthday`, not the earlier Sites-hosted copy.

## Art direction

The encounter letter now sits over an original generated blue-hour Alpine lake:
cool snow, reflected dusk, pine silhouettes and a narrow warm horizon. It replaces
the green gradients and polygon mountains. Text, Gwen's actual handwritten images,
letter navigation and birthday content are preserved. A portrait composition serves
small screens; a matching horizontal extension serves wider screens. The images are
AI-generated scenery, not documentary photographs of a named lake.

| Production asset | Dimensions | Source generation |
| --- | --- | --- |
| `dist/assets/encounter-blue-hour-wide.webp` | 1672 × 941 | `exec-57b82e9e-6025-4f5c-ab40-039271715a4a.png` |
| `dist/assets/encounter-blue-hour-mobile.webp` | 1086 × 1448 | `exec-6e375f6a-3a75-4420-adf8-f02453bf70d2.png` |

Generated originals remain in `/workspace/generated_images/`. Only RGB WebP
encoding was applied to these images; no blur or recolouring was applied. Together
the two responsive assets are approximately 437 KB. Short text entrances respect
the existing system and site motion preferences.

## Candle ceremony

The original integrated three-tier cake, stone table and lake images are retained.
The night backdrop fades in first; the cake photograph follows over 1.5 seconds,
then the serif title, lighter and its existing instruction appear. The artwork and
its coordinate map never scale or move during this entrance, keeping touch targets,
SVG wicks and the lighter aligned. The animation applies only while unlit and uses
backwards fill, releasing opacity to the existing candle/thanks/fireworks states.
Both the empty lake plate and cake photograph share a slight 3% exposure and 6%
saturation reduction. The blow-candle dialog uses cream and slate colours to match
the scene. No birthday prose, artwork geometry, ignition code or ceremony timing
has changed. System and site motion-off preferences disable the added entrances.

## Phone interaction

After taking the photograph, Gwen's lock-screen message appears before the
power control becomes available. The right side key has a 44 × 88 CSS-pixel hit
area and a brief champagne-coloured cue. “轻按这里 / 息屏 · 继续” sits next to
that key, connected by a fine arrow. This label belongs to the same button, so
tapping either the key or its label turns off the phone and reveals the cosmos
from the phone's measured position. There is no second action or below-phone
instruction panel, and showing the cue causes no layout reflow.
Retaking, closing and leaving the finale cancel pending timers and asynchronous
image tasks. Repeated taps cannot create multiple transitions. The layout reserves
a narrow strip beside the handset for the cue. Short landscape screens place the
existing retake/save/close tools to the right; portrait screens keep these below
the phone and allow scrolling if needed.

## Universe opening

The four original Chinese sentences occupy one stable reading position. The first
three fade in, hold and fade out in separate 3.6-second beats; “才刚好遇见。”
then fades in and remains. The English footnote appears with the final sentence.
The existing continue button stays available throughout. Closing or advancing
interrupts the sequence; reopening starts it again. Hidden tabs pause the reading
and stop canvas work. Reduced motion and the site's motion-off setting show every
line together and draw a still star field.

The photo wall keeps all 19 supplied photographs, uses the individual image files,
centres incomplete rows and retains full-image viewing, neighbour preload and arrow
navigation. Closing the lightbox after changing photos restores the original tile's
focus. The twentieth photograph is pending the user's upload; no substitute or
empty photo was added.

## Verification

Run from the repository root:

```sh
node tests/routes.test.cjs
node tests/journey.test.cjs
node tests/finale-phone.test.cjs
git diff --check
```

These are deterministic DOM/state checks. The phone checks exercise capture,
wallpaper reuse, message gating, the side key and its label, rapid repeat activation,
retake/close/route/load interruption, recovery, reduced motion, every supplied photo
and lightbox focus. They also cover universe replay/interruption, hidden-tab pause
and the site's motion setting. Original birthday routes and local note storage are covered by
the existing suite. No browser/desktop tool is exposed in this session, so browser
rendering, physical iPad touch, visual screenshots and frame-rate measurements are
not claimed. Deployment HTTP and asset checks are recorded in the pull request.
