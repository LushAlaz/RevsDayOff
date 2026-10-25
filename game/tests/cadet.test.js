import { test } from "node:test";
import assert from "node:assert/strict";
import { cadetSpawnPoint, findBiteTarget, enableBite, CADET_SPAWN_MARGIN, BITE_RANGE } from "../src/objects/cadet.js";
import { createLootController, triggersCadet } from "../src/loot.js";
import { ITEMS } from "../src/items.js";
import { MAPS } from "../src/maps.js";
import { stealItem } from "../src/session.js";

function seeded(seed) {
    let value = seed;
    return () => {
        value = (Math.imul(value, 1664525) + 1013904223) >>> 0;
        return value / 4294967296;
    };
}
function challenge(onFail) {
    const spot = { id: 0, position: { x: 400, y: 300 }, item: ITEMS.find((item) => item.rarity === "Common"), collected: false };
    const loot = createLootController({ spots: [spot], inventory: [], random: () => 0.5, onFail });
    loot.step(1 / 60, true, spot.position);
    assert.equal(loot.phase, "challenge");
    return loot;
}

test("misses and timeouts call a cadet; hits and cancels do not", () => {
    const calls = [];
    const record = (result) => calls.push(result.reason);

    challenge(record).finish(false, "miss");
    const timedOut = challenge(record);
    timedOut.step(6, false, { x: 400, y: 300 });
    challenge(record).cancel();
    challenge(record).finish(true);

    assert.deepEqual(calls, ["miss", "timeout"]);
    assert.equal(triggersCadet({ success: false, reason: "miss" }), true);
    assert.equal(triggersCadet({ success: false, reason: "cancelled" }), false);
    assert.equal(triggersCadet({ success: true, reason: "miss" }), false);
});

test("a stopped spinner outside the arc calls exactly one cadet", () => {
    let calls = 0;
    const loot = challenge(() => calls++);
    loot.angle = (loot.target + 180) % 360;
    loot.stopSpinner();
    loot.stopSpinner();
    assert.equal(loot.result.reason, "miss");
    assert.equal(calls, 1);
});

test("cadets spawn inside every map, well away from Rev", () => {
    for (const map of MAPS) {
        const { left, top, right, bottom } = map.bounds;
        for (let seed = 1; seed <= 20; seed++) {
            const random = seeded(seed);
            for (let x = left + 32; x <= right - 32; x += 128) {
                for (let y = top + 32; y <= bottom - 32; y += 96) {
                    const point = cadetSpawnPoint({ x, y }, map.bounds, random);
                    assert.ok(point.x >= left + CADET_SPAWN_MARGIN && point.x <= right - CADET_SPAWN_MARGIN, `${map.id} x`);
                    assert.ok(point.y >= top + CADET_SPAWN_MARGIN && point.y <= bottom - CADET_SPAWN_MARGIN, `${map.id} y`);
                    assert.ok(Math.hypot(point.x - x, point.y - y) >= 250, `${map.id} too close at ${x},${y}`);
                }
            }
        }
    }
});

test("a bite reaches the nearest standing cadet in range only", () => {
    const rev = { x: 500, y: 300 };
    const far = { pos: { x: 500 + BITE_RANGE + 1, y: 300 } };
    const near = { pos: { x: 540, y: 300 } };
    const nearer = { pos: { x: 520, y: 300 }, gone: true };
    const edge = { pos: { x: 500, y: 300 - BITE_RANGE } };

    assert.equal(findBiteTarget(rev, [far]), null);
    assert.equal(findBiteTarget(rev, [far, nearer, near]), near);
    assert.equal(findBiteTarget(rev, [edge]), edge);
    assert.equal(findBiteTarget(rev, []), null);
});

test("a catch takes exactly one random item and leaves coins alone", () => {
    const [ring, towel, hat] = ["ring", "towel", "hat"].map((id) => ({ id, name: id }));
    const state = { inventory: [ring, towel, hat], coins: 40 };
    const bag = state.inventory;

    assert.equal(stealItem(state, () => 0.5), towel);
    assert.deepEqual(state.inventory, [ring, hat]);
    assert.equal(state.inventory, bag, "keeps the shared inventory array");
    assert.equal(stealItem(state, () => 0.99), hat);
    assert.equal(stealItem(state, () => 0), ring);
    assert.equal(state.coins, 40);
});

test("an empty bag has nothing to steal", () => {
    const state = { inventory: [], coins: 0 };
    assert.equal(stealItem(state), null);
    assert.deepEqual(state.inventory, []);
});

test("bite callback fires for accepted chomps only, respecting cooldown and challenge lock", () => {
    let press, clock = 0, allowed = true, bites = 0;
    globalThis.onKeyPress = (_key, callback) => { press = callback; };
    globalThis.time = () => clock;
    globalThis.get = () => [];
    for (const name of ["add", "text", "pos", "anchor", "color", "outline", "rgb", "opacity", "move", "vec2", "lifespan", "z"]) {
        globalThis[name] = () => ({});
    }
    enableBite({ pos: { add: () => ({}) } }, { canBite: () => allowed, onBite: () => bites++ });
    press(); press();
    assert.equal(bites, 1);
    clock = 0.5; allowed = false; press();
    assert.equal(bites, 1);
    allowed = true; press();
    assert.equal(bites, 2);
});
