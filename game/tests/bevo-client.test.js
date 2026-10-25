import { test } from "node:test";
import assert from "node:assert/strict";
import { createBevoClient } from "../src/bevo-state.js";
import { enableBite } from "../src/objects/cadet.js";

const snapshot = (patch = {}) => ({ encounterId: 1, sequence: 1, phase: "chasing", x: 780, y: 240,
    facing: "left", hp: 300, maxHp: 300, target: "self", chargeDirection: { x: -1, y: 0 },
    phaseEndsAt: 10, resummonAt: 0, serverNow: 2, ...patch });
function fixture(mapId = "drill-field") {
    let clock = 0;
    const handlers = new Map(), emitted = [], hits = [];
    const socket = { connected: true, on: (e, f) => handlers.set(e, f), off: (e) => handlers.delete(e),
        emit: (event, value) => emitted.push({ event, value }) };
    const boss = createBevoClient({ socket, mapId, now: () => clock, onHit: (hit) => hits.push(hit) });
    return { boss, socket, emitted, hits, handlers, at(value) { clock = value; },
        receive(value) { handlers.get("bevo_state")(value); },
        hit(value) { handlers.get("bevo_hit")(value); } };
}

test("boss clients consume only current validated server snapshots, isolated to Drill Field", () => {
    const f = fixture();
    for (const value of [null, {}, snapshot({ hp: -1 }), snapshot({ x: Infinity }), snapshot({ phase: "evil" })]) f.receive(value);
    assert.equal(f.boss.state, null);
    f.receive(snapshot()); assert.equal(f.boss.active, true);
    f.receive(snapshot({ sequence: 2, hp: 290 }));
    f.receive(snapshot({ sequence: 1, hp: 300 }));
    f.receive(snapshot({ encounterId: 0, sequence: 100 }));
    assert.equal(f.boss.state.hp, 290);
    const other = fixture("kyle-field"); other.receive(snapshot()); assert.equal(other.boss.state, null);
    f.socket.connected = false; f.boss.clear();
    f.receive(snapshot({ sequence: 3 })); assert.equal(f.boss.state, null); assert.equal(f.boss.active, false);
    f.socket.connected = true; f.receive(snapshot({ sequence: 3, hp: 240 }));
    assert.equal(f.boss.state.hp, 240, "rejoin restores the server's HP");
    f.boss.dispose(); assert.equal(f.handlers.size, 0);
});

test("summoning requires marker range, connection, and server-time cooldown; bites carry intent only", () => {
    const f = fixture();
    assert.equal(f.boss.summon({ x: 780, y: 240 }), false, "wait for initial state");
    f.receive(snapshot({ phase: "dormant" }));
    assert.equal(f.boss.summon({ x: 500, y: 240 }), false);
    assert.equal(f.boss.summon({ x: 780, y: 240 }), true);
    assert.deepEqual(f.emitted.at(-1), { event: "bevo_summon", value: { encounterId: 1 } });
    f.receive(snapshot({ sequence: 2, phase: "defeated", hp: 0, serverNow: 10, resummonAt: 40 }));
    assert.equal(f.boss.cooldown(), 30); assert.equal(f.boss.summon({ x: 780, y: 240 }), false);
    f.at(30); assert.equal(f.boss.summon({ x: 780, y: 240 }), true);
    f.receive(snapshot({ encounterId: 2, sequence: 3, phase: "spawning" }));
    const count = f.emitted.length; f.boss.bite(); assert.equal(f.emitted.length, count);
    f.receive(snapshot({ encounterId: 2, sequence: 4 })); f.boss.bite();
    assert.deepEqual(f.emitted.at(-1), { event: "bevo_bite", value: { encounterId: 2 } });
});

test("hit corrections apply once, reject old encounters, and stun expires or clears on disconnect", () => {
    const f = fixture(); f.receive(snapshot());
    const hit = { encounterId: 1, hitId: 1, x: 650, y: 240, fromX: 746, fromY: 240,
        startedAt: 2, duration: 0.25, stunDuration: 0.5, path: [{ x: 746, y: 240 }, { x: 650, y: 240 }] };
    for (const value of [null, { ...hit, x: NaN }, { ...hit, encounterId: 0 }, { ...hit, stunDuration: 100 }]) f.hit(value);
    assert.equal(f.hits.length, 0);
    f.hit(hit); f.hit(hit);
    assert.equal(f.hits.length, 1); assert.equal(f.boss.stunned, true);
    f.boss.bite(); assert.equal(f.emitted.length, 0);
    f.at(0.4); f.boss.syncKnockback(hit, hit.startedAt);
    f.at(0.5); assert.equal(f.boss.stunned, false);
    f.hit({ ...hit, hitId: 2 }); f.boss.clear(); assert.equal(f.boss.stunned, false);
});

test("summon interaction consumes E before the cadet bite handler", () => {
    let press, bites = 0;
    globalThis.onKeyPress = (_key, fn) => { press = fn; };
    enableBite({}, { onInteract: () => true, onBite: () => bites++ });
    press(); assert.equal(bites, 0);
});
