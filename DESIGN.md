# WINTER — visual design and interaction guidelines

This document is the project's design brief for future AI-assisted edits. It does not change browser behaviour.

## Artistic direction
Quiet, photographic, hand-crafted, warm. Winter likes the outdoors. Keep the page rooted in real landscapes, daylight, flowers, sky, stone and tactile paper. Treat each page like a carefully kept memory rather than a generic app.

## Layout
- Preserve the existing WINTER identity, Cormorant Garamond and Noto Serif SC, with Gwen's scanned handwriting reserved for emotional details.
- One clear visual hierarchy per scene. Leave space around headings. Avoid decorative UI cards, glossy chrome, fake 3D ornaments, excessive icons and noisy gradients.
- Buttons should be reachable, 44px high when possible; on iPad/phone never hide essential interactions beneath text.
- Restrict animation to gentle entrance transitions (300–850ms) and meaningful user-triggered effects. Provide reduced-motion support.
- Realistic nature photographs must not be replaced with polygon mountains or synthetic scenery.
- Keep user-uploaded imagery clear; tapping a photo should show the high-resolution file rather than an enlarged thumbnail.

## Birthday camera experience
- Camera is never enabled before the cake chapter and always requires an explicit tap/permission.
- In the cake chapter, camera goes behind the existing cake/stone/lighter foreground; the original sequence and fireworks continue to work.
- The creator studio follows the independent 19-photo wall, not the About Me board.
- All creative controls are usable by touch when camera permission or hand tracking fails.
- Camera is stopped on page exit or when the user switches to touch-only mode.
- No synthetic interaction sounds. Keep audio/music controls separate.

## Interaction copy
- Explain in simple Chinese what to do, exactly where to touch, and what happens next.
- Prefer a single brief hint over intrusive boxes or long instructions.
- Never promise that webcam hand tracking will work without model access.
