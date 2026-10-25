import { test } from "node:test";
import assert from "node:assert/strict";
import { MAPS, getMap, getShopReturn, cycleMap } from "../src/maps.js";
import { SHOP } from "../src/shop.js";
import { generateLoot } from "../src/loot.js";
import { getCameraPosition } from "../src/camera.js";
import { session, startNewGame } from "../src/session.js";

function randomFor(seed) {
    let value = seed;
    return () => { value = (Math.imul(value, 1664525) + 1013904223) >>> 0; return value / 4294967296; };
}
function blocked(point, map, padding = 32) {
    return point.x < padding || point.y < padding || point.x > map.bounds.right - padding || point.y > map.bounds.bottom - padding
        || map.obstacles.some((box) => point.x > box.left - padding && point.x < box.right + padding
            && point.y > box.top - padding && point.y < box.bottom + padding);
}

test("maps have the requested relative dimensions and share a safe shop corner", () => {
    const kyle = getMap("kyle-field");
    const park = getMap("aggie-park");
    const drill = getMap("drill-field");
    assert.ok(park.bounds.right > kyle.bounds.right && park.bounds.bottom > kyle.bounds.bottom);
    assert.ok(drill.bounds.right < kyle.bounds.right && drill.bounds.bottom < kyle.bounds.bottom);
    for (const map of MAPS) {
        assert.equal(map.obstacles[0], SHOP.obstacle);
        assert.equal(blocked(map.spawn, map), false);
        assert.equal(blocked(SHOP.returnSpawn, map), false);
        assert.ok(map.obstacles.slice(1).every((box) => box.left >= 260 || box.top >= 320));
        assert.deepEqual(getShopReturn(map.id), { mapId: map.id, spawn: SHOP.returnSpawn });
    }
});

test("map selection wraps, remembers the chosen area, and does not alter the bag or coins", () => {
    startNewGame();
    session.inventory.push({ id: "ring" });
    session.coins = 150;
    assert.equal(cycleMap("kyle-field", -1).id, "drill-field");
    assert.equal(cycleMap("drill-field", 1).id, "kyle-field");
    for (const map of MAPS) {
        session.mapId = map.id;
        assert.equal(getMap(session.mapId), map);
        getShopReturn(map.id);
        assert.equal(session.coins, 150);
        assert.equal(session.inventory.length, 1);
    }
    assert.equal(getMap("missing").id, "kyle-field");
    startNewGame();
    assert.equal(session.mapId, "kyle-field");
});

test("camera clamps to every map, centering the short Drill Field height", () => {
    const view = { width: 960, height: 540 };
    for (const map of MAPS) {
        for (const point of [{ x: 0, y: 0 }, map.spawn, { x: 9999, y: 9999 }]) {
            const camera = getCameraPosition(point, map.bounds, view);
            assert.ok(camera.x >= 480 && camera.x <= map.bounds.right - 480);
            if (map.bounds.bottom >= 540) {
                assert.ok(camera.y >= 270 && camera.y <= map.bounds.bottom - 270);
            } else assert.equal(camera.y, map.bounds.bottom / 2);
        }
    }
});

test("all generated loot and the shop are reachable around terrain on every map", () => {
    for (const map of MAPS) {
        // Flood-fill a 16-pixel grid with obstacles expanded by the player's half-size.
        const key = ({ x, y }) => `${x},${y}`;
        const snap = (point) => ({ x: Math.round(point.x / 16) * 16, y: Math.round(point.y / 16) * 16 });
        const start = snap(map.spawn);
        const queue = [start];
        const reached = new Set([key(start)]);
        for (let index = 0; index < queue.length; index++) {
            const point = queue[index];
            for (const [dx, dy] of [[16, 0], [-16, 0], [0, 16], [0, -16]]) {
                const next = { x: point.x + dx, y: point.y + dy };
                if (!blocked(next, map) && !reached.has(key(next))) {
                    reached.add(key(next)); queue.push(next);
                }
            }
        }
        assert.ok(reached.has(key(snap(SHOP.returnSpawn))), `${map.id}: shop return is reachable`);
        for (let seed = 1; seed <= 20; seed++) {
            const spots = generateLoot({ bounds: map.bounds, obstacles: map.obstacles,
                entrance: SHOP.entrance, random: randomFor(seed) });
            assert.equal(spots.length, 12, map.id);
            for (const [index, spot] of spots.entries()) {
                assert.equal(blocked(spot.position, map, 64), false);
                assert.ok(reached.has(key(snap(spot.position))), `${map.id}: loot is reachable`);
                for (const prior of spots.slice(0, index)) {
                    assert.ok(Math.hypot(spot.position.x - prior.position.x, spot.position.y - prior.position.y) >= 140);
                }
            }
        }
        const fallback = generateLoot({ bounds: map.bounds, obstacles: map.obstacles, entrance: SHOP.entrance, random: () => 0 });
        assert.equal(fallback.length, 12);
        assert.ok(fallback.every((spot) => reached.has(key(snap(spot.position)))));
    }
});
