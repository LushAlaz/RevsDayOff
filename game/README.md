# Folder structure

- `src` - source code for your kaplay project
- `dist` - distribution folder, contains your index.html, built js bundle and static assets


## Development

Select **Play** to enter the Kyle Field movement test area. The bean sprite is
a temporary stand-in for Reveille. Move with **WASD** or the **arrow keys**;
press **Esc** to return to the title. Movement stops immediately when released,
and diagonals travel at the same 300 pixels/second as cardinal directions.
The field scales with the window and keeps the full player sprite inside its edges.

### Movement verification

- Run `node --test tests/player.test.js` for movement and boundary checks.
- Run `npm run build` to verify the production bundle.
- In `npm run dev`, check both key layouts, diagonal movement, opposing keys,
  immediate stopping, all four field edges, and resizing the browser.
- Return to the title and press Play several times; confirm one player appears
  and its movement speed stays the same.

```sh
$ npm run dev
```

will start a dev server at http://localhost:8000

## Distribution

```sh
$ npm run build
```

will build your js files into `dist/`

```sh
$ npm run zip
```

will build your game and package into a .zip file, you can upload to your server or itch.io / newground etc.
