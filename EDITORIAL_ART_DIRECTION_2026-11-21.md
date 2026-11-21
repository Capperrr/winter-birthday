# WINTER — The Art of Being You
**Isolated visual redesign experiment · 2026-11-21**

## Visual concept
Editorial generative-art birthday exhibition. The HOME uses `dist/assets/winter-editorial-linefield.svg`: a **new vector interpretation** of the approved optical-linefield mountain poster produced in chat (the generated PNG was not silently represented as having been uploaded). It consists of 367 unbroken cubic-curve parallel lines, four broad deformation fields and cool-to-warm Swiss-Alpine-inspired gradient masses. It does not claim to be the original source photograph, the exact PNG raster, or actual 3D geometry.

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
