import { test } from "node:test";
import assert from "node:assert/strict";
import { createPresence } from "../src/presence.js";

function fixture() {
    let clock = 0;
    let local = { x: 100, y: 100, direction: "down" };
    const handlers = new Map();
    const emitted = [];
    const chomps = [];
    const finds = [];
    const socket = {
        id: "self", connected: false,
        on(event, callback) { handlers.set(event, callback); },
        off(event, callback) { assert.equal(handlers.get(event), callback); handlers.delete(event); },
        emit(event, data) { emitted.push({ event, data }); },
        disconnect() { this.connected = false; },
    };
    const presence = createPresence({ socket, mapId: "kyle-field",
        bounds: { left: 0, top: 0, right: 1440, bottom: 640 },
        getLocal: () => local, now: () => clock, onChomp: (data) => chomps.push(data),
        onFound: (data) => finds.push(data) });
    return { presence, socket, emitted, handlers, chomps, finds,
        at(value) { clock = value; }, local(value) { local = value; },
        connect() { socket.connected = true; handlers.get("connect")(); },
        receive(room) { handlers.get("update_data")({ room }); },
    };
}
const row = (id = "other", x = 300, direction = "left") => ({ id, x, y: 300, direction });

test("sniffing toggles send without movement and snapshot digging takes priority", () => {
    const f = fixture(); f.connect();
    f.local({ x: 100, y: 100, direction: "down", sniffing: true });
    f.at(0.1); f.presence.step();
    assert.equal(f.emitted.at(-1).data.sniffing, true);
    f.local({ x: 100, y: 100, direction: "down", sniffing: false });
    f.at(0.2); f.presence.step();
    assert.equal(f.emitted.at(-1).data.sniffing, false);
    f.receive({ other: { ...row(), sniffing: true } });
    assert.equal(f.presence.records.get("other").sniffing, true);
    f.receive({ other: { ...row(), sniffing: true, digging: true } });
    assert.equal(f.presence.records.get("other").sniffing, false);
    f.receive({ other: row() });
    assert.equal(f.presence.records.get("other").sniffing, false);
    f.local({ x: 100, y: 100, direction: "down", sniffing: true });
    f.socket.connected = false; f.handlers.get("disconnect")();
    f.connect();
    assert.equal(f.emitted.at(-2).data.sniffing, true, "reconnect restores current sniffing on join");
});

test("digging transitions broadcast once, reconnect restores current status, and offline finds are not replayed", () => {
    const f = fixture(); f.connect();
    f.presence.setDigging(true); f.presence.setDigging(true);
    assert.deepEqual(f.emitted.at(-1), { event: "sniffing", data: { x: 100, y: 100, active: true } });
    assert.equal(f.emitted.filter((event) => event.event === "sniffing").length, 1);
    f.socket.connected = false; f.handlers.get("disconnect")();
    f.presence.reportFind({ x: 400, y: 300 });
    f.connect();
    assert.deepEqual(f.emitted.slice(-3).map((event) => event.event), ["join_room", "update_position", "sniffing"]);
    assert.equal(f.emitted.at(-1).data.active, true);
    f.presence.setDigging(false);
    assert.equal(f.emitted.at(-1).data.active, false);
    f.socket.connected = false; f.handlers.get("disconnect")();
    f.presence.setDigging(true); f.presence.setDigging(false);
    f.connect();
    assert.deepEqual(f.emitted.slice(-2).map((event) => event.event), ["join_room", "update_position"]);
    assert.equal(f.emitted.some((event) => event.event === "dug-up"), false);
    f.presence.reportFind({ x: 400, y: 300 });
    assert.deepEqual(f.emitted.at(-1), { event: "dug-up", data: { x: 400, y: 300 } });
    f.presence.dispose();
    const count = f.emitted.length;
    f.presence.setDigging(true); f.presence.reportFind({ x: 400, y: 300 });
    assert.equal(f.emitted.length, count);
});

test("digging snapshots default false; found messages validate position and sender and suppress local echoes", () => {
    const f = fixture(); f.connect();
    f.receive({ other: { ...row(), digging: true } });
    assert.equal(f.presence.records.get("other").digging, true);
    f.receive({ other: row() });
    assert.equal(f.presence.records.get("other").digging, false);
    const receive = f.handlers.get("dug-up");
    for (const value of [null, {}, { id: "other", x: NaN, y: 300 },
        { id: "self", x: 300, y: 300 }, { id: "other", x: -1, y: 300 }]) receive(value);
    assert.equal(f.finds.length, 0);
    receive({ id: "other", x: 400, y: 300 });
    assert.deepEqual(f.finds, [{ id: "other", x: 400, y: 300 }]);
});

test("joins before updating, throttles movement, heartbeats while idle, and skips offline sends", () => {
    const f = fixture();
    f.presence.step();
    assert.equal(f.emitted.length, 0);
    f.connect();
    assert.deepEqual(f.emitted.map((entry) => entry.event), ["join_room", "update_position"]);
    assert.equal(f.emitted[0].data.room, "kyle-field");
    f.local({ x: 120, y: 100, direction: "right" });
    f.at(0.09); f.presence.step();
    assert.equal(f.emitted.length, 2);
    f.at(0.1); f.presence.step();
    assert.equal(f.emitted.length, 3);
    f.at(1); f.presence.step();
    assert.equal(f.emitted.length, 3);
    f.at(1.1); f.presence.step();
    assert.equal(f.emitted.length, 4);
    f.socket.connected = false;
    f.at(5); f.presence.step(); f.presence.bite();
    assert.equal(f.emitted.length, 4);
});

test("snapshots show players immediately, exclude self by key, and remove missing players", () => {
    const f = fixture(); f.connect();
    f.receive({ other: row("self", 310), self: row("other") });
    assert.equal(f.presence.records.size, 1);
    assert.equal(f.presence.records.get("other").active, true);
    assert.equal(f.presence.records.get("other").x, 310);
    f.at(1);
    f.receive({ other: row("other", 320), second: row("second", 400) });
    assert.equal(f.presence.records.get("other").x, 320);
    f.receive({ second: row("second", 400) });
    assert.equal(f.presence.records.has("other"), false);
    f.receive({});
    assert.equal(f.presence.records.size, 0);
});

test("stationary players remain present without artificial expiry", () => {
    const f = fixture(); f.connect();
    f.receive({ other: row() });
    f.at(60); f.presence.step();
    assert.equal(f.presence.records.get("other").active, true);
    f.receive({ other: row() });
    assert.equal(f.presence.records.size, 1);
});

test("rejects malformed positions, directions, snapshots, and chomp messages", () => {
    const f = fixture(); f.connect();
    f.handlers.get("update_data")(null);
    f.receive({ a: null, b: {}, c: row("bad", Infinity), d: row("bad", 20), e: row("bad", 400, "invalid") });
    assert.equal(f.presence.records.size, 0);
    f.receive({ other: row() });
    for (const value of [null, [], "invalid", 42]) f.receive(value);
    assert.equal(f.presence.records.size, 1, "malformed envelopes are ignored");
    for (const value of [null, {}, { x: NaN, y: 100 }, { x: 100, y: -1 }]) f.handlers.get("chomp")(value);
    assert.equal(f.chomps.length, 0);
    f.handlers.get("chomp")({ x: 300, y: 300 });
    assert.deepEqual(f.chomps, [{ x: 300, y: 300 }]);
    f.presence.bite();
    assert.deepEqual(f.emitted.at(-1), { event: "chomp", data: { x: 100, y: 100 } });
});

test("disconnect clears remote players; reconnect rejoins with the current position; disposal removes listeners", () => {
    const f = fixture(); f.connect();
    f.receive({ other: row() });
    f.socket.connected = false; f.handlers.get("disconnect")();
    assert.equal(f.presence.records.size, 0);
    f.local({ x: 400, y: 300, direction: "up" });
    f.connect();
    assert.deepEqual(f.emitted.at(-2).data, { room: "kyle-field", x: 400, y: 300, direction: "up" });
    f.presence.dispose(); f.presence.dispose();
    assert.equal(f.handlers.size, 0);
    assert.equal(f.socket.connected, false);
    const count = f.emitted.length;
    f.presence.step(); f.presence.bite();
    assert.equal(f.emitted.length, count);
});
