# For WINTER — 写给你的25岁

A birthday gift made for WINTER by her boyfriend. The glass navigation switches among About me, Home, and Destination. Home keeps the forest cover, with “For you,” above the moss-green WINTER title and a small dedication that makes the sender's perspective clear.

About me is now “Dear me”: her own words to her 25-year-old self. It contains 22 lightly creased sticky notes arranged as the digits 25: 11 notes for each digit. Each has a unique paper texture, fold paths, curl position, placement and shadow; the two digits do not repeat the same rotations. The requested self-addressed dedication remains underneath: “周琬婷，辛苦了。谢谢你过去的24年的坚韧。”

All notes start blank. Clicking a note opens an editor. Writing is stored only in the current browser under `winter-about-notes-v1`; it is not synchronized across devices or published into the Site source. Clearing a note's text and saving leaves it blank again. This update preserves the existing storage key and note IDs.

Destination uses its own dreamlike, AI-generated mountain / forest / meadow landscape. On entry, a native dialog says “生日快乐，我最珍惜的人” with two “好的” buttons. Either button dismisses the dialog and fades in the birthday envelope. Escape also dismisses the greeting accessibly. Opening the envelope plays a short flap transition and navigates to `#letter`; leaving during the transition cancels it. Reduced-motion settings remove the animation delay.

The opened letter is a new, scrollable view with the envelope's cream paper color and the heading “一起呼吸过空气的两个国家”. Britain and China flag buttons on the left reveal mutually exclusive taped-paper notes on the right. All story copy and the visible country labels, including the user-supplied “UnitedKindom” spelling, are preserved verbatim. The flag assets are local SVGs. Returning from the letter to the envelope does not replay the greeting; entering Destination afresh from another tab does.

Buildless HTML/CSS/JavaScript; deployable assets live in `dist/`. Responsive layouts, accessible tab controls, keyboard navigation, native dialogs and reduced-motion preferences are supported. Navigation supports `#home`, `#about`, `#destination` and `#letter`, including browser back/forward. “只看风景” remains available on Home.

## Motion treatment

This update follows the user-requested [Ai-Design-Skill animation-systems](https://github.com/MuhammadimYusoff/Ai-Design-Skill/blob/main/agent-skills/web-design/animation-systems/SKILL.md), with its [ambient-section-particles](https://github.com/MuhammadimYusoff/Ai-Design-Skill/blob/main/agent-skills/web-design/ambient-section-particles/SKILL.md) guidance for the small light layer. The skill files were read from their public source; no global plugin, framework or animation dependency was installed.

The existing images, copy, page structure, country stories, note IDs/storage and `app.js` interaction flow are retained. `motion.css` and `motion.js` provide the separate enhancement layer. The small header icon pauses the new atmosphere and remembers that preference independently from the note contents.

Motion tokens: 160 ms hover/press feedback, 240 ms small popovers, 480–600 ms entrances, and 950 ms for the main title. The easing is `cubic-bezier(.22,.72,.22,1)`. The home title appears before its supporting copy; paper notes enter with 26 ms spacing on desktop and 17 ms on mobile. Translations are small (8–12 px for entrances; a maximum of 4 px horizontally and 3 px vertically for mouse-driven scenery). The paper's authored rotation uses `transform`, while entrance movement uses the independent `translate` property.

The envelope atmosphere contains at most eight small lights at the outer edges. Visible density is based on container area. CSS animates only opacity and transforms/individual transform properties; pointer movement shares a single queued frame and uses cached bounds. There is no permanent JavaScript animation loop. Motion pauses while a dialog is open, the document is hidden or the Site is out of view. Observer subscriptions, listeners and pending frames are cleaned on page exit; back/forward cache restores resume the same layer without adding duplicates.

System `prefers-reduced-motion` disables the added effects, and touch/coarse-pointer input does not drive parallax. Motion preferences use `winter-ambient-motion-paused`, preserving `winter-about-notes-v1` untouched. Validation covers the original interaction sequence and separate motion lifecycle/state checks; browser rendering and live performance profiling were unavailable in this environment.

## Photography

Grindelwald, Switzerland, by Polina Kocheva on Unsplash.

- Original: https://unsplash.com/photos/6IEGjAhBnfU
- Source image: https://images.unsplash.com/photo-1628062204131-71026a7e174d
- License: https://unsplash.com/license

Downloaded and served locally as optimized WebP, with a smaller mobile variant. The place label describes the photograph, not the owner's location.

The Destination landscape was generated for this gift and is not a photograph of a claimed location. It is served locally as separate desktop and mobile WebP files. Paper grain and crease assets are procedural SVGs.

Typography: Cormorant Garamond, DM Sans, Caveat and Noto Serif SC via Google Fonts, with local serif and system sans-serif fallbacks.
