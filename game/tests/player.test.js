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
    globalThis.sprite = (name, options) => ({ sprite: name, flipX: false, ...options });
    globalThis.anchor = () => ({});
    globalThis.isKeyDown = (key) => keys.has(key);
    globalThis.add = (components) => Object.assign({
        onUpdate(callback) { this.update = callback; },
        plays: [],
        play(name) { this.plays.push(name); this.animation = name; },
        stop() { this.animation = null; },
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
        ["a", { x: 64, y: 200 }], ["d", { x: 896, y: 200 }],
        ["w", { x: 200, y: 120 }], ["s", { x: 200, y: 452 }],
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
    assert.deepEqual(player.pos, { x: 68, y: 68 });
    bounds = { left: 0, top: 0, right: 10, bottom: 10 };
    player.update();
    assert.deepEqual(player.pos, { x: 5, y: 5 });
});

test("Reveille starts facing down at double sprite size", () => {
    const player = addPlayer();
    assert.equal(player.sprite, "reveille");
    assert.equal(player.width, 64);
    assert.equal(player.height, 64);
    assert.equal(player.frame, 0);
    player.update();
    assert.deepEqual(player.plays, []);
});

test("walking uses native directional frames without mirroring and idles facing the last direction", () => {
    const player = addPlayer();
    for (const [key, animation, flipX, idle] of [
        ["a", "left", false, 6], ["w", "up", false, 3],
        ["d", "right", false, 9], ["s", "down", false, 0],
    ]) {
        keys = new Set([key]);
        player.update();
        assert.equal(player.animation, animation);
        assert.equal(player.flipX, flipX);
        keys.clear();
        player.update();
        assert.equal(player.animation, null);
        assert.equal(player.frame, idle);
        assert.equal(player.flipX, flipX);
    }
});

test("continuous walking does not restart animation and diagonals face horizontally", () => {
    const player = addPlayer();
    keys = new Set(["w", "a"]);
    player.update();
    player.update();
    assert.deepEqual(player.plays, ["left"]);
    assert.equal(player.flipX, false);
    keys = new Set(["w", "d"]);
    player.update();
    assert.equal(player.animation, "right");
    assert.equal(player.flipX, false);
    keys = new Set(["w"]);
    player.update();
    assert.equal(player.animation, "up");
    keys.add("s");
    player.update();
    assert.equal(player.animation, null);
    assert.equal(player.frame, 3);
    keys.delete("s");
    player.update();
    assert.equal(player.animation, "up");
});

test("obstacles stop movement from every side, including long frames", () => {
    const obstacle = { left: 200, top: 200, right: 300, bottom: 300 };
    for (const [spawn, key, expected] of [
        [{ x: 120, y: 250 }, "d", { x: 168, y: 250 }],
        [{ x: 400, y: 250 }, "a", { x: 332, y: 250 }],
        [{ x: 250, y: 120 }, "s", { x: 250, y: 168 }],
        [{ x: 250, y: 400 }, "w", { x: 250, y: 332 }],
    ]) {
        keys = new Set([key]);
        delta = 2;
        const player = addPlayer({ spawn, obstacles: [obstacle] });
        player.update();
        assert.deepEqual(player.pos, expected);
    }
});

test("diagonal movement slides along obstacle sides", () => {
    const player = addPlayer({ spawn: { x: 168, y: 250 },
        obstacles: [{ left: 200, top: 200, right: 300, bottom: 300 }] });
    keys = new Set(["d", "s"]);
    player.update();
    assert.equal(player.pos.x, 168);
    assert.ok(player.pos.y > 250);
});
