import { test } from "node:test";
import assert from "node:assert/strict";
import { blockFill } from "../src/transition.js";

const cols = 16, rows = 9;

test("the wipe starts empty and ends with every block filled", () => {
    for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
            assert.equal(blockFill(0, col, row, cols, rows), 0);
            assert.equal(blockFill(1, col, row, cols, rows), 1, `${col},${row}`);
        }
    }
});

test("blocks fill in a diagonal sweep from the top-left", () => {
    const halfway = 0.5;
    const first = blockFill(halfway, 0, 0, cols, rows);
    const middle = blockFill(halfway, 8, 4, cols, rows);
    const last = blockFill(halfway, cols - 1, rows - 1, cols, rows);
    assert.ok(first > middle && middle > last, `${first} > ${middle} > ${last}`);
    assert.equal(last, 0, "the far corner hasn't started yet");
    // blocks on the same diagonal move together
    assert.equal(blockFill(halfway, 3, 1, cols, rows), blockFill(halfway, 1, 3, cols, rows));
});

test("fill never leaves 0..1 and never shrinks while covering", () => {
    for (let col = 0; col < cols; col += 5) {
        let previous = 0;
        for (let step = 0; step <= 20; step++) {
            const fill = blockFill(step / 20, col, 4, cols, rows);
            assert.ok(fill >= 0 && fill <= 1);
            assert.ok(fill >= previous);
            previous = fill;
        }
    }
});
