# Multiplayer presence

Outdoor maps show other connected players as Reveille sprites. Players share a
room only when exploring the same map. Press **E** to chomp: nearby clients see a
brief CHOMP effect at the transmitted location. Remote players have no collision
or effect on local loot, inventory, or cadets. The shop remains private.

Run the existing Express server on port 3001, then run `npm.cmd run dev` here.
The game uses Socket.IO over WebSocket with `http://localhost:3001` by default.
For another server, set `VITE_NETWORK_SERVER_URL` in `game/.env.local` and restart
Vite (or set it before building). Use an HTTPS server URL for an HTTPS game page.
If the server is unavailable, single-player gameplay continues; the client retries.

The server sends current room snapshots as
`{ room: { [socketId]: { x, y, direction, digging, sniffing } } }`. The dictionary key identifies
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
