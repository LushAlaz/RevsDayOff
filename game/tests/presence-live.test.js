import { test } from "node:test";
import assert from "node:assert/strict";
import { io } from "socket.io-client";
import { createPresence } from "../src/presence.js";

// Opt in against the Express snapshot protocol: set NETWORK_TEST_URL first.
test("live server relays presence and chomps only within the selected map", {
    skip: !process.env.NETWORK_TEST_URL, timeout: 15000,
}, async () => {
    const sockets = [];
    const clients = [];
    const effects = [[], [], []];
    const locals = [
        { x: 400, y: 300, direction: "right" },
        { x: 700, y: 300, direction: "left" },
        { x: 500, y: 300, direction: "up" },
    ];
    const waitFor = async (condition) => {
        const deadline = Date.now() + 5000;
        while (!condition()) {
            if (Date.now() > deadline) throw new Error("Timed out waiting for server event");
            await new Promise((resolve) => setTimeout(resolve, 20));
        }
    };
    try {
        for (let index = 0; index < 3; index++) {
            const socket = io(process.env.NETWORK_TEST_URL, { transports: ["websocket"], autoConnect: false, forceNew: true });
            sockets.push(socket);
            clients.push(createPresence({ socket, mapId: index === 2 ? "drill-field" : "kyle-field",
                bounds: { left: 0, top: 0, right: 1440, bottom: 640 },
                getLocal: () => locals[index], now: () => performance.now() / 1000,
                onChomp: (value) => effects[index].push(value) }));
            socket.connect();
        }
        await waitFor(() => sockets.every((socket) => socket.connected));
        for (const socket of sockets) socket.emit("update_position", locals[sockets.indexOf(socket)]);
        await waitFor(() => clients[0].records.has(sockets[1].id) && clients[1].records.has(sockets[0].id));
        locals[1] = { x: 740, y: 300, direction: "right" };
        sockets[1].emit("update_position", locals[1]);
        await waitFor(() => clients[0].records.get(sockets[1].id)?.x === 740);
        assert.equal(clients[0].records.get(sockets[1].id).x, 740);
        assert.equal(clients[0].records.has(sockets[0].id), false);
        assert.equal(clients[0].records.has(sockets[2].id), false);
        clients[1].bite();
        await waitFor(() => effects[0].length === 1);
        assert.deepEqual(effects[0][0], { x: 740, y: 300 });
        assert.equal(effects[1].length, 0);
        assert.equal(effects[2].length, 0);
        const departingId = sockets[1].id;
        clients[1].dispose();
        assert.equal(sockets[1].connected, false);
        await waitFor(() => !clients[0].records.has(departingId));
    } finally {
        for (const client of clients) client.dispose();
    }
});
