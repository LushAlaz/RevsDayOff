import { test } from "node:test";
import assert from "node:assert/strict";
import { once } from "node:events";
import { createRequire } from "node:module";
import { io } from "socket.io-client";
import { createPresence } from "../src/presence.js";
const network = createRequire(import.meta.url)("../../express/server.js");

test("Socket.IO shares one authoritative Bevo, validates combat, restores late joins, and resets empty rooms", { timeout: 15000 }, async (t) => {
    const clients = [];
    t.after(async () => {
        for (const c of clients) c.presence.dispose();
        await new Promise((resolve) => network.io.close(resolve));
    });
    network.server.listen(0, "127.0.0.1"); await once(network.server, "listening");
    const url = `http://127.0.0.1:${network.server.address().port}`;
    async function waitFor(fn) {
        const deadline = Date.now() + 3000;
        while (!fn()) {
            if (Date.now() > deadline) throw new Error("Boss state timed out");
            await new Promise((r) => setTimeout(r, 5));
        }
    }
    async function connect(mapId, x) {
        const socket = io(url, { transports: ["websocket"], autoConnect: false, forceNew: true });
        const local = { x, y: 240, direction: "left" }, hits = [];
        const presence = createPresence({ socket, mapId, bounds: { left: 0, top: 0, right: 1080, bottom: 480 },
            getLocal: () => local, now: () => performance.now() / 1000,
            onBevoHit: (hit) => { local.x = hit.x; local.y = hit.y; hits.push(hit); } });
        const client = { socket, presence, local, hits }; clients.push(client);
        socket.connect(); await once(socket, "connect");
        await waitFor(() => network.rooms[mapId][socket.id]);
        return client;
    }
    async function send(client, event, payload) {
        const received = once(network.io.sockets.sockets.get(client.socket.id), event);
        client.socket.emit(event, payload); await received;
    }
    const a = await connect("drill-field", 700), b = await connect("drill-field", 860);
    const elsewhere = await connect("kyle-field", 700);
    await waitFor(() => a.presence.boss.state && b.presence.boss.state);
    assert.equal(elsewhere.presence.boss.state, null);
    b.presence.setDigging(true);
    await waitFor(() => network.rooms["drill-field"][b.socket.id].digging);
    const encounterId = a.presence.boss.state.encounterId;
    await Promise.all([send(a, "bevo_summon", { encounterId }), send(b, "bevo_summon", { encounterId })]);
    await waitFor(() => a.presence.boss.active && b.presence.boss.active);
    assert.equal(network.bevo.encounterId, encounterId + 1);
    assert.equal(network.rooms["drill-field"][b.socket.id].digging, false);
    await send(b, "sniffing", { ...b.local, active: true });
    assert.equal(network.rooms["drill-field"][b.socket.id].digging, false);
    const current = network.bevo.encounterId;
    await send(a, "bevo_bite", { encounterId: current });
    assert.equal(network.bevo.hp, 300, "spawn immunity");
    a.local.x = 680; b.local.x = 880;
    await send(a, "update_position", a.local); await send(b, "update_position", b.local);
    network.bevo.phaseEndsAt = 0; network.bevoController.step(0);
    await Promise.all([send(a, "bevo_bite", { encounterId: current, damage: 3000 }),
        send(b, "bevo_bite", { encounterId: current })]);
    await waitFor(() => a.presence.boss.state.hp === 280 && b.presence.boss.state.hp === 280);
    await send(a, "bevo_bite", { encounterId: current });
    await send(elsewhere, "bevo_bite", { encounterId: current });
    await send(a, "bevo_bite", { encounterId: current - 1 });
    await send(a, "bevo_state", { hp: 0, x: 12, y: 12 });
    await send(a, "update_position", { ...a.local, x: -500, bevo: { hp: 0 } });
    assert.equal(network.bevo.hp, 280, "client damage, forged state, wrong room, cooldown, and stale IDs cannot override HP");
    const late = await connect("drill-field", 500);
    await waitFor(() => late.presence.boss.state?.hp === 280);
    a.local.x = network.bevo.x - 20; a.local.y = network.bevo.y;
    await send(a, "update_position", a.local);
    network.bevoController.step(0);
    await waitFor(() => a.hits.length === 1);
    const motion = a.hits[0];
    assert.notEqual(network.rooms["drill-field"][a.socket.id].x, motion.x, "hit starts a shove instead of teleporting");
    const mid = await connect("drill-field", 500);
    await waitFor(() => mid.presence.records.get(a.socket.id)?.knockback?.hitId === motion.hitId);
    await waitFor(() => {
        const x = mid.presence.records.get(a.socket.id).x;
        return x < motion.fromX && x > motion.x;
    });
    await send(a, "update_position", { ...a.local, x: 800 });
    await send(a, "join_room", { room: "drill-field", ...a.local, x: 800 });
    const currentX = network.rooms["drill-field"][a.socket.id].x;
    assert.ok(currentX >= motion.x && currentX <= motion.fromX, "normal updates and repeated joins cannot overwrite the shove");
    await waitFor(() => Math.abs(mid.presence.records.get(a.socket.id).x - motion.x) < 1e-8);
    for (const c of [a, b, late, mid]) c.socket.disconnect();
    await waitFor(() => network.bevo.phase === "dormant");
    assert.equal(network.bevo.hp, 300); assert.equal(network.bevo.resummonAt, 0);
    a.socket.connect(); await once(a.socket, "connect");
    await waitFor(() => a.presence.boss.state?.phase === "dormant");
    assert.equal(a.presence.boss.state.hp, 300);
});
