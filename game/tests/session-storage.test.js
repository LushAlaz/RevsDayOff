import { test } from "node:test";
import assert from "node:assert/strict";

const KEY = "revsdayoff.coins";
let moduleId = 0;
const freshSession = () => import(`../src/session.js?storage-test=${moduleId++}`);

test("coin local storage", async (t) => {
    const legacy = Object.getOwnPropertyDescriptor(globalThis, "sessionStorage");
    Object.defineProperty(globalThis, "sessionStorage", { configurable: true, value: { getItem: () => null } });
    const original = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
    t.after(() => {
        if (legacy) Object.defineProperty(globalThis, "sessionStorage", legacy);
        else delete globalThis.sessionStorage;
        if (original) Object.defineProperty(globalThis, "localStorage", original);
        else delete globalThis.localStorage;
    });
    function storage(saved) {
        const values = new Map(saved == null ? [] : [[KEY, saved]]);
        Object.defineProperty(globalThis, "localStorage", {
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
        delete globalThis.localStorage;
        const missing = await freshSession();
        missing.session.coins = 20;
        assert.equal(missing.session.coins, 20);
        Object.defineProperty(globalThis, "localStorage", {
            configurable: true,
            get() { throw new Error("Storage blocked"); },
        });
        const blocked = await freshSession();
        assert.equal(blocked.session.coins, 0);
        blocked.session.coins = 30;
        assert.equal(blocked.session.coins, 30);
    });

    await t.test("read and write failures fall back to in-memory coins", async () => {
        Object.defineProperty(globalThis, "localStorage", {
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

    await t.test("migrates a legacy tab balance and restores it after the tab storage is gone", async () => {
        const saved = storage(null);
        const legacyValues = new Map([[KEY, "125"]]);
        Object.defineProperty(globalThis, "sessionStorage", {
            configurable: true,
            value: {
                getItem: (key) => legacyValues.get(key) ?? null,
                removeItem: (key) => legacyValues.delete(key),
            },
        });
        assert.equal((await freshSession()).session.coins, 125);
        assert.equal(saved.get(KEY), "125");
        assert.equal(legacyValues.has(KEY), false);
        delete globalThis.sessionStorage;
        assert.equal((await freshSession()).session.coins, 125);
    });

    await t.test("existing local balance including zero takes precedence over old tab data", async () => {
        Object.defineProperty(globalThis, "sessionStorage", {
            configurable: true, value: { getItem: () => "999" },
        });
        for (const [value, expected] of [["0", 0], ["40", 40], ["invalid", 0]]) {
            storage(value);
            assert.equal((await freshSession()).session.coins, expected);
        }
    });

    await t.test("failed migration does not delete the legacy balance", async () => {
        let removed = false;
        Object.defineProperty(globalThis, "sessionStorage", {
            configurable: true,
            value: { getItem: () => "75", removeItem() { removed = true; } },
        });
        Object.defineProperty(globalThis, "localStorage", {
            configurable: true,
            value: { getItem: () => null, setItem() { throw new Error("Full"); } },
        });
        assert.equal((await freshSession()).session.coins, 75);
        assert.equal(removed, false);
    });
});
