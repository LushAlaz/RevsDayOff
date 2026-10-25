# Multiplayer presence

Outdoor maps show other connected players as Reveille sprites. Players share a
room only when exploring the same map. Press **E** to chomp: nearby clients see a
brief CHOMP effect at the transmitted location. Remote players have no collision
or effect on local loot, inventory, or cadets. The shop remains private.

Cadets chasing another player are visible to everyone on that map. Only misses
and timeouts summon your own cadets; other players' cadets cannot chase you,
steal your items, or be bitten by you. The owner's game controls the chase and
shares cadet positions, facing, and movement state, including challenge pauses.
Remote copies disappear when bitten, after a catch, or when their owner leaves.
Late joiners see current cadets, and reconnecting owners republish active chases.

## Bevo boss

Drill Field has one shared Bevo encounter per Express server process. Approach
the gold marker at `(780, 240)` and press **E** to summon him. This consumes the
press; otherwise E retains its bite behavior. Everyone in Drill Field sees the
same **300 HP**. Bites within 112 pixels deal 10 damage, with a 0.4-second
per-player cooldown. Bevo is invulnerable during his two-second arrival.

The server controls chasing, targeting, charge warnings, charges, recovery,
damage, and defeat. Bevo chases at 120 pixels/second for three seconds, winds up
for 0.8 seconds, charges at 450 pixels/second for up to 0.8 seconds, then recovers
for 1.2 seconds. His red charge line shows the server's aim; the charge direction
locks when the charge starts. Trees, the shop, and map edges stop charges.
Contact while chasing or charging pushes players back up to 96 pixels over
0.25 seconds, starting quickly and easing to a stop. The collision-resolved
route is simulated by the server and rendered smoothly for both the struck
player and observers, including late joiners. Terrain and boundaries limit the
push. Hits stun players for 0.5 seconds and grant 1.5 seconds of hit immunity. A charge hits each
player at most once. No inventory items or coins are taken.

Summoning cancels active digs without a cadet penalty, closes bags, and blocks
digging, bags, and shop entry while the boss is active. Esc still leaves the map.
Defeat gives a shared victory message and a 30-second resummon cooldown, with
no rewards. When everyone leaves Drill Field, the encounter immediately resets.
Late joiners and reconnecting players receive the current encounter. A server
restart resets it; multiple server processes do not share boss state. Offline
play has no boss summon, and cadets continue using their existing local rules.

`express/server.js` owns the single `const bevo` object. `express/bevo.js` updates
it at 20 ticks/second and publishes at 10 updates/second plus state transitions
and damage. Terrain comes from `src/world-geometry.json`; boss tuning comes
from `src/bevo-rules.json`, both shared with the client. Players' ordinary
movement remains client-controlled; the server uses their latest accepted
positions for combat. This is not a general movement anti-cheat system.

Boss requests are `bevo_summon` and `bevo_bite`, each carrying only
`{ encounterId }`. The server derives identity and room from the socket and
validates encounter, phase, range, cooldown, and stun. `bevo_state` includes
`encounterId`, increasing `sequence`, `phase`, `x`, `y`, `facing`, `hp`, `maxHp`,
`target`, `chargeDirection`, `phaseEndsAt`, `resummonAt`, and `serverNow` (times
are server-monotonic seconds). `bevo_hit` goes to the struck player and carries
`{ encounterId, hitId, fromX, fromY, x, y, startedAt, duration, stunDuration, path }`.
The path is the server-resolved route; `x, y` are its endpoint, not an immediate
teleport. The server advances the player along it with quadratic ease-out at
20 ticks/second and broadcasts these intermediate positions. Room snapshots
include `serverNow` and a player `knockback` record until the stun ends, allowing
late joiners to display the remaining movement. Normal position updates cannot
override the shove or its endpoint during stun. Clients discard duplicate and
stale hits without restarting the animation or extending stun. The independent
heartbeat completes local pushback even when background rendering is paused.
Deploy/restart Express together with the game update to enable this protocol.

For two-browser checks, open `/tests/bevo-preview.html` and
`/tests/bevo-preview.html?observer`. They run the production scenes and add only
development navigation buttons. Check summon, shared HP, charge warnings,
knockback, bags/shop restrictions, victory, leaving, and late joining. These
controls are not imported by the production entry point. The movement trace
button reports actual rendered player positions and timestamps, making the
intermediate shove frames visible without modifying combat or movement.

### Bevo artwork

`public/sprites/bevo-boss.png` is a transparent four-column/four-row directional
walk sheet made with built-in imagegen from the preserved
`public/sprites/bevo-preview.png`. Rows face down, up, left, and right. It is
displayed in a 128-pixel square with transparent padding; collision radius is 40.
The final sheet was visually checked in the game.

Initial edit prompt: "Edit target: existing Bevo pixel-art game sprite sheet.
Produce a clean transparent production sprite sheet, 1024x1024, exactly 4 columns
and 4 rows of equal 256x256 cells. Preserve the existing orange/brown longhorn
character, cream horns and muzzle, dark hooves, red eyes, flat top-down handheld
RPG pixel style. Row 1 faces down; row 2 faces up; row 3 faces left; row 4 faces
right. Four subtle walk cycle poses per row. Remove all green background to
genuine alpha transparency. Center each complete bull within its own cell,
consistent scale, keep at least 12 pixels transparent padding on all four sides
of every cell; no horns, body or tail crossing cell edges or canvas edges. No
shadows, no text, no borders, no grids. This is a functional sprite sheet;
precise alignment and fully contained sprites are essential."

Alignment edit prompt: "Correct the sprite sheet layout only. Keep all 16 Bevo
pixel-art poses, colors, four directional rows and transparent background. Exact
4x4 evenly spaced grid. Reduce each individual bull to 72 percent of its present
size within its own cell, centered both horizontally and vertically, leaving
generous alpha-transparent padding around every bull on every side. No limbs,
horns or tails touching a cell edge. Same character style, no added elements.
Output square sprite sheet with 4 equal columns and 4 equal rows."

## Presence protocol and setup

Run the existing Express server on port 3001, then run `npm.cmd run dev` here.
The game uses Socket.IO over WebSocket with `http://localhost:3001` by default.
For another server, set `NEXT_PUBLIC_NETWORK_SERVER_DOMAIN` in `game/.env.local`
and restart Vite (or set it before building). Vite loads this file from `game/`
and exposes that specific variable to the Socket.IO client. An absent or empty
value uses `http://localhost:3001`. Production deployments must be rebuilt after
changing the value. Use an HTTPS server URL for an HTTPS game page.
If the server is unavailable, single-player gameplay continues; the client retries.

The server sends current room snapshots as
`{ room: { [socketId]: { x, y, direction, digging, sniffing, cadets } } }`. Each
cadet is `{ id, x, y, direction, moving }`; IDs are scoped to the socket owner.
The server validates complete lists (maximum 128) and derives ownership from
the connection. Movement updates are throttled to 10 per second; cadet additions
and removals send immediately on the next presence step. The dictionary key identifies
each player; no separate ID-fetch event is necessary. Players appear on the
first snapshot and disappear on the next snapshot when they leave or disconnect.
Stationary players stay visible. Server records are updated in place and removed
on departure, so movement does not accumulate position history.

Chomp messages contain coordinates but no player ID. The game places effects at
the supplied coordinates rather than guessing an owner. Malformed positions and
directions are ignored. The game requires the snapshot version of the server;
the previous append-only protocol is no longer supported.

Holding **X** while exploring shows **Sniffing...** and animated scent particles
on both your Reveille and other players' screens. Releasing X or opening the bag
stops sniffing. Its boolean state travels with position updates, including when
standing still and on reconnect. During the loot timing challenge, other players
see **Digging...** instead; the two indicators do not overlap.
A successful find leaves a small
pixel dirt burst and patch at the loot spot for five seconds, fading at the end.
Peers in the same map see the same effect and a brief **Dug something up!** label;
item names and rarities are not broadcast. Misses, timeouts, and cancellations
clear the status without leaving dirt. Effects clear when leaving the scene.

The `sniffing` event accepts `{ x, y, active }` and updates the player's `digging`
snapshot flag. The `dug-up` event accepts `{ x, y }`; the server relays
`{ id, x, y }` to other clients in the room, excluding the sender. Local effects
play immediately. Reconnection restores an ongoing digging status; finds made
while disconnected are not replayed. Restart Express after updating these handlers.

Each outdoor entry creates a fresh connection, including returning from the shop.
No connection is kept in the shop, title, or map selector. Coordinates and facing
are sent at up to 10 updates/second while changing and once/second while idle.

Checks: `node --test tests/*.test.js`, `npm.cmd run build`. Server protocol tests
start the actual Express application on an ephemeral local port and close it
afterward; dependencies must be installed in both `game/` and `express/`.

For the opt-in live protocol test, start Express and run in PowerShell:

```powershell
$env:NETWORK_TEST_URL = "http://localhost:3001"
node --test tests/presence-live.test.js
```

The live test creates three temporary clients in Kyle Field and Drill Field and
disconnects them afterward. It does not change server files. The map preview at
`/tests/maps-preview.html` can be opened in two browser windows to check sprites.
For deterministic digging checks, open `/tests/digging-preview.html` and
`/tests/digging-preview.html?observer` in separate windows. Start digging, then
Find item, Miss, or Cancel in the first window; Reset map prepares another attempt.
Toggle sniffing moves the preview player away from its known loot spot so you can
check sniffing separately from digging. These preview controls are not available
in the production game.
