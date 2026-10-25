# Rev's Day Off

A pixel art browser game starring Reveille. Explore Texas A&M landmarks, sniff out hidden Aggie treasures, and sell your finds for coins at the Good Bull shop.

Built with JavaScript, [KAPLAY](https://kaplayjs.com/), and Vite.

## Run locally

Install a recent Node.js LTS release and npm, then run from the repository root:

```sh
cd game
npm install
npm run dev
```

Open the local URL printed in the terminal (normally `http://localhost:3000`). Select **Play**, advance through the intro or skip with **Esc**, then choose a map.

## Controls

| Action | Control |
| --- | --- |
| Move | WASD or arrow keys |
| Sniff for hidden loot | Hold X |
| Dig / interact with the shop | Space |
| Select a map | Click, or arrow keys and Enter |
| Return / close a menu / cancel a challenge | Esc |

Explore Kyle Field, Aggie Park, and Simpson Drill Field. Follow scent hints, complete timing challenges to collect loot, and sell items at the shop. Coins and inventory last for the current session; starting a new game or reloading resets them.

## Project structure

```text
game/
  src/             Game logic, scenes, player, maps, and shop
  public/          Sprites, fonts, and sounds
  tests/           Automated checks and browser previews
express/
  server.js        Express and Socket.IO backend scaffold
```

The browser game runs independently of the backend. Online multiplayer and the leaderboard are not implemented yet.

## Build and check

Run these commands inside `game/`:

```sh
npm run build                 # Build into dist/
npm run preview               # Serve the production build locally
node --test tests/*.test.js    # Run automated checks
```

See [game/README.md](game/README.md) for detailed gameplay and development notes.
