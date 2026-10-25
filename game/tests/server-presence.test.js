import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { once } from "node:events";
import { io as connectSocket } from "socket.io-client";
import { createPresence } from "../src/presence.js";

const require = createRequire(import.meta.url);
const network = require("../../express/server.js");

test("server snapshot protocol preserves records and cleans up room membership", { timeout: 15000 }, async (t) => {
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
    const effects = [[], [], []];
    const locals = [
        { x: 400, y: 300, direction: "right" },
        { x: 700, y: 300, direction: "left" },
        { x: 500, y: 300, direction: "up" },
    ];
    for (let index = 0; index < 3; index++) {
        const socket = connectSocket(url, { transports: ["websocket"], autoConnect: false, forceNew: true });
        sockets.push(socket);
        presences.push(createPresence({ socket, mapId: index === 2 ? "drill-field" : "kyle-field",
            bounds: { left: 0, top: 0, right: 1440, bottom: 640 },
            getLocal: () => locals[index], now: () => performance.now() / 1000,
            onChomp: (value) => effects[index].push(value) }));
        socket.connect();
        await once(socket, "connect");
    }
    const [a, b, c] = sockets;
    const deliver = async (socket, event, data) => {
        const received = once(network.io.sockets.sockets.get(socket.id), event);
        socket.emit(event, data);
        await received;
    };
    await waitFor(() => presences[0].records.has(b.id) && presences[1].records.has(a.id));
    const original = network.rooms["kyle-field"][b.id];
    assert.equal(presences[0].records.get(b.id).active, true, "visible on first snapshot");
    assert.equal(presences[0].records.has(a.id), false);
    assert.equal(presences[0].records.has(c.id), false);

    await t.test("updates mutate one object and repeated joins do not duplicate it", async () => {
        for (let index = 0; index < 30; index++) {
            locals[1].x = 710 + index;
            await deliver(b, "update_position", locals[1]);
            assert.equal(network.rooms["kyle-field"][b.id], original);
        }
        await deliver(b, "join_room", { room: "kyle-field", ...locals[1] });
        assert.equal(network.rooms["kyle-field"][b.id], original);
        assert.equal(Object.keys(network.rooms["kyle-field"]).length, 2);
        await waitFor(() => presences[0].records.get(b.id)?.x === locals[1].x);
        const data = await (await fetch(`${url}/data`)).json();
        assert.equal(Array.isArray(data.rooms["kyle-field"]), false);
        assert.equal(data.rooms["kyle-field"][b.id].x, locals[1].x);
    });

    await t.test("invalid payloads are ignored and unjoined clients cannot update or chomp", async () => {
        for (const payload of [null, {}, { x: "100", y: 300, direction: "left" },
            { x: 100, y: 300, direction: "sideways" }]) {
            await deliver(b, "update_position", payload);
        }
        await deliver(b, "join_room", { room: "__proto__", ...locals[1] });
        await deliver(b, "join_room", null);
        assert.equal(network.rooms["kyle-field"][b.id], original);
        assert.equal(original.x, locals[1].x);
        const rogue = connectSocket(url, { transports: ["websocket"], forceNew: true });
        sockets.push(rogue);
        await once(rogue, "connect");
        await deliver(rogue, "update_position", locals[0]);
        await deliver(rogue, "chomp", locals[0]);
        await deliver(rogue, "display_legendary_item_won", null);
        for (const room of Object.values(network.rooms)) assert.equal(Object.hasOwn(room, rogue.id), false);
        assert.equal(effects[0].length, 0);
    });

    await t.test("chomps reach peers in the same room only", async () => {
        presences[1].bite();
        await waitFor(() => effects[0].length === 1);
        assert.deepEqual(effects[0][0], { x: locals[1].x, y: locals[1].y });
        assert.equal(effects[1].length, 0);
        assert.equal(effects[2].length, 0);
    });

    await t.test("switching maps removes old membership and disconnect broadcasts departure", async () => {
        await deliver(b, "join_room", { room: "drill-field", ...locals[1] });
        await waitFor(() => !presences[0].records.has(b.id) && presences[2].records.has(b.id));
        assert.equal(Object.hasOwn(network.rooms["kyle-field"], b.id), false);
        assert.equal(network.io.sockets.sockets.get(b.id).rooms.has("kyle-field"), false);
        assert.equal(presences[1].records.has(a.id), false, "new snapshot removes old-room peers");
        const id = b.id;
        b.disconnect();
        await waitFor(() => !presences[2].records.has(id));
        assert.equal(Object.hasOwn(network.rooms["drill-field"], id), false);
    });

    await t.test("reconnect obtains a new ID and joins again without restoring the old one", async () => {
        const oldId = a.id;
        a.disconnect();
        await waitFor(() => !Object.hasOwn(network.rooms["kyle-field"], oldId));
        a.connect();
        await once(a, "connect");
        assert.notEqual(a.id, oldId);
        await waitFor(() => Object.hasOwn(network.rooms["kyle-field"], a.id));
        assert.equal(Object.keys(network.rooms["kyle-field"]).length, 1);
    });
});
