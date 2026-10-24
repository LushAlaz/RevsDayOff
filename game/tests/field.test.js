import { test } from "node:test";
import assert from "node:assert/strict";
import { FIELD_LAYOUT } from "../src/field.js";
import { getCameraPosition } from "../src/camera.js";

test("compact field has equal ten-yard end zones and a hundred-yard playing surface", () => {
    const field = FIELD_LAYOUT;
    assert.deepEqual(field.bounds, { left: 0, top: 0, right: 1440, bottom: 640 });
    assert.equal(field.playingLeft - field.bounds.left, 120);
    assert.equal(field.bounds.right - field.playingRight, 120);
    assert.equal(field.endZoneWidth, 10 * field.pixelsPerYard);
    assert.equal(field.playingRight - field.playingLeft, 100 * field.pixelsPerYard);
    assert.deepEqual(field.center, { x: 720, y: 320 });
});

test("yard lines and numbers are symmetric about midfield", () => {
    const { yardLines, yardNumbers, playingLeft, playingRight, center } = FIELD_LAYOUT;
    assert.equal(yardLines.length, 21);
    assert.equal(yardLines[0], playingLeft);
    assert.equal(yardLines.at(-1), playingRight);
    assert.equal(yardLines[10], center.x);
    assert.deepEqual(yardNumbers.map((number) => number.label),
        ["10", "20", "30", "40", "50", "40", "30", "20", "10"]);
    for (let i = 0; i < yardNumbers.length; i++) {
        assert.equal(yardNumbers[i].x + yardNumbers.at(-1 - i).x, center.x * 2);
    }
});

test("camera can reach both end zones without showing outside the compact map", () => {
    const view = { width: 960, height: 540 };
    assert.deepEqual(getCameraPosition(FIELD_LAYOUT.center, FIELD_LAYOUT.bounds, view), FIELD_LAYOUT.center);
    assert.deepEqual(getCameraPosition({ x: 32, y: 32 }, FIELD_LAYOUT.bounds, view), { x: 480, y: 270 });
    assert.deepEqual(getCameraPosition({ x: 1408, y: 608 }, FIELD_LAYOUT.bounds, view), { x: 960, y: 370 });
});
