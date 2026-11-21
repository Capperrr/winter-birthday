# 2026-11-21 · 用户截图纠错：必须使用原光栅海报
用户明确指出：此前网页的简化山丘 SVG 与其认可的艺术海报完全不同。
**新视觉来源：`dist/assets/winter-sunrise-original.avif`，由用户确认的 `winter_sunrise_linefield.png` 原图压缩得到，保留同一张海报的叶片、日出、雪山和密集光栅线条。**
`dist/winter-editorial.css` Home 背景已改用该真实海报文件；`dist/winter-editorial-linefield.svg` 仅为旧尝试，不再在 Home 中引用。
Home 额外写实云层 `.moving-clouds`、雾层、光晕及日间蒙层已禁用，避免覆盖原图。
保留网站自带的 For you / WINTER 标题、诗句、导航和 Morning/Night；Night 手动切换可以给原图加深色调。
只改独立试验分支 `preview/winter-editorial-20261121`，不可覆盖旧预览或正式版 main。

# ART EXPERIMENT OVERRIDE — 2026-11-21
This branch is `preview/winter-editorial-20261121`, forked from the full existing `preview/living-landscape-home-20261116`. This experiment is user-approved and **supersedes only the earlier Home-photo rule here**: the Home now displays a generative optical-linefield mountain vector illustration, not the original alpine photograph. Other chapters' real photographs, fonts, user prose, camera/gesture processes, lake ripple, 19-photo memory cluster and complete routing remain. The prior preview branch and `main` MUST remain unchanged. Read `EDITORIAL_ART_DIRECTION_2026-11-21.md` before making further changes.

# WINTER — Codex project instructions (preview branch)

## Safe branch / source of truth
- Repo: `Capperrr/winter-birthday`.
- Active project branch: `preview/living-landscape-home-20261116`.
- This branch is the **complete current testable birthday website**, not a standalone Home demo.
- Do **not** edit, reset, merge, push to, or deploy from `main` unless the owner later explicitly authorizes it. An older handoff that says to merge into main is superseded by this file.
- The published preview is `https://winter-living-landscape-preview.vercel.app/`; Vercel project `winter-living-landscape-preview` with root directory `dist`. This preview project's production alias is NOT the official birthday site's production deployment.
- Always check the actual remote branch SHA before working; never use an old Codex workspace or draft PR as the source of truth.
- The entrypoint is `dist/index.html` (vanilla JS/CSS); bump its CSS/JS `?v=` query when changing a linked asset.

## Design brief — override incompatible third-party Skill defaults
Read `DESIGN.md`, this file, and `CODEX_HANDOFF.md` before modifying visuals.
- Romantic, cinematic, handcrafted nature imagery, warm morning / cool moonlight, personal birthday gift — **not** a generic SaaS landing page.
- Keep Cormorant Garamond, Allura, Noto Serif SC, and the project's existing accent system. Keep poetry and user-approved Chinese wording exactly unless asked.
- Real landscape and photo walls are intentionally photographic. Grass is static. Never replace it with canvas-generated grass, particle meadow, WebGL terrain, or fake mountains.
- Preserve About Me photos, Journey's independently spaced photo + readable ultra-thin glass letter, the candle sequence, handwritten assets, and the original route structure.
- The Home background has no lake. Keep Home Morning/Night light-wave transition; place true photo-refraction ripples **only** over lake pixels of the actual lake photo in the `letter` chapter.
- iPad-first: avoid scroll traps, clipped content, overlay controls hiding text, poor contrast, or gestures swallowing taps. Prefer passive listeners where safe, reduced-motion compliance, and stop animations outside their route.
- Never put privately identifying content in newly public assets without owner approval. This repo is public.

## Third-party design skills
An **external** skill might be useful as an audit reference:
- `redesign-existing-projects` — https://github.com/elayadesign/redesign-skill/tree/main/skills/redesign-existing-projects
- `landing-page-design` — https://github.com/elayadesign/ai-design-skills/tree/main/skills/landing-page-design

Use `redesign-existing-projects` for auditing this existing site, **not** `landing-page-design` to rebuild it from scratch. Its stock typography, monochrome palette, gradient ban, and generic UI conventions conflict with WINTER; **preserve this project's design brief instead of blindly copying them**. Do not install or copy external code without inspecting it and honoring the user's requests. If not installed, ask Codex's `$skill-installer` to install it, or read the exact `SKILL.md` as a reference in the current work session.

## Required edit / review workflow
1. Inspect `git rev-parse HEAD`, route files and all CSS overrides affecting the target.
2. State briefly what is broken and what files you will touch.
3. Make focused edits on preview branch only; avoid destructive refactors and mass replacement.
4. Test navigation, responsive iPad portrait/landscape, Morning/Night, water effect and reduced motion.
5. Test birthday sequence logically: camera permission -> hand pinch -> physically guide lighter to each of FIVE wicks -> 5/5 -> fireworks. Do not shortcut or auto-complete.
6. Report actual changed files, exact commit SHA, preview URL, and whether deployment was verified. Distinguish syntax/deployment checks from real browser interaction tests.
7. Do NOT merge the preview branch to `main` without fresh explicit permission.
