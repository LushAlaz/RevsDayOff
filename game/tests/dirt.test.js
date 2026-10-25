import { test } from "node:test";
import assert from "node:assert/strict";
import { dirtAppearance, addDirtEffect } from "../src/dirt.js";

test("dirt scatters, remains visible for five seconds, then fades out completely", () => {
    assert.equal(dirtAppearance(0).scatter, 0);
    assert.equal(dirtAppearance(0.55).scatter, 1);
    assert.equal(dirtAppearance(4).opacity, 1);
    assert.ok(dirtAppearance(4.65).opacity > 0 && dirtAppearance(4.65).opacity < 1);
    assert.equal(dirtAppearance(4.999).visible, true);
    assert.deepEqual(dirtAppearance(5), { visible: false, scatter: 1, opacity: 0 });
});

test("dirt stays at the copied dig location and destroys itself after five seconds", () => {
    let delta = 0;
    globalThis.pos = (x, y) => ({ pos: { x, y } });
    globalThis.z = (value) => ({ z: value });
    globalThis.dt = () => delta;
    globalThis.add = (components) => Object.assign({
        onUpdate(callback) { this.update = callback; },
        destroy() { this.destroyed = true; },
    }, ...components);
    const position = { x: 400, y: 300 };
    const dirt = addDirtEffect(position);
    position.x = 500;
    delta = 4.9; dirt.update();
    assert.deepEqual(dirt.pos, { x: 400, y: 300 });
    assert.equal(dirt.destroyed, undefined);
    delta = 0.11; dirt.update();
    assert.equal(dirt.destroyed, true);
    assert.equal(dirt.z, 1);
});
