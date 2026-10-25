import { test } from "node:test";
import assert from "node:assert/strict";
import { generateLoot, distanceHint, rollRarity, isTimingHit, createLootController, FOUND_RESULT_SECONDS, MISS_RESULT_SECONDS } from "../src/loot.js";
import { FIELD_LAYOUT } from "../src/field.js";
import { SHOP } from "../src/shop.js";
import { ITEMS, RARITIES } from "../src/items.js";
import { session, startNewGame } from "../src/session.js";

function seeded(seed) {
    let value = seed;
    return () => {
        value = (Math.imul(value, 1664525) + 1013904223) >>> 0;
        return value / 4294967296;
    };
}
function fixture(rarity = "Common") {
    const spot = { id: 0, position: { x: 400, y: 300 }, item: ITEMS.find((item) => item.rarity === rarity), rarity, collected: false };
    const inventory = [];
    const controller = createLootController({ spots: [spot], inventory, random: () => 0.5 });
    return { spot, inventory, controller };
}

test("random loot is reachable, spaced apart, and excluded from shop and entrance", () => {
    for (let seed = 1; seed <= 50; seed++) {
        const spots = generateLoot({ bounds: FIELD_LAYOUT.bounds, obstacle: SHOP.obstacle,
            entrance: SHOP.entrance, random: seeded(seed) });
        assert.equal(spots.length, 12);
        for (const [index, spot] of spots.entries()) {
            const { x, y } = spot.position;
            assert.ok(x >= 64 && x <= 1376 && y >= 64 && y <= 576);
            assert.ok(x <= SHOP.obstacle.left - 64 || x >= SHOP.obstacle.right + 64
                || y <= SHOP.obstacle.top - 64 || y >= SHOP.obstacle.bottom + 64);
            assert.ok(Math.hypot(x - SHOP.entrance.x, y - SHOP.entrance.y) >= 112);
            for (const earlier of spots.slice(0, index)) {
                assert.ok(Math.hypot(x - earlier.position.x, y - earlier.position.y) >= 140);
            }
            assert.ok(ITEMS.includes(spot.item));
            assert.ok(RARITIES[spot.rarity]);
            assert.equal(spot.rarity, spot.item.rarity);
        }
    }
});

test("rarity-first selection chooses uniformly within the fixed-rarity catalog", () => {
    for (const [roll, rarity] of [[0.2, "Common"], [0.7, "Rare"], [0.9, "Epic"], [0.99, "Legendary"]]) {
        const candidates = ITEMS.filter((item) => item.rarity === rarity);
        for (let index = 0; index < candidates.length; index++) {
            const values = [0.5, 0.5, roll, (index + 0.5) / candidates.length];
            const [spot] = generateLoot({ bounds: FIELD_LAYOUT.bounds, obstacle: SHOP.obstacle,
                entrance: SHOP.entrance, count: 1, random: () => values.shift() });
            assert.equal(spot.rarity, rarity);
            assert.equal(spot.item, candidates[index]);
        }
    }
});

test("Aggie Ring always uses Legendary challenge settings and reward labeling", () => {
    const inventory = [];
    const item = ITEMS.find((entry) => entry.id === "ring");
    const spot = { id: 0, position: { x: 400, y: 300 }, item, rarity: "Common", collected: false };
    const controller = createLootController({ spots: [spot], inventory, random: () => 0.5 });
    controller.step(0, true, spot.position);
    controller.step(0.6, true, spot.position);
    assert.equal(controller.angle, 180);
    assert.equal(controller.active.rarity, "Legendary");
    controller.stopSpinner();
    assert.equal(inventory[0].rarity, "Legendary");
});

test("placement uses a bounded safe fallback with a pathological random source", () => {
    const spots = generateLoot({ bounds: FIELD_LAYOUT.bounds, obstacle: SHOP.obstacle,
        entrance: SHOP.entrance, random: () => 0 });
    assert.equal(spots.length, 12);
});

test("rarity boundaries match 60/25/12/3 weights", () => {
    for (const [roll, expected] of [[0, "Common"], [0.5999, "Common"], [0.6, "Rare"],
        [0.8499, "Rare"], [0.85, "Epic"], [0.9699, "Epic"], [0.97, "Legendary"]]) {
        assert.equal(rollRarity(() => roll), expected);
    }
    const settings = Object.values(RARITIES);
    for (let i = 1; i < settings.length; i++) {
        assert.ok(settings[i].speed > settings[i - 1].speed);
        assert.ok(settings[i].arc < settings[i - 1].arc);
    }
});

test("hints classify exact distance boundaries", () => {
    assert.equal(distanceHint(40), "You're here!");
    assert.equal(distanceHint(40.01), "You're close!");
    assert.equal(distanceHint(200), "You're close!");
    assert.equal(distanceHint(200.01), "Not close.");
});

test("timing hit includes target boundaries and wraps around zero degrees", () => {
    assert.equal(isTimingHit(359, 0, 20), true);
    assert.equal(isTimingHit(10, 0, 20), true);
    assert.equal(isTimingHit(350, 0, 20), true);
    assert.equal(isTimingHit(10.1, 0, 20), false);
    assert.equal(isTimingHit(180, 0, 20), false);
    assert.equal(isTimingHit(720, 0, 20), true);
});

test("only holding X near remaining loot starts a challenge", () => {
    const { controller, spot } = fixture();
    controller.step(0.1, false, spot.position);
    assert.equal(controller.phase, "exploration");
    controller.step(0.1, true, { x: 1000, y: 500 });
    assert.equal(controller.hint, "Not close.");
    assert.equal(controller.canInteract, false);
    controller.step(0.1, true, spot.position);
    assert.equal(controller.phase, "challenge");
    assert.equal(controller.canInteract, false);
    assert.equal(controller.target, 180);
});

test("successful timing awards once and removes the loot location", () => {
    const { controller, spot, inventory } = fixture();
    controller.step(0, true, spot.position);
    controller.step(1.5, true, spot.position);
    assert.equal(controller.angle, 180);
    controller.stopSpinner();
    controller.stopSpinner();
    assert.equal(controller.result.success, true);
    assert.equal(inventory.length, 1);
    assert.equal(inventory[0].rarity, "Common");
    assert.equal(spot.collected, true);
    controller.step(2, false, spot.position);
    controller.step(0, true, spot.position);
    assert.equal(controller.hint, "Nothing left to sniff here.");
});

test("spinner speed is frame-rate independent for every rarity", () => {
    for (const rarity of Object.keys(RARITIES)) {
        const a = fixture(rarity);
        const b = fixture(rarity);
        a.controller.step(0, true, a.spot.position);
        b.controller.step(0, true, b.spot.position);
        a.controller.step(1, true, a.spot.position);
        for (let i = 0; i < 60; i++) b.controller.step(1 / 60, true, b.spot.position);
        assert.ok(Math.abs(a.controller.angle - b.controller.angle) < 1e-8);
        assert.equal(a.controller.angle, RARITIES[rarity].speed);
    }
});

test("misses retain the same reward and require release after the attempt", () => {
    const { controller, spot, inventory } = fixture("Legendary");
    controller.step(0, true, spot.position);
    controller.stopSpinner();
    assert.equal(controller.result.success, false);
    assert.equal(inventory.length, 0);
    assert.equal(spot.collected, false);
    controller.step(2, true, spot.position);
    controller.step(0, true, spot.position);
    assert.equal(controller.phase, "exploration");
    assert.equal(controller.hint, "Release X and sniff again.");
    controller.step(0, false, spot.position);
    controller.step(0, true, spot.position);
    assert.equal(controller.phase, "challenge");
    assert.equal(controller.active, spot);
    assert.equal(controller.active.rarity, "Legendary");
});

test("timeout and cancellation never award or consume loot", () => {
    for (const reason of ["timeout", "cancelled"]) {
        const { controller, spot, inventory } = fixture();
        controller.step(0, true, spot.position);
        if (reason === "timeout") controller.step(6, false, spot.position);
        else assert.equal(controller.cancel(), true);
        controller.stopSpinner();
        assert.equal(controller.phase, "result");
        assert.equal(controller.result.reason, reason);
        assert.equal(spot.collected, false);
        assert.equal(inventory.length, 0);
    }
});

test("fresh field entries regenerate loot while the session bag persists until new Play", () => {
    startNewGame();
    const first = generateLoot({ bounds: FIELD_LAYOUT.bounds, obstacle: SHOP.obstacle,
        entrance: SHOP.entrance, random: seeded(10) });
    const controller = createLootController({ spots: first, inventory: session.inventory, random: () => 0.5 });
    controller.step(0, true, first[0].position);
    controller.step(180 / RARITIES[first[0].rarity].speed, true, first[0].position);
    controller.stopSpinner();
    const next = generateLoot({ bounds: FIELD_LAYOUT.bounds, obstacle: SHOP.obstacle,
        entrance: SHOP.entrance, random: seeded(11) });
    createLootController({ spots: next, inventory: session.inventory });
    assert.notDeepEqual(first.map((spot) => spot.position), next.map((spot) => spot.position));
    assert.ok(next.every((spot) => !spot.collected));
    assert.equal(session.inventory.length, 1);
    const bag = session.inventory;
    startNewGame();
    assert.equal(bag.length, 0);
});

test("the found popup clears sooner than a miss, which stays up for the cadet warning", () => {
    const hold = (hit) => {
        const { controller, spot } = fixture();
        controller.step(0, true, spot.position);
        if (hit) controller.step(1.5, true, spot.position);
        controller.stopSpinner();
        assert.equal(controller.result.success, hit);
        controller.step(FOUND_RESULT_SECONDS, false, spot.position);
        return controller.phase;
    };
    assert.ok(FOUND_RESULT_SECONDS < MISS_RESULT_SECONDS);
    assert.equal(hold(true), "exploration");
    assert.equal(hold(false), "result");
});
