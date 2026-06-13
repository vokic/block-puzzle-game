# HANDOFF.md — Block Puzzle Game

## Overview
A mobile-first block puzzle game where players drag colored pieces onto a grid to fill animal/food/vehicle/structure/shape silhouettes. Think tangram meets pixel art. Single HTML file, vanilla JS, GSAP animations. Ready for Capacitor wrapping → Android/iOS.

## Tech Stack
- **Single file:** `index.html` (752 lines)
- **JS:** Vanilla, no framework
- **Animations:** GSAP 3.12.5 (loaded from cdnjs.cloudflare.com CDN)
- **Font:** Outfit (Google Fonts CDN)
- **Styling:** CSS custom properties for full light/dark theme support
- **No build step.** Open the HTML in a browser and it works.

## File Structure (all in one file)
```
index.html
├── <style>        — All CSS (~90 lines, minified-ish)
├── <body>         — Static HTML skeleton (menu, game, ghost, bg orbs)
└── <script>       — All JS (~650 lines)
    ├── ICONS {}            — Inline SVG icons for categories
    ├── CATEGORIES []       — 5 categories × 10 shapes each (50 total)
    ├── PALETTE []          — 15-color array for pieces
    ├── Core utils          — mkRng, ky, parseShape, decompose, buildPieceSVG, buildThumbSVG
    ├── State (S)           — Single global state object
    ├── Menu system         — buildMenu, renderCarousel, animateCarousel (horizontal swipe carousel)
    ├── Game init           — startCategory, startQuick, initLevel, transitionToGame
    ├── Game UI             — buildGame, buildNextPreview, buildBoard, buildTray
    ├── Drag & drop         — startDrag, onMove, onUp, clearHover, canPlace, getCell
    ├── Piece logic         — placePiece, removePiece, shakeBoard
    ├── Hint system         — useHint, clearHint, updateHintBtn
    ├── Progress/win        — updateProgress, checkWin, celebrateWin, spawnParticles
    ├── Navigation          — goToMenu, goNextLevel, resetLevel
    └── Theme               — setTheme (light/dark toggle)
```

## Game Mechanics

### Shape Data
Each shape is a string array grid where `#` = filled cell, `.` = empty:
```js
{ name:'Cat', s:['#...#','##.##','#####','#####','.###.','.#.#.'] }
```
`parseShape()` converts this to an array of `[row, col]` target cells.

### Piece Decomposition (the core algorithm)
`decompose(targetCells, numPieces, seed)` takes a shape and splits it into N connected pieces using seeded region-growing:
1. Picks N seed cells spread apart (greedy max-distance)
2. Grows each piece simultaneously via BFS, round-robin
3. Assigns remainders to nearest piece
4. Returns `{ cells (absolute), normalized (zero-based), colorIdx }`

**Seeded PRNG** ensures the same shape + difficulty + seed always produces identical pieces (deterministic puzzles).

### Difficulty Progression (Category Mode)
- Levels 1–3 → Easy (3–4 pieces, 1 hint)
- Levels 4–6 → Medium (5–7 pieces, 2 hints)
- Levels 7–10 → Hard (8–14 pieces, 3 hints)

Difficulty auto-assigned by `levelDiff(levelIdx)`. No user-facing difficulty selector in category mode.

### Quick Play Mode
Random category + random shape. User picks Easy/Medium/Hard explicitly.

### Drag & Drop
- Pointer Events API (works mouse + touch)
- Ghost piece floats 70px above touch point (fat finger offset)
- 30% magnetic pull toward grid when over board, free-follow otherwise
- `Math.round` snapping for intuitive grid alignment
- Board padding offset: 10px (cells positioned at `c*STEP+10, r*STEP+10`)
- Grid snap calc: `Math.round((freePos - rect.left - 10) / STEP)`
- Green highlight = valid, Red = invalid
- Board shakes on invalid drop
- `touch-action: none` + `overflow: hidden` on body during drag
- `gsap.killTweensOf(cell)` in placePiece to prevent hint animation bleed

### Hint System
- `useHint()` picks an unplaced piece, highlights its correct position with GSAP `repeat:-1` sine pulse
- Also highlights the matching tray piece
- Auto-clears after 3.5s or on drag start
- `clearHint()` kills all GSAP tweens on hinted cells
- `placePiece()` also calls `clearHint()` + `gsap.killTweensOf(cell)` per cell (belt + suspenders)

### Win Detection
`checkWin()` verifies every target cell has a piece. Triggers:
- Sequential cell scale+glow pulse
- 35 particles explode from board center
- 3 icon buttons appear: → Next | ↺ Retry | ☰ Menu
- Tray fades out

### Theme System
CSS custom properties swap between `:root` (dark) and `[data-theme="light"]`. Toggle button in top-right corner with GSAP spin animation. ~30 CSS variables cover all surfaces.

## Categories & Shapes

| Category | Icon | Color | Shapes |
|----------|------|-------|--------|
| Animals | paw SVG | #06d6a0 | Fish, Bird, Cat, Dog, Bunny, Turtle, Duck, Whale, Snake, Elephant |
| Food | fork/knife SVG | #ff6b6b | Apple, Cherry, Banana, Ice Cream, Pizza, Donut, Burger, Cake, Cupcake, Candy |
| Vehicles | car SVG | #4dabf7 | Car, Bus, Boat, Plane, Rocket, Train, Helicopter, Bicycle, Truck, Submarine |
| Structures | columns SVG | #ffd43b | Pyramid, House, Castle, Church, Lighthouse, Windmill, Bridge, Pagoda, Tower, Arch |
| Basic Shapes | geometric SVG | #cc5de8 | Square, Triangle, Diamond, Heart, Cross, Arrow, Star, Hexagon, Moon, Lightning |

## Global State Object
```js
let S = {
  screen: 'menu',           // 'menu' | 'game' (not used as router, just for reference)
  mode: null,                // 'category' | 'quick'
  catIdx: 0,                 // current category index (0-4)
  levelIdx: 0,               // current level within category (0-9)
  diffIdx: 0,                // 0=easy, 1=medium, 2=hard
  board: {},                 // { "r,c": pieceIdx } — placed cells
  placed: {},                // { pieceIdx: true } — which pieces are on board
  pieces: [],                // decomposed pieces for current level
  targetCells: [],           // [[r,c], ...] — the shape to fill
  targetSet: new Set(),      // Set of "r,c" strings for O(1) lookup
  gridW: 0, gridH: 0,       // grid dimensions
  won: false,
  completed: {},             // { "catIdx-levelIdx": true } — persistence (in-memory only)
  hintsLeft: 1,
  activeHint: null,          // piece index being hinted, or null
  hintTimer: null,           // setTimeout ref for auto-clear
  dragging: null,            // piece index being dragged, or null
  dragOff: {x:0, y:0},      // pointer offset for ghost positioning
  _hover: null,              // { r, c } — current grid snap position
};
```

## Known Issues / Bugs to Watch
1. **GSAP tween accumulation** — Any `y:'+=N'` or `rotation:'+=N'` on the drag ghost MUST be reset with `gsap.set(ghost, {x:0, y:0, scale:1, rotation:0, opacity:1})` on next drag start. Otherwise offsets accumulate.
2. **Hint + placement race** — `placePiece()` calls both `clearHint()` and `gsap.killTweensOf(cell)` per cell. Both are needed. The hint's `repeat:-1` GSAP tweens will override inline styles if not killed.
3. **Board padding offset** — Board has `padding:10px`. All cell positions and grid snap math must add/subtract 10px. If board padding changes, update: cell positioning in `buildBoard()`, snap calc in `onMove()`, and board size calc in `buildBoard()`.

## What Needs To Be Done Next

### P0 — Mobile Ship (Capacitor)
- [ ] Init Capacitor project: `npm init`, install `@capacitor/core @capacitor/cli`
- [ ] Use `index.html` as the web root entry point
- [ ] `npx cap add android`
- [ ] Add `@capacitor-community/admob` plugin
- [ ] Implement AdMob: banner (bottom, always on), interstitial (every 3rd level complete), rewarded video ("watch for +1 hint")
- [ ] Add `navigator.vibrate(10)` on piece snap for haptic feedback
- [ ] Test on real Android device
- [ ] Build APK/AAB, submit to Google Play ($25 one-time)
- [ ] iOS later (needs Mac + $99/year Apple Developer account)

### P1 — Monetization
- [ ] AdMob ad unit IDs (banner, interstitial, rewarded)
- [ ] Ad-free IAP ($2.99) — removes banner + interstitials, keeps rewarded optional
- [ ] Category unlock IAP — ship with Animals + Basic Shapes free, sell other 3 as $0.99 each or $2.49 bundle

### P2 — Retention Features
- [ ] LocalStorage / Capacitor Preferences for saving progress (currently in-memory, resets on close)
- [ ] Daily challenge — one random puzzle per day, streak counter
- [ ] Sound effects (Tone.js or native audio) — snap, win, hint
- [ ] Piece rotation mechanic (optional hard mode variant)
- [ ] Tutorial/onboarding for first-time players

### P3 — Content & Polish
- [ ] More categories: letters/alphabet, numbers, flags, emojis, holiday themes
- [ ] Piece color contrast — ensure neighboring pieces always have distinct colors
- [ ] Target shape silhouette outline on board (faint preview of what you're building)
- [ ] Animated shape reveal on win — borders dissolve, clean silhouette glows
- [ ] Share result screenshot
- [ ] Leaderboard (time-based or move-based scoring)

### P4 — Growth
- [ ] ASO (App Store Optimization) — screenshots, description, keywords
- [ ] Web version on Netlify as free demo / funnel to app store
- [ ] Social sharing ("I completed Cat in 12 seconds!")
- [ ] Push notifications for daily challenge reminder

## Design Decisions & Constraints
- **No emoji anywhere.** All icons are inline SVG with `currentColor`. The category icons (paw, fork, car, columns, shapes) are hand-crafted SVG paths in the `ICONS` object.
- **No external dependencies** beyond GSAP + Outfit font (both CDN). The game works offline after first load.
- **Dark/light theme** via CSS custom properties. ~30 variables in `:root` and `[data-theme="light"]`. Toggle persists per session only (no localStorage yet).
- **Win bar is minimal** — just 3 icon buttons (→ ↺ ☰), no text overlay or card. Particles + cell glow are the celebration.
- **Menu is a carousel**, not a list. Swipe left/right or tap arrows. Shows shape silhouette preview, progress counter, level dots.
- **Cell size:** 32px + 2px gap = 34px step. Tray pieces: 22px. Board padding: 10px.
- **Finger offset:** Ghost floats 70px above touch point so thumb doesn't cover piece.
- **Grid snap:** `Math.round((freePos - boardRect - 10) / STEP)` with 30% magnetic blend toward grid when over board.
