import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { createKnockbackPlayback, sampleKnockback, validKnockback } from "../src/knockback.js";
import { createPresence } from "../src/presence.js";
const { createBevoState, createBevoController, knockbackPosition, clear } = createRequire(import.meta.url)("../../express/bevo.js");

function fixture(position = { x: 760, y: 240 }, bossPosition = { x: 780, y: 240 }) {
    let clock = 0;
    const state = createBevoState(), players = { a: { x: 700, y: 240 } }, hits = [], updates = [];
    const boss = createBevoController(state, { getPlayers: () => players, now: () => clock,
        onHit: (_id, value) => hits.push(value), onPlayersChanged: () => updates.push({ ...players.a }) });
    boss.summon("a", 0); clock = 2; boss.step(0);
    Object.assign(state, bossPosition); Object.assign(players.a, position);
    clock = 2.05; boss.step(0);
    state.phase = "recovering"; state.phaseEndsAt = 100;
    return { state, players, hits, updates, boss, at(t) { clock = t; boss.step(0); } };
}
const close = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-8, `${actual} != ${expected}`);

test("server shoves ease out over 0.25 seconds, then hold until the 0.5-second stun ends", () => {
    const f = fixture(), hit = f.hits[0];
    assert.equal(validKnockback(hit), true);
    assert.equal(f.players.a.x, 760, "hit does not teleport the player");
    f.at(2.1); close(f.players.a.x, 725.44);
    f.at(2.175); close(f.players.a.x, 688);
    f.at(2.3); close(f.players.a.x, 664);
    assert.equal(f.boss.stunned("a"), true);
    f.at(2.54); close(f.players.a.x, 664);
    assert.ok(f.players.a.knockback, "late snapshots retain the endpoint during stun");
    f.at(2.56); assert.equal(f.players.a.knockback, undefined);
    assert.equal(f.boss.stunned("a"), false);
    assert.ok(f.updates.length >= 3, "movement and completion publish player snapshots");
});

test("server and clients agree at intermediate times, across tick rates and skipped frames", () => {
    const a = fixture(), b = fixture(), hit = a.hits[0];
    for (let i = 1; i <= 15; i++) a.at(2.05 + i / 60);
    b.at(2.3);
    close(a.players.a.x, b.players.a.x);
    for (const elapsed of [0, 0.01, 0.05, 0.125, 0.2, 0.25, 1]) {
        const client = sampleKnockback(hit, elapsed), server = knockbackPosition(hit, hit.startedAt + elapsed);
        close(client.x, server.x); close(client.y, server.y);
    }
    const skipped = fixture(); skipped.state.phase = "defeated"; skipped.at(3);
    close(skipped.players.a.x, 664);
    assert.equal(skipped.players.a.knockback, undefined, "defeat does not strand a pending shove");
});

test("knockback routes slide around corners and remain clear of terrain and boundaries", () => {
    for (const [player, boss] of [
        [{ x: 190, y: 190 }, { x: 230, y: 230 }],
        [{ x: 210, y: 100 }, { x: 250, y: 100 }],
        [{ x: 1030, y: 300 }, { x: 990, y: 300 }],
    ]) {
        const f = fixture(player, boss), hit = f.hits[0];
        assert.ok(hit);
        for (let i = 0; i <= 100; i++) assert.equal(clear(sampleKnockback(hit, i / 400), 32), true);
        f.at(2.3); close(f.players.a.x, hit.x); close(f.players.a.y, hit.y);
    }
});

test("playback is continuous, does not restart on snapshots, and supports late arrival", () => {
    let clock = 0;
    const hit = fixture().hits[0], playback = createKnockbackPlayback(() => clock);
    assert.equal(playback.accept(hit, hit.startedAt, { x: 765, y: 240 }), true);
    assert.equal(playback.sample().x, 765, "first frame starts at the displayed position");
    clock = 0.125; close(playback.sample().x, 690.5);
    assert.equal(playback.accept(hit, hit.startedAt + 0.125, { x: 690.5, y: 240 }), false);
    clock = 0.25; close(playback.sample().x, 664);
    clock = 0.5;
    assert.equal(playback.sample(), null, "normal movement resumes without reapplying the endpoint over player input");
    assert.equal(playback.accept({ ...hit, hitId: hit.hitId - 1 }, hit.startedAt, { x: 760, y: 240 }), false);
    playback.clear(); assert.equal(playback.sample(), null);
    const late = createKnockbackPlayback(() => clock);
    assert.equal(late.accept(hit, hit.startedAt + 0.125, { x: 688, y: 240 }), true);
    close(late.sample().x, 688);
    clock += 0.125; close(late.sample().x, 664);
});

test("a hidden tab catches up once without sending the pre-hit position", () => {
    let clock = 0;
    const playback = createKnockbackPlayback(() => clock), hit = fixture().hits[0];
    playback.accept(hit, hit.startedAt, { x: 760, y: 240 });
    clock = 5;
    assert.deepEqual(playback.sample(), { x: 664, y: 240 });
    assert.equal(playback.sample(), null);
});

test("presence consumes owner knockback separately from peers, suppresses intermediate sends, and clears on disconnect", () => {
    let clock = 0;
    const handlers = new Map(), emitted = [], forced = [], hits = [];
    const socket = { id: "self", connected: true, on: (e, f) => handlers.set(e, f), off: (e) => handlers.delete(e),
        emit: (e, value) => emitted.push({ e, value }), disconnect() { this.connected = false; } };
    const presence = createPresence({ socket, mapId: "drill-field", bounds: { left: 0, top: 0, right: 1080, bottom: 480 },
        getLocal: () => ({ x: 760, y: 240, direction: "left" }), now: () => clock,
        onBevoHit: (value) => hits.push(value), onForcedMovement: (value) => forced.push(value) });
    handlers.get("connect")();
    const state = fixture().state;
    handlers.get("bevo_state")({ ...state, sequence: 10, serverNow: 2.05 });
    const hit = fixture().hits[0];
    handlers.get("bevo_hit")(hit);
    const count = emitted.length;
    clock = 0.1; presence.step(); assert.equal(emitted.length, count);
    const row = { x: 725.44, y: 240, direction: "left", knockback: hit };
    handlers.get("update_data")({ serverNow: 2.1, room: { self: row, peer: row } });
    assert.equal(presence.records.has("self"), false);
    assert.deepEqual(presence.records.get("peer").knockback, hit);
    assert.deepEqual(forced, [hit]); assert.equal(hits.length, 1);
    handlers.get("update_data")({ serverNow: 2.1, room: { self: { ...row, knockback: { ...hit, encounterId: 0 } } } });
    assert.equal(forced.length, 1, "old encounters cannot move the local player");
    clock = 1.1; presence.step(); assert.equal(emitted.length, count + 1);
    handlers.get("disconnect")(); assert.equal(forced.at(-1), null);
    presence.dispose(); assert.equal(handlers.size, 0);
});
