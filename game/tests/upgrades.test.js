import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import {
    UPGRADES, buyUpgrade, hasUpgrade, playerSpeed, rarityWeights, createUpgradeShop, isAtUpgradeStand,
    BASE_SPEED, RED_BULL_SPEED, CLOVER_WEIGHTS, TOOTHBRUSH_MULTIPLIER,
} from "../src/upgrades.js";
import { rollRarity, generateLoot } from "../src/loot.js";
import { RARITIES } from "../src/items.js";
import { session, startNewGame } from "../src/session.js";
import { createPresence } from "../src/presence.js";

const { RULES, TOOTHBRUSH_MULTIPLIER: SERVER_MULTIPLIER, createBevoState, createBevoController } =
    createRequire(import.meta.url)("../../express/bevo.js");
const wallet = (coins, upgrades = []) => ({ inventory: [], coins, upgrades: [...upgrades] });

test("the shop sells the four requested upgrades, the crown being the expensive one", () => {
    assert.deepEqual(UPGRADES.map((upgrade) => upgrade.id), ["redbull", "clover", "toothbrush", "crown"]);
    const crown = UPGRADES.find((upgrade) => upgrade.id === "crown");
    assert.ok(UPGRADES.every((upgrade) => upgrade.price > 0 && upgrade.price <= crown.price));
});

test("buying takes the price once, refuses repeats and empty wallets", () => {
    const state = wallet(100);
    assert.deepEqual(buyUpgrade("redbull", state), { ok: true });
    assert.equal(state.coins, 40);
    assert.equal(hasUpgrade("redbull", state), true);
    assert.deepEqual(buyUpgrade("redbull", state), { ok: false, reason: "owned" });
    assert.deepEqual(buyUpgrade("clover", state), { ok: false, reason: "coins" });
    assert.deepEqual(buyUpgrade("jetpack", state), { ok: false, reason: "unknown" });
    assert.equal(state.coins, 40);
    assert.deepEqual(state.upgrades, ["redbull"]);
});

test("exact change works and upgrades reset with a new game", () => {
    startNewGame();
    session.coins = 1000;
    assert.equal(buyUpgrade("crown").ok, true);
    assert.equal(session.coins, 0);
    const list = session.upgrades;
    startNewGame();
    assert.equal(hasUpgrade("crown"), false);
    assert.equal(session.upgrades, list, "same array, so anything holding it sees the reset");
});

test("the Red Bull speeds Rev up", () => {
    assert.equal(playerSpeed(wallet(0)), BASE_SPEED);
    assert.equal(playerSpeed(wallet(0, ["redbull"])), RED_BULL_SPEED);
    assert.ok(RED_BULL_SPEED > BASE_SPEED);
});

test("the clover shifts odds toward rarer loot and still adds up to 100", () => {
    const normal = rarityWeights(wallet(0));
    const lucky = rarityWeights(wallet(0, ["clover"]));
    assert.deepEqual(normal, Object.fromEntries(Object.entries(RARITIES).map(([name, r]) => [name, r.weight])));
    assert.equal(Object.values(lucky).reduce((a, b) => a + b, 0), 100);
    for (const rarity of ["Rare", "Epic", "Legendary"]) assert.ok(lucky[rarity] > normal[rarity], rarity);
    assert.ok(lucky.Common < normal.Common);
    // a roll of 0.95 is Epic normally (cutoff 97) but Legendary with the clover (cutoff 92)
    assert.equal(rollRarity(() => 0.95), "Epic");
    assert.equal(rollRarity(() => 0.95, CLOVER_WEIGHTS), "Legendary");
    // over many placements, a clover field has more rare-or-better loot
    let seed = 7;
    const random = () => (seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296;
    const rareCount = (weights) => {
        let rare = 0;
        for (let i = 0; i < 40; i++) {
            rare += generateLoot({ bounds: { left: 0, top: 0, right: 1920, bottom: 960 }, entrance: { x: 0, y: 0 }, random, weights })
                .filter((spot) => spot.rarity !== "Common").length;
        }
        return rare;
    };
    assert.ok(rareCount(CLOVER_WEIGHTS) > rareCount(null));
});

test("the upgrade menu selects, wraps, buys and explains why it can't", () => {
    const state = wallet(70);
    const shop = createUpgradeShop(state);
    shop.buySelected();
    assert.equal(state.upgrades.length, 0, "a closed menu does nothing");
    shop.openMenu();
    shop.navigate(-1);
    assert.equal(shop.selectedId, "crown");
    shop.buySelected();
    assert.equal(shop.message, "The Royal Crown costs 1000 coins. You have 70.");
    shop.navigate(1);
    assert.equal(shop.selectedId, "redbull");
    shop.buySelected();
    assert.equal(shop.message, "Bought the Red Bull!");
    assert.equal(state.coins, 10);
    assert.deepEqual(shop.rows.map((row) => row.owned), [true, false, false, false]);
    shop.buySelected();
    assert.equal(shop.message, "You already have the Red Bull.");
    shop.select("toothbrush");
    assert.equal(shop.selectedId, "toothbrush");
});

test("the stand's browse spot is in front of it and away from the counter and exit", () => {
    assert.equal(isAtUpgradeStand({ x: 775, y: 200 }), true);
    assert.equal(isAtUpgradeStand({ x: 400, y: 280 }), false, "selling counter");
    assert.equal(isAtUpgradeStand({ x: 856, y: 400 }), false, "exit");
});

test("a toothbrush doubles one player's chomp damage on Bevo, matching the server's multiplier", () => {
    assert.equal(SERVER_MULTIPLIER, TOOTHBRUSH_MULTIPLIER);
    const players = { a: { x: 700, y: 240, toothbrush: true }, b: { x: 850, y: 240 } };
    let clock = 0;
    const state = createBevoState();
    const boss = createBevoController(state, { getPlayers: () => players, now: () => clock });
    assert.equal(boss.summon("a", state.encounterId), true);
    clock = 2; boss.step(0);
    assert.equal(boss.bite("a", 1), true);
    assert.equal(state.hp, RULES.hp - RULES.biteDamage * TOOTHBRUSH_MULTIPLIER);
    assert.equal(boss.bite("b", 1), true);
    assert.equal(state.hp, RULES.hp - RULES.biteDamage * (TOOTHBRUSH_MULTIPLIER + 1), "no toothbrush: normal damage");
});

test("presence shares the crown and toothbrush on joining and reads others' crowns", () => {
    const handlers = new Map();
    const emitted = [];
    const socket = { id: "self", connected: true, on: (event, fn) => handlers.set(event, fn), off() {},
        emit: (event, data) => emitted.push({ event, data }), disconnect() {} };
    const presence = createPresence({ socket, mapId: "kyle-field", bounds: { left: 0, top: 0, right: 1440, bottom: 640 },
        getLocal: () => ({ x: 100, y: 100, direction: "down" }), now: () => 0,
        getProfile: () => ({ crown: true, toothbrush: false }) });
    handlers.get("connect")();
    const join = emitted.find(({ event }) => event === "join_room").data;
    assert.equal(join.crown, true);
    assert.equal(join.toothbrush, false);
    handlers.get("update_data")({ room: {
        royal: { x: 300, y: 300, direction: "left", crown: true },
        plain: { x: 400, y: 300, direction: "left" },
        sneaky: { x: 500, y: 300, direction: "left", crown: "yes" },
    } });
    assert.equal(presence.records.get("royal").crown, true);
    assert.equal(presence.records.get("plain").crown, false);
    assert.equal(presence.records.get("sneaky").crown, false);
    presence.dispose();
});
