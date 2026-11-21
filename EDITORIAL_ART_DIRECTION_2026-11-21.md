# 2026-11-21 · 用户截图纠错：必须使用原光栅海报
用户明确指出：此前网页的简化山丘 SVG 与其认可的艺术海报完全不同。
**新视觉来源：`dist/assets/winter-sunrise-original.avif`，由用户确认的 `winter_sunrise_linefield.png` 原图压缩得到，保留同一张海报的叶片、日出、雪山和密集光栅线条。**
`dist/winter-editorial.css` Home 背景已改用该真实海报文件；`dist/winter-editorial-linefield.svg` 仅为旧尝试，不再在 Home 中引用。
Home 额外写实云层 `.moving-clouds`、雾层、光晕及日间蒙层已禁用，避免覆盖原图。
保留网站自带的 For you / WINTER 标题、诗句、导航和 Morning/Night；Night 手动切换可以给原图加深色调。
只改独立试验分支 `preview/winter-editorial-20261121`，不可覆盖旧预览或正式版 main。

# WINTER — The Art of Being You
**Isolated visual redesign experiment · 2026-11-21**

## Visual concept
Editorial generative-art birthday exhibition. **Updated after direct iPad screenshot comparison:** Home now uses `dist/assets/winter-sunrise-original.avif`, a browser-optimized copy of the actual image the user approved, preserving its leaves, sunrise, snow mountains and parallel fine-line raster artwork. The older `dist/assets/winter-editorial-linefield.svg` was a rejected stand-in and is no longer used by Home. This is artwork, not real 3D geography.

## Color system
- **Primary 03 (60 / 30 / 10 emphasis):** Cobalt `#09318D`; White `#FFFFFF`; Bubblegum Pink `#FD91CC`.
- **Night secondary 02:** Midnight `#02070A`; Electric Blue `#0297DE`; Ember Orange `#FC734D`.
- **Morning accent 01:** Sky Blue `#0593C6`; White `#FCFFFF`; Hot Pink `#D83995`.
- Base neutrals: cloud white `#F4F9FE`, dark ink `#08254D`.
- Accent colors should remain rare. Don't paint entire prose backgrounds neon or destroy readability.

## Scope
- Modified only experimental branch `preview/winter-editorial-20261121`.
- `dist/winter-editorial.css` is loaded last; original styles are untouched and the effect can be reverted by removing the stylesheet link. Never overwrite `main` or the earlier stable preview branch.
- HOME uses existing DOM, text, scripting and Morning/Night logic; hide only the Home's underlying real-photo raster visually while the optical vector poster occupies the original background layer. Other real photographs and other destination chapters are preserved.
- About Me first scene: dark midnight gallery; 25-note phase remains editable paper and seven original photos remain intact.
- Journey: original five 3D photographs, five-story sticky scrollytelling, thin readable letters; no large bottom glass rectangle, footer remains 「有几句话想对你说」 and 「下一页」.
- Cosmos: keep 19-photo constellation that expands on click, don't restore a carousel or outer backing board.
- Cake: keep MediaPipe camera hand pinch -> pick up lighter -> touch each of FIVE wicks -> 5/5 -> celebration. Absolutely no simulated or touch-to-light shortcut. Preserve camera permissions and all personal copy.
- Original water/ripple interaction only over the actual lake image in letter page.
- Preserve typography, real images, original Chinese prose, music controls, touch navigation.

## Browser tests
- Check Morning and Night, iPad portrait and landscape, letter contrast, five photo gestures, all 19 photo clicks, camera permissions and reduced-motion.
- Source checks and READY status do not replace real iPad Safari testing.
