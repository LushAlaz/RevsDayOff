# Folder structure

- `src` - source code for your kaplay project
- `dist` - distribution folder, contains your index.html, built js bundle and static assets


## Development

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
