import { test } from "node:test";
import assert from "node:assert/strict";
import { ITEMS } from "../src/items.js";
import { createLootController } from "../src/loot.js";

const BAG = "revsdayoff.bag";
const INTRO = "revsdayoff.introPlayed";
let moduleId = 0;
const freshSession = () => import(`../src/session.js?local-test=${moduleId++}`);

test("bag and intro local storage", async (t) => {
    const original = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
    t.after(() => {
        if (original) Object.defineProperty(globalThis, "localStorage", original);
        else delete globalThis.localStorage;
    });
    function storage(entries = []) {
        const values = new Map(entries);
        Object.defineProperty(globalThis, "localStorage", {
            configurable: true,
            value: {
                getItem: (key) => values.get(key) ?? null,
                setItem: (key, value) => values.set(key, value),
            },
        });
        return values;
    }

    await t.test("restores duplicates from canonical item IDs and ignores unknown items", async () => {
        storage([[BAG, '["ring","hat","ring","unknown",null,{}]']]);
        const { session } = await freshSession();
        assert.deepEqual(session.inventory, [ITEMS[2], ITEMS[5], ITEMS[2]]);
        assert.notEqual(session.inventory[0], session.inventory[2]);
    });

    await t.test("missing, corrupt, or non-array bags restore empty", async () => {
        for (const value of [null, "broken", "null", "{}", '"ring"']) {
            storage(value == null ? [] : [[BAG, value]]);
            assert.deepEqual((await freshSession()).session.inventory, []);
        }
    });

    await t.test("loot awards, sales, and theft immediately save the final bag", async () => {
        const saved = storage();
        const { session, sellOne, sellAll, stealItem } = await freshSession();
        const spot = { position: { x: 100, y: 100 }, item: ITEMS[2], rarity: "Legendary", collected: false };
        const loot = createLootController({ spots: [spot], inventory: session.inventory });
        loot.step(0, true, spot.position);
        loot.finish(true);
        assert.equal(saved.get(BAG), '["ring"]');
        session.inventory.push({ id: "hat" }, { id: "ring" });
        sellOne("ring");
        assert.equal(saved.get(BAG), '["hat","ring"]');
        stealItem(session, () => 0);
        assert.equal(saved.get(BAG), '["ring"]');
        assert.equal((await freshSession()).session.inventory[0].id, "ring");
        sellAll();
        assert.equal(saved.get(BAG), "[]");
        assert.deepEqual((await freshSession()).session.inventory, []);
    });

    await t.test("custom state sales and theft leave the saved bag alone", async () => {
        const saved = storage([[BAG, '["ring"]']]);
        const { sellOne, sellAll, stealItem } = await freshSession();
        const state = { coins: 0, inventory: [{ id: "hat" }, { id: "ring" }, { id: "meal" }] };
        sellOne("hat", state);
        stealItem(state, () => 0);
        sellAll(state);
        assert.equal(saved.get(BAG), '["ring"]');
    });

    await t.test("intro flag survives reload and Play preserves the bag and flag", async () => {
        const saved = storage();
        const { session, startNewGame } = await freshSession();
        assert.equal(session.introPlayed, false);
        session.introPlayed = true;
        assert.equal(saved.get(INTRO), "true");
        session.inventory.push({ id: "hat" });
        const bag = session.inventory;
        startNewGame();
        assert.equal(session.inventory, bag);
        assert.equal(session.inventory.length, 1);
        const restored = (await freshSession()).session;
        assert.equal(restored.introPlayed, true);
        assert.equal(restored.inventory[0].id, "hat");
        storage([[INTRO, "invalid"]]);
        assert.equal((await freshSession()).session.introPlayed, false);
    });

    await t.test("blocked storage and failed writes keep progress in memory", async () => {
        Object.defineProperty(globalThis, "localStorage", {
            configurable: true,
            get() { throw new Error("Blocked"); },
        });
        const { session } = await freshSession();
        assert.deepEqual(session.inventory, []);
        assert.equal(session.introPlayed, false);
        session.inventory.push({ id: "ring" });
        session.introPlayed = true;
        assert.equal(session.inventory.length, 1);
        assert.equal(session.introPlayed, true);
        Object.defineProperty(globalThis, "localStorage", {
            configurable: true,
            value: { getItem: () => null, setItem() { throw new Error("Full"); } },
        });
        session.inventory.splice(0, 1);
        session.introPlayed = false;
        assert.equal(session.inventory.length, 0);
        assert.equal(session.introPlayed, false);
    });
});
