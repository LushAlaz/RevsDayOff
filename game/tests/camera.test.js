import { test } from "node:test";
import assert from "node:assert/strict";
import { getCameraPosition, followPlayer } from "../src/camera.js";

const bounds = { left: 0, top: 0, right: 2400, bottom: 1350 };
const viewport = { width: 960, height: 540 };

test("camera tracks the player directly inside the map", () => {
    for (const target of [{ x: 1200, y: 675 }, { x: 1305, y: 700 }]) {
        assert.deepEqual(getCameraPosition(target, bounds, viewport), target);
    }
});

test("camera clamps at each edge and corner", () => {
    for (const [target, expected] of [
        [{ x: 16, y: 675 }, { x: 480, y: 675 }],
        [{ x: 2384, y: 675 }, { x: 1920, y: 675 }],
        [{ x: 1200, y: 20 }, { x: 1200, y: 270 }],
        [{ x: 1200, y: 1330 }, { x: 1200, y: 1080 }],
        [{ x: 16, y: 20 }, { x: 480, y: 270 }],
        [{ x: 2384, y: 20 }, { x: 1920, y: 270 }],
        [{ x: 16, y: 1330 }, { x: 480, y: 1080 }],
        [{ x: 2384, y: 1330 }, { x: 1920, y: 1080 }],
    ]) {
        assert.deepEqual(getCameraPosition(target, bounds, viewport), expected);
    }
});

test("small map axes are centered independently, including offset worlds", () => {
    assert.deepEqual(getCameraPosition({ x: 0, y: 0 },
        { left: 100, top: 200, right: 500, bottom: 500 }, viewport), { x: 300, y: 350 });
    assert.deepEqual(getCameraPosition({ x: 300, y: 900 },
        { left: 100, top: 200, right: 500, bottom: 1600 }, viewport), { x: 300, y: 900 });
    assert.deepEqual(getCameraPosition({ x: 1200, y: 0 },
        { left: 0, top: 200, right: 2400, bottom: 500 }, viewport), { x: 1200, y: 350 });
});

test("follow initializes immediately and tracks the latest position each frame", () => {
    const calls = [];
    const callbacks = [];
    const player = { pos: { x: 1200, y: 675 }, onUpdate: (fn) => callbacks.push(fn) };
    globalThis.width = () => viewport.width;
    globalThis.height = () => viewport.height;
    globalThis.setCamPos = (x, y) => calls.push({ x, y });
    followPlayer(player, bounds);
    assert.deepEqual(calls, [{ x: 1200, y: 675 }]);
    player.pos = { x: 1400, y: 800 };
    callbacks[0]();
    assert.deepEqual(calls.at(-1), player.pos);
    player.pos = { x: 2384, y: 1330 };
    callbacks[0]();
    assert.deepEqual(calls.at(-1), { x: 1920, y: 1080 });
});
