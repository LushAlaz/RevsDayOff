import { test } from "node:test";
import assert from "node:assert/strict";

const KEY = "revsdayoff.coins";
let moduleId = 0;
const freshSession = () => import(`../src/session.js?storage-test=${moduleId++}`);

test("coin session storage", async (t) => {
    const original = Object.getOwnPropertyDescriptor(globalThis, "sessionStorage");
    t.after(() => {
        if (original) Object.defineProperty(globalThis, "sessionStorage", original);
        else delete globalThis.sessionStorage;
    });
    function storage(saved) {
        const values = new Map(saved == null ? [] : [[KEY, saved]]);
        Object.defineProperty(globalThis, "sessionStorage", {
            configurable: true,
            value: {
                getItem: (key) => values.get(key) ?? null,
                setItem: (key, value) => values.set(key, value),
            },
        });
        return values;
    }

    await t.test("restores valid balances and defaults invalid or missing data to zero", async () => {
        for (const [saved, expected] of [
            [null, 0], ["0", 0], ["255", 255], [String(Number.MAX_SAFE_INTEGER), Number.MAX_SAFE_INTEGER],
            ["", 0], [" ", 0], ["garbage", 0], ["-10", 0], ["1.5", 0], ["Infinity", 0],
            ["NaN", 0], ["1e3", 0], ["9007199254740992", 0],
        ]) {
            storage(saved);
            const { session } = await freshSession();
            assert.equal(session.coins, expected, `saved value: ${saved}`);
        }
    });

    await t.test("saves balance changes immediately and restores after module reload", async () => {
        const saved = storage("40");
        const { session } = await freshSession();
        session.coins += 20;
        assert.equal(saved.get(KEY), "60");
        session.coins -= 15;
        assert.equal(saved.get(KEY), "45");
        const reloaded = await freshSession();
        assert.equal(reloaded.session.coins, 45);
    });

    await t.test("Play keeps saved coins and inventory but resets the map", async () => {
        const saved = storage("150");
        const { session, startNewGame } = await freshSession();
        const bag = session.inventory;
        session.inventory.push({ id: "ring" });
        session.mapId = "aggie-park";
        startNewGame();
        assert.equal(session.coins, 150);
        assert.equal(saved.get(KEY), "150");
        assert.equal(session.inventory, bag);
        assert.deepEqual(bag, [{ id: "ring" }]);
        assert.equal(session.mapId, "kyle-field");
    });

    await t.test("single and bulk sales persist only shared session balances", async () => {
        const saved = storage("10");
        const { session, sellOne, sellAll } = await freshSession();
        session.inventory.push({ id: "ring" }, { id: "hat" });
        sellOne("ring");
        assert.equal(saved.get(KEY), "160");
        sellAll();
        assert.equal(saved.get(KEY), "165");
        const custom = { coins: 0, inventory: [{ id: "ring" }, { id: "hat" }] };
        sellOne("ring", custom);
        sellAll(custom);
        assert.equal(custom.coins, 155);
        assert.equal(session.coins, 165);
        assert.equal(saved.get(KEY), "165");
    });

    await t.test("unavailable or blocked storage does not prevent play", async () => {
        delete globalThis.sessionStorage;
        const missing = await freshSession();
        missing.session.coins = 20;
        assert.equal(missing.session.coins, 20);
        Object.defineProperty(globalThis, "sessionStorage", {
            configurable: true,
            get() { throw new Error("Storage blocked"); },
        });
        const blocked = await freshSession();
        assert.equal(blocked.session.coins, 0);
        blocked.session.coins = 30;
        assert.equal(blocked.session.coins, 30);
    });

    await t.test("read and write failures fall back to in-memory coins", async () => {
        Object.defineProperty(globalThis, "sessionStorage", {
            configurable: true,
            value: {
                getItem() { throw new Error("Read failed"); },
                setItem() { throw new Error("Quota exceeded"); },
            },
        });
        const { session, sellOne } = await freshSession();
        assert.equal(session.coins, 0);
        session.inventory.push({ id: "ring" });
        sellOne("ring");
        assert.equal(session.coins, 150);
        assert.deepEqual(session.inventory, []);
    });
});
