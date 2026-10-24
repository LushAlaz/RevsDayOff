# Folder structure

- `src` - source code for your kaplay project
- `dist` - distribution folder, contains your index.html, built js bundle and static assets


## Development

### Sniffing and hidden loot

Hold **X** on Kyle Field to sniff while moving at half speed. Scent particles and
distance hints guide you toward the nearest hidden item: **Not close.** beyond
200 world pixels, **You're close!** within 200, and **You're here!** within 40.
Releasing X restores normal movement. Each field entry creates 12 new hidden
spots, including returning from the shop; collected items remain in your bag.

Finding a spot while sniffing opens a circular timing challenge. Movement and
shop entry pause. Press **Space** when the white pointer is in the green target
arc; you have six seconds. **Esc** cancels the attempt. Success collects the item
and removes that spot. A miss, cancellation, or timeout keeps the same reward at
the spot. Release X after an attempt before sniffing again.

| Rarity | Chance | Spinner speed | Target arc |
| --- | ---: | ---: | ---: |
| Common | 60% | 120 degrees/second | 90 degrees |
| Rare | 25% | 180 degrees/second | 60 degrees |
| Epic | 12% | 240 degrees/second | 40 degrees |
| Legendary | 3% | 300 degrees/second | 24 degrees |

Rarity is rolled first, then an item is selected uniformly from that tier. Each
item has one fixed rarity, which determines its timing challenge and sale price.
The HUD shows coins, bag count, and the latest find. Inventory and coins survive
shop visits and reset on a new Play from the title or browser reload.

### Selling loot

Walk below the shop counter and press **Space** at the **Space: Sell items** prompt.
Select a row with the mouse or **Up/Down**, then click **Sell One** or press **Enter**.
Click **Sell All** or press **A** to sell the entire bag at its displayed total.
Sales are immediate. **Esc** or the menu's **X** button closes it; Esc outside the
menu returns to the field. Movement and the exit interaction pause while selling.
Duplicate items share a row; quantities and coin balances update after each sale.

| Item | Fixed rarity | Coins each |
| --- | --- | ---: |
| Aggie Ring | Legendary | 150 |
| Century Tree Branch | Epic | 50 |
| Marcel Reed Jersey | Rare | 20 |
| 12th Man Towel | Rare | 20 |
| A&M T-shirt | Common | 5 |
| A&M Hat | Common | 5 |
| Maroon Meal | Common | 5 |

Good Bull Section is not in the loot catalog. Buying items is deferred.
Open `/tests/selling-preview.html` on the dev server for a populated menu with all
seven item types and a duplicate ring. The preview can refill its test bag or open
the actual shop; it is not included in the production entry point.

`public/sprites/century-tree-branch.png` was created with the built-in image generator,
referencing `public/sprites/aggie-tshirt.png` for the pixel-art style, with transparency enabled.
Final prompt:

> Create a single transparent pixel-art inventory icon of a Century Tree Branch for a Texas A&M-themed top-down 2D RPG. Match the supplied shirt icon's crisp chunky low-resolution pixel-art style and limited palette, like a native 32 by 32 sprite enlarged with nearest-neighbor. Subject: one small brown live-oak twig angled from lower left to upper right, branching into two tips, with three clusters of green oak leaves. Simple readable silhouette, flat 2-tone shading, dark pixel outline, earthy brown and muted leafy green. Entire icon centered in a square canvas with a small transparent margin. Actual alpha transparency. No text, no frame, no background, no ground, no extra objects, no gradients, no 3D rendering. Only one branch icon, not a sprite sheet.

For repeatable visual QA, open `/tests/loot-preview.html` on the dev server.
Its buttons select a known nearby spot of each rarity, and **Show reward** renders
a completed Legendary ring reward. This preview is not included in the production
entry point. Use `node --test tests/*.test.js` for the automated checks.

### Good Bull shop

The compact flat 2D RPG shop is in the top-left corner of Kyle Field. Walk to
its bottom-center entrance and press **Space** when **Space: Enter Shop** appears.
The building base blocks movement. Inside, walk around the counter and shelves;
press **Space** near the right-hand exit, or **Esc** with the selling menu closed, to return below
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
