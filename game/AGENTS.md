# Rev's Day Off — Agent Guide

## Scope and workflow

- Keep project edits inside `game/` unless the user explicitly expands the scope. Do not change the sibling Express application or repository-root dependencies for game work.
- Inspect the current code and working-tree changes before editing. Preserve the user's changes, including title-screen artwork and leaderboard work.
- Treat the decisions below as the established behavior, not restrictions against future explicit user requests.
- Complete authorized implementation and appropriate verification without repeatedly asking for confirmation. Ask when a product decision materially changes the task.
- Report what changed, what was verified, and any unverified behavior. Do not claim browser verification from a successful build alone.

## Project and architecture

This is a top-down Texas A&M game starring Reveille. Players explore Aggie locations, sniff out hidden loot, complete timing challenges, and sell finds at the Good Bull shop.

- JavaScript ES modules, KAPLAY, and Vite. Use the installed KAPLAY declarations/source when checking engine behavior.
- `src/main.js` initializes assets and scenes. Preserve its current title and leaderboard registration workflow.
- `src/maps.js` owns map definitions and travel helpers; `src/landscapes.js` draws park/drill terrain; `src/field.js` draws Kyle Field.
- `src/scenes/map.js` registers the campus selector (`mapSelect`) and shared playable scene (`explore`). Do not confuse the selector with the old single-map gameplay scene.
- `src/objects/player.js` owns movement and obstacle resolution.
- Bevo pushback follows a server-resolved route over 0.25 seconds with quadratic ease-out; keep the 0.5-second stun. Player snapshots carry knockback metadata so local/remote rendering and late joiners follow the same motion. Never assign the hit endpoint immediately. Complete local playback in the independent heartbeat too, so background tabs cannot resend a pre-hit position.
- `src/presence.js` consumes current Socket.IO room snapshots keyed by socket ID; `src/multiplayer.js` renders remote players in outdoor scenes. Use `VITE_NETWORK_SERVER_URL` (default `http://localhost:3001`) and disconnect in the shop. Show peers immediately and remove IDs missing from snapshots; do not use history counts or expiry timers. The user explicitly authorized Express fixes for the snapshot migration; future unrelated Express edits still require expanded scope.
- Drill Field's shared Bevo is server-authoritative: `express/server.js` owns one `const bevo`, and `express/bevo.js` simulates its movement and combat. `src/bevo-state.js` accepts snapshots and sends intent; `src/bevo.js` renders them. Keep map collision geometry in `src/world-geometry.json` and tuning in `src/bevo-rules.json` shared with Express. E near the available marker summons instead of biting. Active combat cancels digs without penalties and blocks bags, sniffing, and shop entry; Esc still leaves. Boss hits knock back/stun, never steal. Empty Drill Field resets the encounter; defeat allows resummoning after 30 seconds with no rewards. Express changes for this encounter were explicitly authorized.
- `src/loot.js` owns generation and challenge state; `src/loot-ui.js` renders its effects and HUD.
- `src/items.js` is the canonical item/rarity catalog. `src/session.js` owns inventory, coins, reset behavior, and sales.
- `src/shop.js` owns exterior geometry and entrance interaction. The interior is `src/scenes/shop.js`; selling logic/UI live in `src/selling.js` and `src/selling-ui.js`.
- Keep state calculations testable independently of KAPLAY rendering. Avoid duplicating catalog, map, or shop constants across scenes.

## Movement and visuals

- WASD and arrow keys provide instant eight-direction movement at 300 world pixels/second. Normalize diagonals and cancel opposing inputs.
- Holding X while exploring sniffs at half speed. Challenges and selling menus lock movement.
- Keep the full player footprint inside map bounds and out of solid obstacles. Resolve axes separately to permit sliding; prevent tunneling during long frames.
- Use the 960 × 540 logical viewport with window scaling and nearest-neighbor pixel rendering. The camera follows directly, clamps at map edges, and centers axes smaller than the viewport.
- Keep HUDs and modal interfaces fixed to the screen. Reset or initialize camera position on scene transitions.
- Match flat, top-down, handheld-RPG pixel art. The user rejected the shop's angled 3D/isometric appearance; use the flat `good-bull-2d.png` exterior with a bottom-facing door.
- Preserve source artwork and previous variants unless replacement/deletion is requested. Store project assets under `public/sprites/`; do not reference generated assets only from an external generation directory.
- When generating bitmap artwork, use an available image-generation skill/tool, inspect the result at game scale, preserve transparency, and document its prompt and source reference in the README.

### Sprite pitfalls

- `Reveille.png` has eleven 32 × 32 frames, displayed at 64 × 64: down 0–2, up 3–5, left 6–8, right 9–10. The side directions are separate animations; do not combine or mirror them.
- Start facing down. Idle frames: down 0, up 3, left 6, right 6 mirrored horizontally. This idle-only mirroring is intentional because frames 9–10 are walking poses. Clear the flip before any walking animation. Prefer horizontal facing for diagonals and avoid restarting a walking animation every frame.
- Inspect sprite sheets before configuring them. Ring and towel artwork each contain four horizontal frames; most other item assets are single frames.
- KAPLAY interprets square brackets as styled-text markup. Use plain text or properly supported formatting for dynamic labels.
- The A&M SVG needs explicit root dimensions for texture loading. Preserve its paths and colors.
- Prefer `setCamPos()` over deprecated `camPos()`.

## Maps and shop

| Map ID | Name | World size |
| --- | --- | --- |
| `kyle-field` | Kyle Field | 1440 × 640 |
| `aggie-park` | Aggie Park | 1920 × 960 |
| `drill-field` | Drill Field | 1080 × 480 |

- The selector is a stylized A&M campus overview with clickable pins, arrow-key selection, and Enter to explore. It remembers the last visited map.
- Play starts a new session and opens the selector. Esc during exploration returns to the selector without clearing inventory or coins. The selector offers Back to Title.
- Kyle Field has football markings, maroon end zones, and the midfield A&M logo. Aggie Park has blocking pond/tree trunks/benches and connected paths. Drill Field represents a smaller Simpson Drill Field lawn.
- Every map uses the same shop position `(24, 24)`, footprint `160 × 180`, doorway `(104, 204)`, and return spawn `(104, 252)`. Use the shared `SHOP` constant for collision geometry and interaction radius.
- Keep terrain clear of the shop corner, spawn, and approach. Loot and the shop must remain reachable.
- Pass the originating map ID into the shop. Space at its interior exit or Esc with selling closed returns to `explore` on that same map, never to a hard-coded Kyle Field or directly to the selector.

## Loot, inventory, and economy

- Generate 12 hidden spots on every playable-map entry, including shop returns. Use bounded sampling plus a finite fallback.
- Spots stay 64 pixels from edges and solid obstacles, 140 pixels apart, and clear of the shop entrance. Account for all map obstacles.
- Holding X shows hints for the nearest uncollected spot: beyond 200 pixels, “Not close.”; within 200, “You're close!”; within 40, start the challenge with “You're here!”. Use scent effects with the existing Reveille art.
- `src/sniffing-ui.js` shares the Sniffing label and scent particles between local and remote players. Sync the sniffing boolean through join/position snapshots, including stationary state changes. Digging takes priority over sniffing; suppress sniffing while the bag is open.
- The circular challenge uses a six-second limit and a fresh Space press to stop the pointer in the highlighted arc. Rotation uses elapsed time; hit detection handles angular wraparound and includes boundaries.
- Success awards once and removes the spot. Misses, timeouts, and cancellation retain the same item. Require releasing X after an attempt before retrying. Esc cancels a challenge before navigating away.
- Dig-start/finish callbacks announce the timing challenge, not ordinary sniffing. Successful finds create a non-blocking five-second dirt effect at the loot spot; failures/cancels only clear digging. `sniffing` carries an active boolean into the room snapshot's `digging` flag. `dug-up` relays coordinates and a server-derived socket ID to peers only; suppress self echoes and do not replay offline finds. Express changes for these digging events were explicitly authorized.
- Gate shop interactions during sniffing/challenges/results so Space cannot both stop a spinner and enter the shop.
- A miss or timeout (not a cancel) spawns a senior cadet via the loot controller's `onFail`; `triggersCadet()` in `src/loot.js` is the single rule. `src/objects/cadet.js` owns spawning, marching, and the E bite. Cadets freeze during challenges. On contact a cadet takes one random bag item via `stealItem()` in `src/session.js` (never coins) and leaves.
- Inventory, coins and upgrades are saved in localStorage by `src/session.js` and kept across maps, shop visits, new games and reloads. Play only resets the map.
- `src/upgrades.js` is the upgrade catalog (prices and effects) and buying logic; the stand and its menu live in the shop scene and `src/upgrades-ui.js`. Each upgrade is bought once. The crown and toothbrush are sent on `join_room`; the server shows the crown to the room and applies the toothbrush multiplier to Bevo bites in `express/bevo.js`, which must match `TOOTHBRUSH_MULTIPLIER` in `src/upgrades.js`.
- `src/music.js` owns background music: `TRACKS` lists the files in `public/sounds/` (keep names lowercase; Vercel is case-sensitive) and `musicFor()` picks a track per scene and map (the Bevo fight theme replaces the Drill Field track while he is active; `bevo-roar` plays as he spawns and at each charge; `item-get` plays on a successful dig and `chomp` on each bite). Every scene calls `setSceneMusic()` first, and the explore scene calls it again on each Bevo state; shared tracks keep playing across scenes and changes crossfade. M mutes (ignored on the name screen), saved in localStorage.
- Roll rarity first, then select uniformly among items in that tier. Item rarity is fixed, not rolled independently of item type.

| Rarity | Chance | Pointer speed | Target arc | Sale price |
| --- | ---: | ---: | ---: | ---: |
| Common | 60% | 120°/second | 90° | 5 coins |
| Rare | 25% | 180°/second | 60° | 20 coins |
| Epic | 12% | 240°/second | 40° | 50 coins |
| Legendary | 3% | 300°/second | 24° | 150 coins |

- Legendary: Aggie Ring. Epic: Century Tree Branch. Rare: Marcel Reed Jersey and 12th Man Towel. Common: A&M T-shirt, A&M Hat, and Maroon Meal.
- Do not add Good Bull Section; the user explicitly excluded it.
- Space below the interior counter opens selling. Group duplicates by canonical item ID and show quantity and unit price. Support mouse selection, Up/Down, Enter for Sell One, and A for Sell All.
- Sales are immediate at the displayed price/total. Update inventory and coins together, preserve shared inventory references, and prevent repeat awards after depletion. Resolve prices from the canonical catalog rather than inventory metadata.
- Disable empty-bag sale actions and maintain a valid selection after removing a row. Esc closes the selling menu first; while open, movement and exit interaction remain blocked.

## Verification

Run commands from `game/`:

```powershell
node --test tests/*.test.js
npm.cmd run build
npm.cmd run dev -- --host 127.0.0.1
```

- On Windows PowerShell, use `npm.cmd` if script execution policy blocks `npm.ps1`. The configured development port is 3000.
- Add focused behavioral tests for changes to movement, generation, timing, economy, or scene routing. Use controlled randomness for loot tests and check reachability when changing terrain.
- Browser-check visual changes and scene interactions. Existing development-only fixtures are `/tests/loot-preview.html`, `/tests/selling-preview.html`, and `/tests/maps-preview.html`.
- Keep fixtures aligned with production catalog/scene APIs. Their seeded inventories and controls must stay outside the production entry point.
- Run `git diff --check` and confirm the changed files remain within the authorized scope. Do not edit generated `dist/` bundles or `node_modules/` as implementation source.