# Alpine letter, silhouette, phone keepsake and living world

This continues the latest GitHub birthday page (`main` at `2f700870c45bf639350cd85d581cc9870acbe7f3`) while retaining the independent Shenzhen module from the previous published branch. No original notes, country letters, cake/lighter, music, album, dogs or stored text are deleted. The route and gates in `app.js` remain unchanged. Development is isolated on `feature/alpine-keepsake-world`; GitHub main is not overwritten.

## Birthday flow and images

The letter headed “偏偏，在那里遇见了你。” keeps every original paragraph, with a newly generated photographic alpine twilight/stream/forest background. `personal-album.css` now owns one consolidated background and type treatment instead of the old stacked gradient/mountain silhouettes. Desktop and mobile assets are local WebP.

The childhood birthday scene uses the existing reference edited with imagegen: both girls' faces, hair, clothing and 25-candle cake are retained; all outer scene/paper decorations are removed. True alpha and a close lavender contour follow the people/cake, without ellipse masks or white rectangular mats. A four-column atlas generated with imagegen supplies the new world's two hikers, shepherd and baker. Prompts, source details and transformations are in `ALPINE-ART-PROVENANCE.md`; the deployed assets are WebP. Raw PNG alternatives remain in the work area, outside the deployment.

`interactive-finale.js` retains two-piece drag/tap assembly and the finite celebration. It dispatches exactly one `winter:finale-finished` only when fireworks finish; reduced motion and unavailable canvas have a direct completion path. Replay resets and leaving cancels delayed completion. No photo timeline is used as an exploration world.

## Phone capture

After the final celebration a graphite iPhone-style front screen opens. It is an interactive screen illustration, not a claim about exact iPhone 18 industrial specifications or a real phone/notification service.

- The camera preview comes from **the actual joined `#finale-snapshot` DOM**, captured using locally vendored html2canvas 1.4.1. Interface controls are omitted; the assembled image, headings, captions and birthday message remain.
- Pressing the shutter takes a **fresh DOM capture**; only a successful image enables the lock-screen state. It fits the complete capture into a 1179×2556 portrait canvas, without cutting off either girl's face. Nothing uses a stock wallpaper substitute.
- The same captured image becomes the wallpaper. Clock/date: **12月15日 / 00:00**. Notification sender: **Gwen**. Top-right: **现在**. Copy: **生日快乐，以后的每一个生日都想陪你过。**
- The screen has an island/camera opening, status symbols, lock symbol, date/time typography, translucent notification, utility icons and home indicator. The shutter gives a short visual response and optional vibration on supporting devices; reduced motion suppresses the flash.
- Save downloads the actual wallpaper PNG; no webcam, screenshot permission, external upload, message sending or OS wallpaper API is used. The image stays in memory and is cleared on route exit/reset. Capture failure displays retry and an independent link to the world; it cannot claim a successful photo.
- Capture generations are cancelled logically on reset/exit. A late asynchronous result cannot replace a newer image. `phone-capture.mjs` owns this small state machine; `phone-keepsake.mjs` handles the dialog and actual capture.

Closing the message reveals the “新世界 · 雪峰下的小镇” link. `/alpine/` is also directly accessible for friends. Returning to `../#finale` uses existing birthday gates/session state.

## Living alpine world

`dist/alpine/` is one real Three.js scene with an orbiting orthographic camera, carved terrain, instanced building/detail meshes, lit alpha-tested pixel planes and dynamic voxel animals. It does not swap photos or pan a flat illustration. The engine is self-contained in `dist/vendor/`, independently of the retained Shenzhen game.

Features implemented:

- Front-low/back-high meadow terraces; faceted blue/white snow peaks; retaining masonry, gravel, paths and separate stair ramps. The river is a continuous 3D ribbon from the upper snowfield through three falls, town and pasture. Terrain carving follows its height; numerical checks prevent water floating far above banks.
- Timber chalets, pitched muted-red/slate roofs, flower boxes/balconies, clock-tower church with clock hands and cross, bakery, cheese workshop/wheels, shepherd hut, an open hay shed/bales, stone square/trough fountain, two wooden bridges and two cable stations/cabins.
- Meadow blades/wildflowers, fences, spruce forest, rocks/gravel, six cows, eight sheep, four goats and one sheepdog. Animal parts are dynamically instanced.
- Slowly travelling cable cars, vertex-animated grass/tree/flower sway, smoke, moving cloud shadows on the actual terrain/mountains, water glints, soft white spray/fountain particles and subtle walking grass/petal trails.
- Four local-atlas pixel figures. Material normals receive actual scene light; separate soft transparent ground shadows and 5fps walk frames retain pixel silhouettes. Patrols include pauses/turns/breathing and smoothly shift routes after several rounds; the generated cycle has two principal leg silhouettes with variations, not hand-authored animation of arbitrary complexity.
- Sunny/shower/fog/snow states and gradual morning/noon/evening illumination. Evening windows become emissive. Optional slow light progression. Reduced motion freezes nonessential effects; direct walking/interaction remains available.
- Click the bell, bakery, cheese, fountain, cable station or dog/shepherd to interact. Taking the cable follows the actual moving cabin; dragging interrupts the camera. Ground taps guide the paired hikers through collision-aware A* paths, using bridges rather than crossing water. WASD/arrows also move them. Buildings, river, bounds and steep cliff transitions constrain navigation.
- Mouse/touch camera orbit, Shift/right-drag or two-finger pan, wheel/pinch and explicit zoom controls. Near/far/town/meadow views move the same camera through the same scene. Native pause/help, tab hiding, BFCache and context-loss handling stop/restore work. PNG landscape capture renders the actual current canvas.

The current scene has approximately 108k triangles, 110 meshes and 4.6k instances; exact deterministic counts are in `dist/alpine/verification.json`. Grass is limited to 2400 candidate clumps; weather to 220 particles. A single 1024px shadow map, 1.25/1.5 pixel-ratio caps and adaptive reduction to 1 constrain rendering. Actual GPU draw calls/performance remain unprofiled. No post-processing chain or external runtime image/font/CDN is required for the world.

Only `winter-alpine-world-v1` stores this world's weather/time/camera/position preferences. Existing note/music/ceremony storage keys are not migrated or overwritten. Generated source artwork and the fictional town do not claim to document a real Swiss settlement.

## Verification actually performed

```sh
node tests/alpine.test.mjs --write-evidence
node tests/alpine-runtime.test.mjs
node tests/phone-capture.test.mjs
node tests/finale-sequence.test.cjs
node tests/routes.test.cjs
node tests/journey.test.cjs
node tests/shenzhen.test.mjs
node tests/shenzhen-input.test.mjs
node tests/shenzhen-runtime.test.mjs
```

The new checks run real Three.js geometry/cameras/rays, continuous input-driven paths, weather/light/cable/actor updates, river-bank alignment, a real controller with no-GPU renderer and simulated dual-touch/cancel/context interruption. The finale test runs the finite particle sequence before the phone event. Phone runtime checks call the actual capture adapter with a substituted rasterizer, verifying the captured element, fresh shutter capture, wallpaper source, exact copy and cancellation/error guards.

These are **not actual browser screenshots, html2canvas pixel rendering, WebGL shader/rendering tests, physical iPad haptics/input tests, or GPU performance measurements**. The managed environment did not expose the supported browser/desktop JavaScript tool, so no browser server/control workaround was attempted. Code/asset/simulation checks plus anonymous production HTTP/MIME/hash checks are the available evidence. Manual browser/iPad verification remains required for the final rendered composition, captured wallpaper, frame rate and touch feel.

Manual checks to complete on desktop Chrome/Safari and iPad Safari: play existing birthday flow; assemble both halves; wait for fireworks; shoot/save/retake/close/reopen; verify both faces and copy in the real wallpaper; enter the world; orbit/pinch/pan; walk over both bridges and stairs; activate six places; switch all weather/time modes; observe lights/particles; pause, rotate, background/restore, reload and return to original notes. Check console/network, clipping and horizontal overflow at 320px phones, portrait tablets and iPad landscape.

The new UI follows Ai-Design-Skill [animation-systems](https://github.com/MuhammadimYusoff/Ai-Design-Skill/blob/main/agent-skills/web-design/animation-systems/SKILL.md): 160–200ms presses, 380–650ms small entrances and 800–900ms hero assembly; gentle settling, pointer feedback, restrained ambient layers, capped canvases and reduced-motion paths.
