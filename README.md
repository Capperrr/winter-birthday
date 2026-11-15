# For WINTER — 写给你的25岁

A birthday gift made for WINTER by her boyfriend. The glass navigation switches among About me, Home, and Destination. Home keeps the forest cover, with “For you,” above the moss-green WINTER title and a small dedication that makes the sender's perspective clear.

About me is now “Dear me”: her own words to her 25-year-old self. It contains 22 lightly creased sticky notes arranged as the digits 25: 11 notes for each digit. Each has a unique paper texture, fold paths, curl position, placement and shadow; the two digits do not repeat the same rotations. The requested self-addressed dedication remains underneath: “周琬婷，辛苦了。谢谢你过去的24年的坚韧。”

All notes start blank. Clicking a note opens an editor. Writing is stored only in the current browser under `winter-about-notes-v1`; it is not synchronized across devices or published into the Site source. Clearing a note's text and saving leaves it blank again. This update preserves the existing storage key and note IDs.

Destination uses its own dreamlike, AI-generated mountain / forest / meadow landscape. On entry, a native dialog says “生日快乐，我最珍惜的人” with two “好的” buttons. Either button dismisses the dialog and fades in the birthday envelope. Escape also dismisses the greeting accessibly. A dusty sage/hemp cord now wraps the envelope. The knot is the actual button: clicking it unthreads the bow, opens the flap and expands a paper sheet into the next view. The three phases are cancelled if the visitor leaves; system reduced motion skips the visual delay.

As explicitly selected by the user, the sequence is: greeting → tied envelope → birthday word puzzle → country memories. The puzzle view at `#unlock` frames a generated snowy / soft-aurora landscape between two torn-paper edges. It shows “happy” plus a blank input, with “WINTERRRR” underneath. Submitting BIRTHDAY in any letter case opens the memories. Wrong answers receive a gentle inline hint. The solved state lasts for the browser tab via `winter-birthday-word-solved`; an unsolved direct `#letter` visit is redirected to the puzzle.

The puzzle includes original loose-line artwork: a birthday cake with dimensional “25” candles and a couple holding hands. The cake has a visible click hint and opens a native dialog with two speech bubbles: the exact requested birthday wish and a happy kaomoji. It does not bypass the word puzzle.

The country memories use the envelope's cream paper color, a centered composition and the heading “两个国家，都有和你一起的时光”. China opens by default, with Britain and China flags switching the taped-paper notes. On desktop the flags and letter form a centered two-column composition; on mobile the flags sit above a full-width note. Two original SVG puppies run below the memories with independently animated legs and tails. All story copy and the visible country labels, including the user-supplied “UnitedKindom” spelling, are preserved verbatim. Returning from the letter to the envelope does not replay the greeting; entering Destination afresh from another tab does.

Buildless HTML/CSS/JavaScript; deployable assets live in `dist/`. Responsive layouts, accessible tab controls, keyboard navigation, native dialogs and reduced-motion preferences are supported. Navigation supports `#home`, `#about`, `#destination`, `#unlock` and the word-gated `#letter`, including browser back/forward. “只看风景” remains available on Home.

## Motion treatment

This update follows the user-requested [Ai-Design-Skill animation-systems](https://github.com/MuhammadimYusoff/Ai-Design-Skill/blob/main/agent-skills/web-design/animation-systems/SKILL.md), with its [ambient-section-particles](https://github.com/MuhammadimYusoff/Ai-Design-Skill/blob/main/agent-skills/web-design/ambient-section-particles/SKILL.md) guidance for the small light layer. The skill files were read from their public source; no global plugin, framework or animation dependency was installed.

The original Alpine cover, country stories and note IDs/storage are retained. `motion.css` and `motion.js` provide the shared enhancement/lifecycle layer; `celebration.css` adds the later user-requested visible clouds, untying/unfolding, puppy gallop, candle flames and vintage composition. The small header icon pauses the clouds and puppies, and remembers that preference independently from the note contents.

Motion tokens: 160 ms hover/press feedback, 240 ms small popovers, 480–600 ms entrances, and 950 ms for the main title. The easing is `cubic-bezier(.22,.72,.22,1)`. The home title appears before its supporting copy; paper notes enter with 26 ms spacing on desktop and 17 ms on mobile. Translations are small (8–12 px for entrances; a maximum of 4 px horizontally and 3 px vertically for mouse-driven scenery). The paper's authored rotation uses `transform`, while entrance movement uses the independent `translate` property.

The envelope atmosphere contains at most eight small lights at the outer edges. Home now has two independently translating, true-alpha cloud banks; the image itself remains the original Alpine photograph. Puppy limbs, tails and travel use CSS motion only. Visible light density is based on container area; pointer movement shares a single queued frame and uses cached bounds. There is no permanent JavaScript animation loop. Decorative motion pauses while a dialog is open, the document is hidden or the Site is out of view. Observer subscriptions, listeners and pending frames are cleaned on page exit; back/forward cache restores resume the same layer without adding duplicates.

System `prefers-reduced-motion` disables the added effects, and touch/coarse-pointer input does not drive parallax. Motion preferences use `winter-ambient-motion-paused`, preserving `winter-about-notes-v1` untouched. Validation covers the original interaction sequence and separate motion lifecycle/state checks; browser rendering and live performance profiling were unavailable in this environment.

## Photography

Grindelwald, Switzerland, by Polina Kocheva on Unsplash.

- Original: https://unsplash.com/photos/6IEGjAhBnfU
- Source image: https://images.unsplash.com/photo-1628062204131-71026a7e174d
- License: https://unsplash.com/license

Downloaded and served locally as optimized WebP, with a smaller mobile variant. The place label describes the photograph, not the owner's location.

The Destination landscape, birthday snow/aurora scene and transparent cloud layer were generated for this gift and are not photographs of claimed locations. They are served locally as optimized WebP files. Paper grain/creases, torn-paper edges, hand-drawn people, birthday cake and running puppies are original procedural or authored SVGs; the doodles evoke a loose handwritten style without using a third-party brand logo.

Typography: Cormorant Garamond, DM Sans, Caveat and Noto Serif SC via Google Fonts, with local serif and system sans-serif fallbacks.
