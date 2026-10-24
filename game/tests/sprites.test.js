import { test } from "node:test";
import assert from "node:assert/strict";
import { loadSprites } from "../src/sprites.js";

test("side animations never cross into the opposite-facing frames", () => {
    let loaded;
    globalThis.loadSprite = (name, path, options) => { loaded = { name, path, options }; };
    loadSprites();
    assert.equal(loaded.name, "reveille");
    assert.equal(loaded.path, "sprites/Reveille.png");
    assert.equal(loaded.options.sliceX, 11);
    const { anims } = loaded.options;
    assert.deepEqual(anims.left, { from: 6, to: 8, speed: 8, loop: true });
    assert.deepEqual(anims.right, { from: 9, to: 10, speed: 8, loop: true });
    assert.deepEqual(anims.down, { from: 0, to: 2, speed: 8, loop: true });
    assert.deepEqual(anims.up, { from: 3, to: 5, speed: 8, loop: true });
});
