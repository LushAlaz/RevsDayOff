# Folder structure

- `src` - source code for your kaplay project
- `dist` - distribution folder, contains your index.html, built js bundle and static assets


## Development

### Good Bull shop

The compact flat 2D RPG shop is in the top-left corner of Kyle Field. Walk to
its bottom-center entrance and press **Space** when **Space: Enter Shop** appears.
The building base blocks movement. Inside, walk around the counter and shelves;
press **Space** near the right-hand exit, or **Esc** anywhere, to return below
the field entrance. Buying items is not implemented yet.

`public/sprites/good-bull-2d.png` was created with the built-in image generator,
using `public/sprites/good-bull-preview.png` as the reference and transparency enabled.
Final prompt:

> Create a small original 2D top-down RPG shop sprite using the reference ONLY for Good Bull identity and colors. Style: classic 16-bit handheld monster-catching RPG town building, deliberately flat tile-based pixel art. STRICT straight-on orthographic view from slightly overhead: rectangular visible gray tiled roof above a short dark navy front wall; ALL roof/front edges horizontal or vertical except tiny symmetric roof eaves. Absolutely NO isometric view, NO angled side wall, NO perspective convergence, NO diagonally slanted facade, NO 3D rendering, NO gradients, NO realistic lighting. Front door centered on bottom edge facing down toward player, cream GOOD BULL sign on front above doorway, small matching windows on both sides. Simple shapes, crisp chunky square pixels, limited navy gray cream maroon palette and 2 or 3 flat tones per material. It must read clearly when displayed at 160x180 game pixels, like a native low-resolution 80x90 sprite enlarged with nearest-neighbor. Transparent alpha background, tightly framed entire single building including roof and narrow foundation, centered, no characters, no grass or sky or background, no scenery. Keep exact text GOOD BULL; omit secondary message board. Main goal: replace the previously overly 3D building with convincing FLAT 2D RPG pixel art.

The earlier `good-bull-right.png` and original preview remain available but are
not used for the current exterior. The building occupies 160 by 180 world pixels;
its doorway is at (104, 204), and returning from the shop spawns Reveille at
(104, 252), safely below its solid base.

### Field controls

Select **Play** to enter the Kyle Field movement test area as Reveille.
Move with **WASD** or the **arrow keys**. Reveille uses the eleven-frame
`public/sprites/Reveille.png` sheet at 64 × 64 world pixels, with walking
animations at 8 FPS. Left uses frames 6–8 and right uses frames 9–10, without mirroring;
diagonals face
horizontally. Releasing movement returns to an idle pose facing the last direction.
**W / Up arrow** moves up and **S / Down arrow** moves down. Field hash marks
provide a visible reference while the camera follows vertical movement.
Press **Esc** to return to the title. Movement stops immediately when released,
and diagonals travel at the same 300 pixels/second as cardinal directions.
The compact field is 1440 × 640 world pixels, including two 120-pixel maroon
end zones. It has alternating turf bands, five-yard lines, one-yard hashes,
mirrored yard numbers, orange pylons, and an A&M logo at midfield.
The camera view is 960 × 540. It follows Reveille directly and stops at the map edges.
The HUD stays fixed on screen, and the full player sprite stays inside the map.
Resizing the window scales the view without changing world dimensions.

The midfield logo artwork is stored at `public/sprites/tam-maroon.svg`,
from [Texas A&M's official logo downloads](https://marcomm.tamu.edu/template/logo-downloads/)
(TAM Maroon SVG, RGB).
Explicit 216-pixel dimensions are added to the SVG root for game texture loading;
the logo paths and colors are unchanged.

### Movement verification

- Run `node --test tests/*.test.js` for movement and camera boundary checks.
- Run `npm run build` to verify the production bundle.
- In `npm run dev`, check both key layouts, diagonal movement, opposing keys,
  immediate stopping, all four field edges, and resizing the browser. Check that
  the camera follows immediately, stops at map edges, and keeps the HUD on screen.
- Return to the title and press Play several times; confirm one player appears
  and its movement speed stays the same. The title should remain centered and
  the field camera should start at the player each time.

```sh
$ npm run dev
```

will start a dev server at http://localhost:3000

## Distribution

```sh
$ npm run build
```

will build your js files into `dist/`

```sh
$ npm run zip
```

will build your game and package into a .zip file, you can upload to your server or itch.io / newground etc.
