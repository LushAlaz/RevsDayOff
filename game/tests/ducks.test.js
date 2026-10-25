import { test } from "node:test";
import assert from "node:assert/strict";
import { swimArea, followTarget, stepToward, trail, canReachDucks, FOLLOW_RANGE, DUCKLING_SPACING, TALK_RANGE } from "../src/objects/ducks.js";
import { getMap } from "../src/maps.js";

const pond = getMap("aggie-park").pond;
const area = swimArea(pond);

test("ducks swim strictly inside the Aggie Park pond", () => {
    assert.ok(area.left > pond.left && area.right < pond.right);
    assert.ok(area.top > pond.top && area.bottom < pond.bottom);
    assert.ok(area.left < area.right && area.top < area.bottom);
});

test("mama heads for the water nearest Rev as she circles the bank", () => {
    // left, right, above and below the pond: always the matching edge of the water
    assert.deepEqual(followTarget(area, { x: pond.left - 60, y: 450 }), { x: area.left, y: 450 });
    assert.deepEqual(followTarget(area, { x: pond.right + 60, y: 400 }), { x: area.right, y: 400 });
    assert.deepEqual(followTarget(area, { x: 1400, y: pond.top - 60 }), { x: 1400, y: area.top });
    assert.deepEqual(followTarget(area, { x: 1300, y: pond.bottom + 60 }), { x: 1300, y: area.bottom });
    // past a corner she sits in the matching corner of the water
    assert.deepEqual(followTarget(area, { x: pond.right + 40, y: pond.bottom + 40 }), { x: area.right, y: area.bottom });
});

test("ducks ignore Rev once she is far from the pond", () => {
    assert.equal(followTarget(area, { x: area.left - FOLLOW_RANGE - 1, y: 450 }), null);
    // Rev's spawn in the middle of the park is out of range
    assert.equal(followTarget(area, getMap("aggie-park").spawn), null);
});

test("stepping never overshoots and stops on the target", () => {
    assert.deepEqual(stepToward({ x: 0, y: 0 }, { x: 30, y: 40 }, 10), { x: 6, y: 8 });
    assert.deepEqual(stepToward({ x: 0, y: 0 }, { x: 3, y: 4 }, 10), { x: 3, y: 4 });
});

test("ducklings close up to the spacing behind the duck ahead and never bump it", () => {
    assert.deepEqual(trail({ x: 0, y: 0 }, { x: 100, y: 0 }), { x: 100 - DUCKLING_SPACING, y: 0 });
    assert.deepEqual(trail({ x: 0, y: 0 }, { x: 10, y: 0 }), { x: 0, y: 0 });
});

test("Rev can talk to the ducks from the bank once they swim over, but not from across the park", () => {
    // Rev stands on the bank below the pond; the ducks come to the nearest water
    const dog = { x: 1400, y: pond.bottom + 20 };
    const mama = followTarget(area, dog);
    assert.equal(canReachDucks(dog, [mama]), true);
    assert.equal(canReachDucks(dog, [{ x: 1400, y: area.top }]), false);
    assert.equal(canReachDucks({ x: 0, y: 0 }, [mama, { x: mama.x - DUCKLING_SPACING, y: mama.y }]), false);
    assert.ok(Math.hypot(dog.x - mama.x, dog.y - mama.y) < TALK_RANGE);
});
