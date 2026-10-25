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
`{ room: { [socketId]: { x, y, direction } } }`. The dictionary key identifies
each player; no separate ID-fetch event is necessary. Players appear on the
first snapshot and disappear on the next snapshot when they leave or disconnect.
Stationary players stay visible. Server records are updated in place and removed
on departure, so movement does not accumulate position history.

Chomp messages contain coordinates but no player ID. The game places effects at
the supplied coordinates rather than guessing an owner. Malformed positions and
directions are ignored. The game requires the snapshot version of the server;
the previous append-only protocol is no longer supported.

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
