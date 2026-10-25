import { test } from "node:test";
import assert from "node:assert/strict";
import { titleScene } from "../src/scenes/title.js";
import { profileScene } from "../src/scenes/profile.js";
import { profile } from "../src/profile.js";
import { session } from "../src/session.js";

function harness(t) {
    const originals = new Map();
    function stub(key, value) {
        originals.set(key, Object.getOwnPropertyDescriptor(globalThis, key));
        Object.defineProperty(globalThis, key, { configurable: true, writable: true, value });
    }
    const scenes = new Map();
    const keys = new Map();
    const listeners = new Map();
    const leaves = [];
    const calls = [];
    const objects = [];
    const oldProfile = { ...profile };
    const oldIntro = session.introPlayed;
    const oldMap = session.mapId;
    const oldBag = session.inventory.slice();
    stub("localStorage", { getItem: () => null, setItem() {} });
    stub("sessionStorage", { getItem: () => null, setItem() {} });
    for (const key of ["loadSprite", "setCamPos", "setCursor", "setBackground", "onUpdate", "onResize", "wait"]) stub(key, () => {});
    for (const key of ["sprite", "rect", "pos", "scale", "anchor", "mask", "area", "opacity", "z", "rgb"]) {
        stub(key, (...args) => ({ kind: key, args }));
    }
    stub("vec2", (x, y = x) => ({ x, y }));
    stub("center", () => ({ x: 480, y: 270 }));
    stub("width", () => 960);
    stub("height", () => 540);
    stub("scene", (name, callback) => scenes.set(name, callback));
    stub("onKeyPress", (key, callback) => keys.set(key, callback));
    stub("onSceneLeave", (callback) => leaves.push(callback));
    stub("go", (...args) => calls.push(args));
    stub("window", {
        addEventListener: (name, callback) => listeners.set(name, callback),
        removeEventListener: (name, callback) => {
            if (listeners.get(name) === callback) listeners.delete(name);
        },
    });
    function add(components) {
        const object = { components, add, pos: { x: 0, y: 0 }, play() {}, onUpdate() {},
            onClick(fn) { this.click = fn; }, onHover() {}, onHoverEnd() {} };
        objects.push(object);
        return object;
    }
    stub("add", add);
    t.after(() => {
        Object.assign(profile, oldProfile);
        session.introPlayed = oldIntro;
        session.mapId = oldMap;
        session.inventory.splice(0, session.inventory.length, ...oldBag);
        for (const [key, descriptor] of originals) {
            if (descriptor) Object.defineProperty(globalThis, key, descriptor);
            else delete globalThis[key];
        }
    });
    return { scenes, keys, listeners, leaves, calls, objects,
        type(key, repeat = false) { listeners.get("keydown")({ key, repeat, preventDefault() {} }); } };
}

test("Play routes named and unnamed players according to saved intro progress", (t) => {
    const h = harness(t);
    titleScene();
    session.inventory.push({ id: "ring" });
    const bag = session.inventory;
    for (const named of [false, true]) {
        for (const seen of [false, true]) {
            Object.assign(profile, named ? { username: "rev_fan", displayName: "Rev" } : { username: "", displayName: "" });
            session.introPlayed = seen;
            session.mapId = "aggie-park";
            h.scenes.get("title")();
            const next = seen ? "mapSelect" : "intro";
            h.keys.get("enter")();
            assert.deepEqual(h.calls.at(-1), named ? [next] : ["profile", { next, back: "title" }]);
            const count = h.calls.length;
            h.keys.get("enter")();
            assert.equal(h.calls.length, count, "Play transitions only once per scene");
            assert.equal(session.mapId, "kyle-field");
            assert.equal(session.inventory, bag);
            assert.equal(bag.at(-1).id, "ring");
        }
    }
});

test("profile Continue button validates and saves; held Enter cannot auto-save", (t) => {
    const h = harness(t);
    Object.assign(profile, { username: "", displayName: "" });
    profileScene();
    h.scenes.get("profile")({ next: "mapSelect" });
    const button = h.objects.find((object) => object.components.some((c) => c.kind === "rect" && c.args[0] === 240));
    button.click();
    assert.equal(h.calls.length, 0);
    for (const char of "Rev_Fan") h.type(char);
    h.type("Enter");
    h.type("Enter", true);
    assert.equal(h.calls.length, 0);
    for (const char of "Gig Em") h.type(char);
    button.click();
    assert.deepEqual(profile, { username: "Rev_Fan", displayName: "Gig Em" });
    assert.deepEqual(h.calls, [["mapSelect"]]);
    button.click();
    assert.equal(h.calls.length, 1);
    h.leaves.forEach((leave) => leave());
    assert.equal(h.listeners.has("keydown"), false);
});

test("cancelling a name edit returns without saving", (t) => {
    const h = harness(t);
    Object.assign(profile, { username: "rev_fan", displayName: "Rev" });
    profileScene();
    h.scenes.get("profile")({ next: "mapSelect", back: "mapSelect" });
    h.type("X");
    h.type("Escape");
    assert.deepEqual(profile, { username: "rev_fan", displayName: "Rev" });
    assert.deepEqual(h.calls, [["mapSelect"]]);
});
