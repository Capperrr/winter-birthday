# WINTER / Codex handoff — use the current production code

**Canonical repository:** https://github.com/Capperrr/winter-birthday  
**Production branch:** `main`  
**Static website directory:** `dist/`  
**Website entry:** `dist/index.html`

## Critical: do not edit a stale workspace

Before working, fetch the remote `main` branch and inspect its HEAD commit:

```bash
git fetch origin
git switch main
git pull --ff-only origin main
git rev-parse HEAD
```

If Codex works in a feature branch, **create it from the current `origin/main`**. If an old branch/PR already exists, rebase or integrate changes against the current main and resolve conflicts carefully before merging. In particular, old draft PR #5 and #6 are *not* production and are behind main. Never merge or overwrite `dist/index.html` or the birthday scripts from an old branch without checking the diff.

After changes, run the relevant validation, push the work, and **merge the PR into `main`**. A branch-only commit is not visible on the live birthday webpage.

## Five-candle birthday interaction (the current requirement)

- `dist/cake-five-candles.js` — tracks hand pinch + lighter movement, detects five separate candle wicks, and sends `winter:air-five-complete` **only after 5/5**.
- `dist/cake-five-candles.css` — candle flame state, progress and subtle sparks.
- `dist/cake-scene.js` — birthday chapter, fireworks, blowing out; intentionally reacts only to `winter:air-five-complete`.
- `dist/creator-studio.js` — camera connection and creator page; **must never auto-light all candles on a pinch**.
- `dist/gesture-controls.js` — webcam / MediaPipe hand detector, `winter:hand-frame` events.
- `#cake-art-slot` in `dist/index.html` — the slab, cake, wax, wick and lighter share one SVG viewBox. `cake-scene.js` decodes the scene before enabling camera access.
- `dist/index.html` — actual shipped HTML and JS/CSS asset links.

Required order: enable camera -> detect hand -> pinch to grab lighter -> move flame into each wick -> each candle individually lights and stays lit -> 5/5 -> original blow/firework flow. Before 5/5, touch cannot shortcut ignition. On camera or recognition failure, show retry; do not silently mark candles as lit.

## Diagnosing “Codex updated it but the website is old”

1. In GitHub, confirm the new commit is at **`Capperrr/winter-birthday` → `main`**, not just a feature branch or unmerged draft PR.
2. Check the `main` commit SHA. Compare it with the Vercel production deployment's **Git commit SHA**. If they differ, the deployed site is stale.
3. The web deployment uses the built/static `dist/` directory. Edit the actual deployed files, and update cache-busting `?v=...` in `dist/index.html` when scripts/styles change.
4. Vercel and Tencent CloudBase are **independent deployments**. Publishing to Vercel does not automatically update the Tencent `tcloudbase.com` link, or vice versa. The China-facing Tencent site must be redeployed from the same `main` snapshot.
5. If the website still seems stale on an iPad, open a freshly versioned URL or use a private tab after verifying the deployed SHA.

When handing work between Codex and ChatGPT, always share **repository + branch + the exact commit SHA**, not only a public website URL.
