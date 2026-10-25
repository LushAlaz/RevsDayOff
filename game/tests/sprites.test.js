import { test } from "node:test";
import assert from "node:assert/strict";
import { loadSprites } from "../src/sprites.js";
import { ITEMS } from "../src/items.js";
import { readFileSync } from "node:fs";

test("reward sheets are sliced into individual square item frames", () => {
    const calls = [];
    globalThis.loadSprite = (name, path, options) => calls.push({ name, path, options });
    loadSprites();
    for (const item of ITEMS) {
        const png = readFileSync(new URL(`../public/${item.path}`, import.meta.url));
        assert.equal(png.readUInt32BE(16) / item.sliceX, png.readUInt32BE(20));
        assert.deepEqual(calls.find((call) => call.name === item.sprite).options, { sliceX: item.sliceX });
    }
});

test("shop uses the flat RPG exterior asset", () => {
    const calls = [];
    globalThis.loadSprite = (name, path) => calls.push({ name, path });
    loadSprites();
    assert.ok(calls.some(({ name, path }) => name === "good-bull-shop" && path === "sprites/good-bull-2d.png"));
});

test("midfield logo loads from a local asset", () => {
    const calls = [];
    globalThis.loadSprite = (name, path) => calls.push({ name, path });
    loadSprites();
    assert.ok(calls.some(({ name, path }) => name === "tam-logo" && path === "sprites/tam-maroon.svg"));
});

test("side animations never cross into the opposite-facing frames", () => {
    let loaded;
    globalThis.loadSprite = (name, path, options) => { if (name === "reveille") loaded = { name, path, options }; };
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
