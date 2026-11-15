# Shenzhen 9F: architecture and acceptance record

## Product correction and preserved work

The existing `dist/journey.html`, `journey.js`, `journey.css`, `index.html` and `app.js` were inspected. Journey is a photographic timeline and local writing interface. It has no navigable world, collision, elevator or environmental puzzle. It does not meet the exploration-game brief. The reused Dazhou image and Swiss scene are not Shenzhen game environments.

The complete original state is retained at `backup/journey-album-2026-11-15`, commit `36c6d37c824e7776202b917d32b44a9d912800a0`. Development is on `feature/shenzhen-9f-slice`; GitHub main is not overwritten. The old album remains usable. Its modules/assets, birthday app, note IDs/storage, 22 notes, cake, lighter, candles, fireworks, country letters and dogs remain unchanged. `index.html` adds a normal link and identifies the archived album. No birthday storage migrations are performed.

## Technical choice

Use vendored Three.js r169 / WebGL 2, not CSS background panning. Four limited spaces share one metric 3D scene and one first-person capsule. Perspective, occlusion, near/mid/far motion and actual elevator displacement follow from geometry. A limited scene avoids the download cost of an open world. No bundler or new framework is required. Birthday JavaScript is not loaded in the game; Three.js is not loaded on the birthday page.

Current geometry: 195 meshes including instanced distant windows; approximately 13,099 triangles. Local vendor plus nine 768px PBR maps total about 1.4 MB. Actual draw calls, GPU memory and frame times remain unprofiled. One 1024px shadow map, capped pixel ratio (coarse pointer 1.25, other 1.5), automatic reduction to 1 under sustained slow frames, and a manual low-power option constrain work. No post-processing or runtime CDN dependencies. Materials/normal/roughness maps load locally and fall back independently on failure.

## Modules and world

- `game-core.mjs`: pure progression, velocity, collision, guarded actions, elevator phase machine and validated checkpoints.
- `world.mjs`: replaceable geometry/PBR surfaces, opaque occlusion, articulated doors/buttons/envelope, carried brass leaf, text labels and real first-hit raycasts.
- `input.mjs`: keyboard, canvas look/tap, independent touch joystick, pointer capture and object manipulation.
- `game.mjs`: camera, render loop, loading, readable inspection UI, pause/resume/context recovery and save lifecycle.
- `audio.mjs`: synthesized footstep/metal/paper/press/chime/motor cues, unlocked by start; these are not actual building recordings.
- `bootstrap.mjs`: module/load/WebGL error boundary and retry.

Metric coordinates: start `(0,0,15)`, looking toward negative Z. Street X ±11.4, Z 0…19.5; C entrance Z 0; lobby X ±5.8, Z −12…0; cab X ±1.28, Z −15.15…−11.76; ninth-floor Y 28.8, corridor X ±3.1, Z −12…2.8. The cab, its doors and camera ascend together; the upper corridor is physically beyond those doors. No photographic scene-switching transition occurs.

Player radius 0.24m, max speed 2.35m/s, 85ms acceleration and 120ms deceleration time constants. Diagonals normalize; movement subdivides at 7cm and checks expanded AABBs plus capsule samples inside the union of walkable rectangles. Doors add state-dependent blocking. Visible geometry defines the limited walking area. Camera dolly checks collision; damped yaw/pitch are constrained. Movement/look cancels automatic focus. This is a flat-floor capsule controller, not general stair/rigid-body physics.

## Required sequence

1. Street: approach/inspect the direction sign. B entrance responds as incorrect. C door requires sign read, then physically opens. Enter by walking through it.
2. Lobby: inspect the floor index to learn 9F. Only then can the call button open the elevator. Walk fully inside.
3. Cab: aim at the real right-wall 9F button and act. Its mesh depresses and returns. Doors close (1.4s), cab rises (8s eased), floor number updates, arrives (0.65s), opens (1.15s). Movement cannot escape the cab during the ride. Skip is available only after the actual 9F press; it goes to arrival with closed doors and still requires opening/walking out. Other gates remain locked.
4. Corridor: inspect the environmental note; pick the brass leaf from the window ledge; carry it to reception; place it in the leaf socket. Failed release returns to the held pose; cancel returns the object to its ledge; correct placement snaps to the socket. Only then can the envelope hinge open and Gwen's new chapter letter be read. Original country-letter copy remains untouched.

Every action checks zone, height/proximity and ordered flags in the core. The controller additionally requires a real first-hit ray through visible geometry. Small-target assistance uses a narrow viewing cone plus the same occlusion ray; it cannot operate distant/hidden objects. HUD stage labels are plain text, not skip controls. `window.shenzhenDiagnostics()` returns copies only; no warp or mutation API is exposed.

## Input, interruption and storage

Keyboard: WASD/up/down walk, left/right turn, canvas drag look, E act, Esc cancel carry/inspection or pause, P pause. Mouse/pen/touch can tap geometry. iPad: left joystick plus simultaneous secondary-finger look; minimum 44px context button. Drag the held leaf from its tray onto the nearby socket, or aim + act to place. Bounds are cached and the carried leaf follows pointer NDC mapped through actual camera FOV/aspect. Cancellation releases capture. Camera focus is interruptible.

Only `winter-shenzhen-save-v1` is written. Checkpoints contain location, orientation, dependent flags, entry state, elevator phase/elapsed time and held item. Save after important events, every two seconds if changed, on pause and exit. Invalid data is sanitized against progression and navigable space. Reload resumes elevator phases; restart removes only this key. Blocked storage permits current-session play and reports at pause. No server or cross-device progress.

Pause/hidden pages stop RAF, motion and audio; blur/cancel clear input. Context loss saves/pauses and blocks resume until restoration, then requires explicit continuation. Surface failures use built-in materials; module/WebGL failures show retry/return rather than a substitute slideshow. Page exit disposes resources/listeners. BFCache restores paused with one render loop. Exit `../#home` leaves all birthday keys alone.

## Checks actually performed

Run from repository root with Node.js, no npm installation:

```sh
node tests/shenzhen.test.mjs --write-evidence
node tests/shenzhen-input.test.mjs
node tests/shenzhen-runtime.test.mjs
node tests/journey.test.cjs
node tests/routes.test.cjs
```

All passed in this environment. The full normal route is physically steered via input/updates, without test teleports. Real Three.js meshes/cameras/rays check required hotspots, occlusion, button transforms, doors, ascent/floor events, clue/leaf/socket/letter, cancellation, save restore and skip guards. Input tests simulate dual touch and capture cleanup. Runtime tests use the real controller/core/scene with minimal DOM and a no-GPU renderer to check boot, movement, pause/hidden/context recovery, save isolation and teardown. Published `simulation-evidence.json` records route positions, flags and events.

**No usable browser preview tool was exposed in the managed environment. No actual WebGL rendering, browser screenshot, physical iPad input, or GPU performance test was performed.** This is labelled “空间机制样章 / 非正式美术完成版”, not strict acceptance complete. Public `shenzhen/evidence.html` maps all ten criteria to automated evidence and remaining manual checks.

Manual acceptance still needed:

- Desktop Chrome/Safari: fresh save, full route, wrong entrance/premature call, actual 9F hit, unskipped ride and complete puzzle; verify foreground occlusion and item feedback.
- Physical iPad Safari, portrait/landscape: two-finger movement/look, every investigation, drag/drop/cancel, rotate mid-gesture, finish without keyboard; verify no browser scroll, clipped controls or overlap.
- Desktop/iPad/phone: actual labels, materials, lighting, proportions, frame times; no horizontal overflow. Test failed texture, WebGL failure/context loss, tab switch, every saved elevator phase and BFCache.
- Exit and play original birthday flow: same 22 note contents, envelope, word puzzle, lighter/candle, blow timing, fireworks, both country stacks and dogs; inspect network/console.
- Anonymous production root and `/shenzhen/` plus local modules/textures; HTTP status/MIME checks do not replace browser testing.

## Art and replacement requirements

Address/destination follow Gwen's supplied information. No measured floorplan or verified photographic reference set was available. Architecture is generic, constructed for this continuous route. The brass-leaf lock and chapter letter are fictional game content, not claims about the building. No Swiss photo stands in for Shenzhen.

Production art needs licensed/authorized references: C tower street approaches/entry, lobby dimensions/index, elevator cab/9F panel/doors/display, ninth-floor corridor/reception/signage/window view. Needed assets: optimized GLB architecture/fixtures with collision proxies, PBR texture atlases, baked lighting where useful, environmental sound and foley. Current common surfaces are Poly Haven CC0; Three.js is MIT with exact upstream license. Sources, modification and hashes are in `dist/shenzhen/ASSET-LICENSES.txt`, texture/vendor metadata and integrity manifest.

Replace named A/B/C/D groups in `world.mjs` and calibrate core hotspots, AABBs and walkable rectangles to measured references. Preserve action IDs, ordered gates, save schema and independent input/controller. This round does not implement Dazhou, Chongqing photography gameplay or Southampton; their archived album is retained only.
