import { beforeEach, test } from "node:test";
import assert from "node:assert/strict";
import { addPlayer } from "../src/objects/player.js";

let keys;
let delta;

// Supply only the engine surface the movement controller consumes.
beforeEach(() => {
    keys = new Set();
    delta = 1 / 60;
    globalThis.width = () => 960;
    globalThis.height = () => 540;
    globalThis.pos = (x, y) => ({ pos: { x, y } });
    globalThis.sprite = () => ({ width: 32, height: 40 });
    globalThis.anchor = () => ({});
    globalThis.isKeyDown = (key) => keys.has(key);
    globalThis.add = (components) => Object.assign({
        onUpdate(callback) { this.update = callback; },
        move(x, y) {
            this.pos.x += x * delta;
            this.pos.y += y * delta;
        },
    }, ...components);
});

test("WASD and arrows move at 300 pixels per second in every direction", () => {
    for (const [key, x, y] of [
        ["w", 0, -5], ["up", 0, -5], ["s", 0, 5], ["down", 0, 5],
        ["a", -5, 0], ["left", -5, 0], ["d", 5, 0], ["right", 5, 0],
    ]) {
        keys = new Set([key]);
        const player = addPlayer();
        player.update();
        assert.deepEqual(player.pos, { x: 120 + x, y: 120 + y });
        assert.deepEqual(player.items, []);
    }
});

test("diagonals are normalized, including mixed keyboard layouts", () => {
    for (const pair of [["w", "d"], ["up", "right"], ["w", "right"]]) {
        keys = new Set(pair);
        const player = addPlayer();
        player.update();
        assert.ok(Math.abs(Math.hypot(player.pos.x - 120, player.pos.y - 120) - 5) < 1e-10);
    }
});

test("duplicate direction keys do not boost speed; opposing keys cancel", () => {
    const player = addPlayer();
    keys = new Set(["d", "right"]);
    player.update();
    assert.equal(player.pos.x, 125);
    keys.add("a");
    player.update();
    assert.deepEqual(player.pos, { x: 125, y: 120 });
});

test("releasing controls stops immediately and speed is frame-rate independent", () => {
    const player = addPlayer({ speed: 180 });
    keys.add("d");
    delta = 1 / 30;
    player.update();
    assert.equal(player.pos.x, 126);
    keys.clear();
    player.update();
    assert.equal(player.pos.x, 126);
});

test("all boundaries account for the entire sprite, even after large steps", () => {
    for (const [key, expected] of [
        ["a", { x: 48, y: 200 }], ["d", { x: 912, y: 200 }],
        ["w", { x: 200, y: 108 }], ["s", { x: 200, y: 464 }],
    ]) {
        const player = addPlayer({ spawn: { x: 200, y: 200 },
            bounds: { left: 32, top: 88, right: 928, bottom: 484 } });
        keys = new Set([key]);
        delta = 10;
        player.update();
        assert.deepEqual(player.pos, expected);
    }
});

test("dynamic bounds reclamp an idle player and handle undersized areas", () => {
    let bounds = { left: 0, top: 0, right: 960, bottom: 540 };
    const player = addPlayer({ bounds: () => bounds });
    bounds = { left: 0, top: 0, right: 100, bottom: 100 };
    player.update();
    assert.deepEqual(player.pos, { x: 84, y: 80 });
    bounds = { left: 0, top: 0, right: 10, bottom: 10 };
    player.update();
    assert.deepEqual(player.pos, { x: 5, y: 5 });
});
