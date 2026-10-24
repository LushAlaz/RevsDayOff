import { test } from "node:test";
import assert from "node:assert/strict";
import { ITEMS, RARITIES } from "../src/items.js";
import { getInventoryRows, sellOne, sellAll, session, startNewGame } from "../src/session.js";
import { createSellingController, isAtCounter } from "../src/selling.js";

test("catalog has exactly the requested fixed item rarities and sale values", () => {
    assert.deepEqual(ITEMS.map(({ id, name, rarity }) => [id, name, rarity, RARITIES[rarity].sellPrice]), [
        ["towel", "12th Man Towel", "Rare", 20],
        ["jersey", "Marcel Reed Jersey", "Rare", 20],
        ["ring", "Aggie Ring", "Legendary", 150],
        ["branch", "Century Tree Branch", "Epic", 50],
        ["tshirt", "A&M T-shirt", "Common", 5],
        ["hat", "A&M Hat", "Common", 5],
        ["meal", "Maroon Meal", "Common", 5],
    ]);
});

test("single sales remove one duplicate and use canonical prices", () => {
    for (const item of ITEMS) {
        const state = { inventory: [{ id: item.id, rarity: "wrong", sellPrice: 999 }, { id: item.id }], coins: 10 };
        const bag = state.inventory;
        const price = RARITIES[item.rarity].sellPrice;
        assert.deepEqual(sellOne(item.id, state), { count: 1, coins: price });
        assert.equal(state.inventory, bag);
        assert.equal(bag.length, 1);
        assert.equal(state.coins, 10 + price);
        assert.equal(getInventoryRows(state)[0].quantity, 1);
        assert.equal(getInventoryRows(state)[0].unitPrice, price);
    }
});

test("sell all totals every item and cannot award again after the bag is empty", () => {
    const state = { inventory: [...ITEMS, { ...ITEMS[2] }], coins: 0 };
    assert.deepEqual(sellAll(state), { count: 8, coins: 405 });
    assert.equal(state.inventory.length, 0);
    assert.equal(state.coins, 405);
    assert.deepEqual(sellAll(state), { count: 0, coins: 0 });
    assert.deepEqual(sellOne("ring", state), { count: 0, coins: 0 });
    assert.equal(state.coins, 405);
});

test("empty bags and unknown IDs cannot create money", () => {
    const state = { inventory: [], coins: 0 };
    assert.deepEqual(getInventoryRows(state), []);
    sellOne("missing", state);
    sellAll(state);
    assert.equal(state.coins, 0);
});

test("menu selection survives duplicates and advances when the last copy sells", () => {
    const state = { inventory: [{ ...ITEMS[0] }, { ...ITEMS[0] }, { ...ITEMS[1] }], coins: 0 };
    const menu = createSellingController(state);
    menu.openMenu();
    assert.equal(menu.selectedId, "towel");
    menu.sellSelected();
    assert.equal(menu.selectedId, "towel");
    menu.sellSelected();
    assert.equal(menu.selectedId, "jersey");
    menu.sellSelected();
    assert.equal(menu.selectedId, null);
    assert.equal(menu.open, true);
    assert.equal(menu.total, 0);
    menu.sellSelected();
    assert.equal(state.coins, 60);
});

test("navigation, mouse selection, sell all, and closing guard sale actions", () => {
    const state = { inventory: [...ITEMS], coins: 0 };
    const menu = createSellingController(state);
    menu.sellEverything();
    assert.equal(state.inventory.length, 7);
    menu.openMenu();
    menu.navigate(-1);
    assert.equal(menu.selectedId, "meal");
    menu.select("ring");
    assert.equal(menu.selectedId, "ring");
    menu.close();
    menu.sellSelected();
    assert.equal(state.coins, 0);
    menu.openMenu();
    menu.sellEverything();
    assert.equal(menu.selectedId, null);
    assert.equal(state.coins, 255);
    assert.equal(menu.open, true);
});

test("session coins survive shop menu visits and reset along with inventory on new Play", () => {
    startNewGame();
    session.inventory.push({ id: "ring" });
    const firstVisit = createSellingController();
    firstVisit.openMenu();
    firstVisit.sellSelected();
    firstVisit.close();
    const nextVisit = createSellingController();
    nextVisit.openMenu();
    assert.equal(session.coins, 150);
    assert.equal(nextVisit.rows.length, 0);
    session.inventory.push({ id: "meal" });
    startNewGame();
    assert.equal(session.coins, 0);
    assert.equal(session.inventory.length, 0);
});

test("counter interaction is restricted to the area below its front edge", () => {
    assert.equal(isAtCounter({ x: 160, y: 240 }), true);
    assert.equal(isAtCounter({ x: 640, y: 320 }), true);
    assert.equal(isAtCounter({ x: 400, y: 280 }), true);
    assert.equal(isAtCounter({ x: 159, y: 280 }), false);
    assert.equal(isAtCounter({ x: 400, y: 321 }), false);
    assert.equal(isAtCounter({ x: 856, y: 400 }), false);
});
