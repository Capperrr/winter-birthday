# 2026-11-21 · 用户截图纠错：必须使用原光栅海报
用户明确指出：此前网页的简化山丘 SVG 与其认可的艺术海报完全不同。
**新视觉来源：`dist/assets/winter-sunrise-original.avif`，由用户确认的 `winter_sunrise_linefield.png` 原图压缩得到，保留同一张海报的叶片、日出、雪山和密集光栅线条。**
`dist/winter-editorial.css` Home 背景已改用该真实海报文件；`dist/winter-editorial-linefield.svg` 仅为旧尝试，不再在 Home 中引用。
Home 额外写实云层 `.moving-clouds`、雾层、光晕及日间蒙层已禁用，避免覆盖原图。
保留网站自带的 For you / WINTER 标题、诗句、导航和 Morning/Night；Night 手动切换可以给原图加深色调。
只改独立试验分支 `preview/winter-editorial-20261121`，不可覆盖旧预览或正式版 main。

# APPROVED VISUAL EXPERIMENT — 2026-11-21
For the isolated branch `preview/winter-editorial-20261121`, the user explicitly approved a blue/white/pink editorial redesign and use of an optical-linefield mountain art interpretation on Home, replacing Home's original photographic appearance. All other personal/real photographs, original user-written prose, and key interactions must be preserved. Color treatment and files are documented in `EDITORIAL_ART_DIRECTION_2026-11-21.md`. Earlier photographic guidance still applies to all other branches and chapters.

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
