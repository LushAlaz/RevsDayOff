import { test } from "node:test";
import assert from "node:assert/strict";
import { addSniffingEffect } from "../src/sniffing-ui.js";

test("shared sniff indicator hides on release and animates particles relative to its player", () => {
    for (const name of ["text", "anchor", "outline", "rgb", "z", "circle", "color", "opacity"]) {
        globalThis[name] = () => ({});
    }
    globalThis.pos = (x, y) => ({ pos: { x, y } });
    globalThis.vec2 = (x, y) => ({ x, y });
    globalThis.dt = () => 0.1;
    const children = [];
    const player = {
        add(components) { const child = Object.assign({}, ...components); children.push(child); return child; },
        onUpdate(callback) { this.update = callback; },
    };
    let sniffing = false;
    addSniffingEffect(player, () => sniffing);
    assert.ok(children.every((child) => child.hidden));
    sniffing = true; player.update();
    assert.ok(children.every((child) => !child.hidden));
    const previous = { ...children[1].pos };
    player.update();
    assert.notDeepEqual(children[1].pos, previous);
    assert.deepEqual(children[0].pos, { x: 0, y: -42 });
    sniffing = false; player.update();
    assert.ok(children.every((child) => child.hidden));
});
