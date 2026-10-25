# Rev's Day Off

A pixel art browser game starring Reveille. Explore Texas A&M landmarks, sniff out hidden Aggie treasures, and sell your finds for coins at the Good Bull shop.

Built with JavaScript, [KAPLAY](https://kaplayjs.com/), and Vite.

## How to play

1. Select **Play** and read the intro, or press **Esc** to skip it.
2. Choose **Kyle Field**, **Aggie Park**, or **Simpson Drill Field** on the campus map.
3. Explore as Reveille. Hold **X** to sniff for buried items and follow the scent hints. Sniffing slows your movement.
4. When you find a spot, a timing challenge begins. Press **Space** when the pointer reaches the green target to collect the item. Rarer treasures are harder to collect and worth more coins.
5. Visit the **Good Bull shop** in the top-left corner of any map. Press **Space** at the entrance, then approach the counter and press **Space** again to sell your finds.
6. Keep exploring, collecting, and selling. Press **Esc** while exploring to choose another map.

Your bag and coins carry over between maps and shop visits. Starting a new game or reloading the page resets your progress. Saving, buying upgrades, online multiplayer, and the leaderboard are not implemented yet.

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
| Stop the treasure challenge pointer | Space |
| Enter the shop / interact with the counter | Space |
| Select a map | Click, or arrow keys and Enter |
| Sell one selected item | Enter in the selling menu |
| Sell everything in your bag | A in the selling menu |
| Return / close a menu / cancel a challenge | Esc |

## Project structure

```text
game/
  src/             Game logic, scenes, player, maps, and shop
  public/          Sprites, fonts, and sounds
  tests/           Automated checks and browser previews
express/
  server.js        Express and Socket.IO backend scaffold
```

The browser game runs independently of the backend; you only need to start `game/` to play.

## Build and check

Run these commands inside `game/`:

```sh
npm run build                 # Build into dist/
npm run preview               # Serve the production build locally
node --test tests/*.test.js    # Run automated checks
```
