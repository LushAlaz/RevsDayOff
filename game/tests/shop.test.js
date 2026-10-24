import { test } from "node:test";
import assert from "node:assert/strict";
import { SHOP, isNearEntrance, addSceneEntrance } from "../src/shop.js";
import { FIELD_LAYOUT } from "../src/field.js";

test("entrance accepts nearby positions including the radius and rejects distant ones", () => {
    assert.equal(isNearEntrance(SHOP.returnSpawn, SHOP.entrance), true);
    assert.equal(isNearEntrance({ x: 104, y: 284 }, SHOP.entrance), true);
    assert.equal(isNearEntrance({ x: 104, y: 285 }, SHOP.entrance), false);
    assert.equal(isNearEntrance({ x: 720, y: 320 }, SHOP.entrance), false);
    assert.ok(SHOP.returnSpawn.y - 32 >= SHOP.obstacle.bottom);
});

test("downward doorway and return spawn align with the building and clear field bounds", () => {
    assert.equal(SHOP.entrance.x, SHOP.position.x + SHOP.width / 2);
    assert.equal(SHOP.entrance.y, SHOP.position.y + SHOP.height);
    assert.equal(SHOP.returnSpawn.x, SHOP.entrance.x);
    assert.ok(SHOP.returnSpawn.y - 32 > SHOP.obstacle.bottom);
    assert.ok(SHOP.returnSpawn.x - 32 >= FIELD_LAYOUT.bounds.left);
    assert.ok(SHOP.returnSpawn.x + 32 <= FIELD_LAYOUT.bounds.right);
    assert.ok(SHOP.returnSpawn.y + 32 <= FIELD_LAYOUT.bounds.bottom);
});

test("Space only enters nearby, once, and the prompt tracks proximity", () => {
    const calls = [];
    let press;
    let update;
    globalThis.text = globalThis.pos = globalThis.anchor = globalThis.fixed =
    globalThis.z = globalThis.rect = globalThis.color = () => ({});
    globalThis.center = () => ({ x: 480, y: 270 });
    globalThis.height = () => 540;
    globalThis.add = () => ({ add() {} });
    globalThis.onKeyPress = (key, callback) => { assert.equal(key, "space"); press = callback; };
    globalThis.go = (...args) => calls.push(args);
    const player = { pos: { x: 720, y: 320 }, onUpdate(fn) { update = fn; } };
    const prompt = addSceneEntrance(player, {
        point: SHOP.entrance, label: "Space: Enter Shop", target: "shop",
    });
    update();
    assert.equal(prompt.hidden, true);
    press();
    assert.equal(calls.length, 0);
    player.pos = SHOP.returnSpawn;
    update();
    assert.equal(prompt.hidden, false);
    press();
    press();
    assert.deepEqual(calls, [["shop", undefined]]);
});

test("exit transition carries the doorway return spawn", () => {
    let press;
    let destination;
    globalThis.onKeyPress = (_key, callback) => { press = callback; };
    globalThis.go = (...args) => { destination = args; };
    const player = { pos: { x: 856, y: 400 }, onUpdate() {} };
    addSceneEntrance(player, {
        point: player.pos, label: "Space: Return to Kyle Field", target: "mapSelect",
        args: { spawn: SHOP.returnSpawn },
    });
    press();
    assert.deepEqual(destination, ["mapSelect", { spawn: SHOP.returnSpawn }]);
});
