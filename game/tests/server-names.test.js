import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { once } from "node:events";
import { io as connectSocket } from "socket.io-client";
import { createPresence } from "../src/presence.js";

const require = createRequire(import.meta.url);
const network = require("../../express/server.js");

test("display names travel through the server to the rest of the room", { timeout: 15000 }, async (t) => {
    const sockets = [];
    const presences = [];
    t.after(async () => {
        for (const presence of presences) presence.dispose();
        for (const socket of sockets) socket.disconnect();
        await new Promise((resolve) => network.io.close(resolve));
    });
    network.server.listen(0, "127.0.0.1");
    await once(network.server, "listening");
    const url = `http://127.0.0.1:${network.server.address().port}`;
    const waitFor = async (condition) => {
        const deadline = Date.now() + 3000;
        while (!condition()) {
            if (Date.now() > deadline) throw new Error("Timed out waiting for snapshot");
            await new Promise((resolve) => setTimeout(resolve, 10));
        }
    };
    const join = async (local, profile) => {
        const socket = connectSocket(url, { transports: ["websocket"], autoConnect: false, forceNew: true });
        const presence = createPresence({ socket, mapId: "aggie-park", bounds: { left: 0, top: 0, right: 1920, bottom: 960 },
            getLocal: () => local, now: () => performance.now() / 1000, getProfile: () => profile });
        sockets.push(socket);
        presences.push(presence);
        socket.connect();
        await once(socket, "connect");
        return { socket, presence };
    };

    const ashi = await join({ x: 400, y: 300, direction: "down" }, { username: "rev_fan", displayName: "Ashi T" });
    const sneaky = await join({ x: 600, y: 300, direction: "left" }, { username: "x", displayName: "[red]hi" });
    const plain = await join({ x: 800, y: 300, direction: "up" }, {});
    await waitFor(() => plain.presence.records.has(ashi.socket.id) && plain.presence.records.has(sneaky.socket.id));

    const stored = network.rooms["aggie-park"];
    assert.equal(stored[ashi.socket.id].displayName, "Ashi T");
    assert.equal(stored[ashi.socket.id].username, "rev_fan");
    assert.equal(Object.hasOwn(stored[sneaky.socket.id], "displayName"), false, "invalid names are never stored");
    assert.equal(Object.hasOwn(stored[plain.socket.id], "displayName"), false);

    assert.equal(plain.presence.records.get(ashi.socket.id).displayName, "Ashi T");
    assert.equal(plain.presence.records.get(sneaky.socket.id).displayName, null);
    await waitFor(() => ashi.presence.records.has(plain.socket.id));
    assert.equal(ashi.presence.records.get(plain.socket.id).displayName, null);

    // moving around keeps the name; it's only set on joining
    ashi.socket.emit("update_position", { x: 420, y: 300, direction: "right" });
    await waitFor(() => plain.presence.records.get(ashi.socket.id)?.x === 420);
    assert.equal(plain.presence.records.get(ashi.socket.id).displayName, "Ashi T");

    // upgrades ride along on joining: the crown reaches the room, the toothbrush stays on the server
    const royal = await join({ x: 900, y: 300, direction: "down" }, { crown: true, toothbrush: true });
    await waitFor(() => plain.presence.records.has(royal.socket.id));
    assert.equal(plain.presence.records.get(royal.socket.id).crown, true);
    assert.equal(plain.presence.records.get(ashi.socket.id).crown, false);
    assert.equal(stored[royal.socket.id].toothbrush, true);
    assert.equal(stored[ashi.socket.id].toothbrush, false);
});
