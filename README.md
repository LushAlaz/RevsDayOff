# Rev's Day Off

A pixel art browser game starring Reveille. Explore Texas A&M landmarks, sniff out hidden Aggie treasures, and sell your finds for coins at the Good Bull shop.

Built with JavaScript, [KAPLAY](https://kaplayjs.com/), and Vite.

## How to play

1. Select **Play**. The first time, pick a **username** (3–16 letters, numbers or _) and a **display name** (up to 20 characters, shown under your dog to other players); they are saved in your browser. Then read the intro, or press **Esc** to skip it.
2. Choose **Kyle Field**, **Aggie Park**, or **Simpson Drill Field** on the campus map.
3. Explore as Reveille. Hold **X** to sniff for buried items and follow the scent hints. Sniffing slows your movement.
4. When you find a spot, a timing challenge begins. Press **Space** when the pointer reaches the green target to collect the item. Rarer treasures are harder to collect and worth more coins.
5. Visit the **Good Bull shop** in the top-left corner of any map. Press **Space** at the entrance, then approach the counter and press **Space** again to sell your finds.
6. Keep exploring, collecting, and selling. Press **Esc** while exploring to choose another map.

Your coins and bag sit in the bottom-right corner; click the bag or press **B** to see what you have dug up. Your bag and coins carry over between maps and shop visits. Starting a new game or reloading the page resets your progress. Saving and the leaderboard are not implemented yet.

### Upgrades

The **Upgrades** stand in the top-right of the Good Bull shop sells one-time upgrades. Walk up to it and press **Space**. Upgrades last until you start a new game.

| Upgrade | Price | Effect |
| --- | ---: | --- |
| Red Bull | 60 | Rev runs 25% faster |
| Four-Leaf Clover | 150 | Rarer loot shows up more often (Legendary 3% → 8%) |
| Toothbrush | 80 | Double chomp damage on Bevo |
| Royal Crown | 1000 | A crown on Rev's head that other players can see |

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
| Open or close your bag | B, or click the bag icon |
| Enter the shop / interact with the counter | Space |
| Talk to the ducks at the Aggie Park pond | Space on the bank near them |
| Read the barrel in the Good Bull shop | Space next to it |
| Select a map | Click, or arrow keys and Enter |
| Change your username or display name | N on the map screen |
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
