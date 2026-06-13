# Block Puzzle Game

A mobile-first block puzzle game where you drag colored pieces onto a grid to recreate silhouettes of animals, food, vehicles, structures, and shapes. Think **tangram meets pixel art**.

Built as a single, dependency-light HTML file — open it in any browser and play. No build step.

## How to Play

1. **Pick a mode** from the menu carousel:
   - **Category mode** — work through 10 levels per category, with difficulty ramping up automatically.
   - **Quick Play** — a random shape with a difficulty (Easy / Medium / Hard) you choose yourself.
2. A target silhouette is split into several colored pieces, shown in the tray below the board.
3. **Drag each piece** onto the grid. The piece snaps to the grid with a magnetic pull:
   - **Green highlight** = valid placement
   - **Red highlight** = invalid (the board shakes if you drop it there)
4. **Fill every cell** of the silhouette to win. A particle burst and glow celebrate the completion, then you can go to the **next level**, **retry**, or return to the **menu**.

### Hints

Stuck? Tap the hint button to pulse the correct position of an unplaced piece (and its matching tray piece). Hints are limited per level (1–3 depending on difficulty) and auto-clear after a few seconds.

## Game Behavior

### Categories & Shapes

5 categories × 10 shapes each (50 puzzles total):

| Category     | Color     | Shapes                                                                 |
|--------------|-----------|------------------------------------------------------------------------|
| Animals      | `#06d6a0` | Fish, Bird, Cat, Dog, Bunny, Turtle, Duck, Whale, Snake, Elephant      |
| Food         | `#ff6b6b` | Apple, Cherry, Banana, Ice Cream, Pizza, Donut, Burger, Cake, Cupcake, Candy |
| Vehicles     | `#4dabf7` | Car, Bus, Boat, Plane, Rocket, Train, Helicopter, Bicycle, Truck, Submarine |
| Structures   | `#ffd43b` | Pyramid, House, Castle, Church, Lighthouse, Windmill, Bridge, Pagoda, Tower, Arch |
| Basic Shapes | `#cc5de8` | Square, Triangle, Diamond, Heart, Cross, Arrow, Star, Hexagon, Moon, Lightning |

### Difficulty Progression (Category Mode)

| Levels | Difficulty | Pieces | Hints |
|--------|------------|--------|-------|
| 1–3    | Easy       | 3–4    | 1     |
| 4–6    | Medium     | 5–7    | 2     |
| 7–10   | Hard       | 8–14   | 3     |

### Piece Decomposition

Each shape is defined as a small ASCII grid (`#` = filled, `.` = empty). A **seeded region-growing algorithm** splits the silhouette into N connected pieces:

1. Picks N seed cells spread far apart.
2. Grows each piece simultaneously via round-robin BFS.
3. Assigns leftover cells to the nearest piece.

A **seeded PRNG** means the same shape + difficulty + seed always produces identical pieces — puzzles are deterministic and reproducible.

### Drag & Drop

- Built on the **Pointer Events API** (works with both mouse and touch).
- The dragged piece floats ~70px above your finger so your thumb doesn't cover it.
- 30% magnetic pull toward the grid when hovering over the board, free-follow otherwise.
- `Math.round` snapping for intuitive grid alignment.

### Theme

Full **light/dark theme** via ~30 CSS custom properties. Toggle in the top-right corner with an animated spin. (Theme persists per session only.)

## Tech Stack

- **Single file:** [block-puzzle.html](block-puzzle.html) — all HTML, CSS, and JS in one ~750-line file.
- **Vanilla JavaScript** — no framework, no bundler.
- **[GSAP 3.12.5](gsap.min.js)** — drag ghosts, hint pulses, win celebrations, theme transitions.
- **Outfit** font (Google Fonts CDN).
- **CSS custom properties** for theming.
- **No build step** — works offline after the first load.

Designed to be wrapped with **Capacitor** for Android/iOS distribution.

## Running It

Just open the file in a browser:

```bash
# any static server, or simply double-click the file
python -m http.server
# then visit http://localhost:8000/block-puzzle.html
```

## Roadmap

Planned work (see [HANDOFF.md](HANDOFF.md) for full detail):

- **Mobile ship** — Capacitor wrapper, AdMob (banner / interstitial / rewarded), haptic feedback, Google Play release.
- **Monetization** — ad-free IAP, category-unlock IAP.
- **Retention** — persistent progress (LocalStorage / Capacitor Preferences), daily challenge + streaks, sound effects.
- **Content & polish** — more categories, silhouette outline preview, animated win reveal, sharing, leaderboards.

## Design Notes

- **No emoji** — all icons are hand-crafted inline SVG using `currentColor`.
- **No external dependencies** beyond GSAP and the Outfit font.
- **Menu is a swipe carousel**, not a list — shows a shape preview, progress counter, and level dots.
- Cell size 32px + 2px gap; tray pieces 22px; board padding 10px.
