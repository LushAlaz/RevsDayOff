import { ITEMS, RARITIES } from "./items.js";

const COINS_STORAGE_KEY = "revsdayoff.coins";
const BAG_STORAGE_KEY = "revsdayoff.bag";
const INTRO_STORAGE_KEY = "revsdayoff.introPlayed";

function readLocal(key) {
    try {
        return globalThis.localStorage?.getItem(key) ?? null;
    } catch {
        return null;
    }
}

function writeLocal(key, value) {
    try {
        globalThis.localStorage?.setItem(key, value);
    } catch {
        // Continue playing with in-memory progress when storage is unavailable.
    }
}

function restoreBag() {
    try {
        const ids = JSON.parse(readLocal(BAG_STORAGE_KEY));
        if (!Array.isArray(ids)) return [];
        return ids.flatMap((id) => {
            const item = ITEMS.find((entry) => entry.id === id);
            return item ? [{ ...item }] : [];
        });
    } catch {
        return [];
    }
}

// Observe the shared array so loot awards, sales, and cadet theft save immediately.
// Keep the same array reference held by controllers throughout the game.
const inventory = new Proxy(restoreBag(), {
    set(bag, property, value) {
        const changed = Reflect.set(bag, property, value);
        writeLocal(BAG_STORAGE_KEY, JSON.stringify(bag.filter(Boolean).map((item) => item.id)));
        return changed;
    },
    deleteProperty(bag, property) {
        const changed = Reflect.deleteProperty(bag, property);
        writeLocal(BAG_STORAGE_KEY, JSON.stringify(bag.filter(Boolean).map((item) => item.id)));
        return changed;
    },
});
let introPlayed = readLocal(INTRO_STORAGE_KEY) === "true";

function restoreCoins() {
    let saved = readLocal(COINS_STORAGE_KEY);
    // Preserve balances from the previous session-storage implementation.
    const migrate = saved === null;
    try {
        if (migrate) saved = globalThis.sessionStorage?.getItem(COINS_STORAGE_KEY);
    } catch { /* legacy storage may be blocked */ }
    if (saved == null || !/^\d+$/.test(saved)) return 0;
    const value = Number(saved);
    if (!Number.isSafeInteger(value) || value < 0) return 0;
    if (migrate) {
        writeLocal(COINS_STORAGE_KEY, String(value));
        if (readLocal(COINS_STORAGE_KEY) === String(value)) {
            try {
                globalThis.sessionStorage?.removeItem(COINS_STORAGE_KEY);
            } catch { /* the local balance is already saved */ }
        }
    }
    return value;
}

let coins = restoreCoins();
export const session = {
    inventory,
    upgrades: [],
    get introPlayed() { return introPlayed; },
    set introPlayed(value) {
        introPlayed = Boolean(value);
        writeLocal(INTRO_STORAGE_KEY, String(introPlayed));
    },
    get coins() { return coins; },
    set coins(value) {
        coins = value;
        writeLocal(COINS_STORAGE_KEY, String(value));
    },
    mapId: "kyle-field",
};

export function startNewGame() {
    session.upgrades.length = 0;
    session.mapId = "kyle-field";
}

// A cadet who catches Rev takes one random item from her bag. Returns it, or null if the bag is empty.
export function stealItem(state = session, random = Math.random) {
    if (!state.inventory.length) return null;
    const [item] = state.inventory.splice(Math.floor(random() * state.inventory.length), 1);
    return item;
}

export function getInventoryRows(state = session) {
    return ITEMS.map((item) => {
        const quantity = state.inventory.filter((entry) => entry.id === item.id).length;
        const unitPrice = RARITIES[item.rarity].sellPrice;
        return { ...item, quantity, unitPrice, total: quantity * unitPrice };
    }).filter((row) => row.quantity > 0);
}

// One HUD bag slot per item type, in catalog order.
export function getBagItems(state = session) {
    return getInventoryRows(state).map((row) => ({ sprite: row.sprite, name: row.name, count: row.quantity }));
}

export function sellOne(itemId, state = session) {
    const item = ITEMS.find((entry) => entry.id === itemId);
    const index = state.inventory.findIndex((entry) => entry.id === itemId);
    if (!item || index < 0) return { count: 0, coins: 0 };
    const coins = RARITIES[item.rarity].sellPrice;
    state.inventory.splice(index, 1);
    state.coins += coins;
    return { count: 1, coins };
}

export function sellAll(state = session) {
    const rows = getInventoryRows(state);
    const coins = rows.reduce((total, row) => total + row.total, 0);
    const count = rows.reduce((total, row) => total + row.quantity, 0);
    const ids = new Set(rows.map((row) => row.id));
    for (let i = state.inventory.length - 1; i >= 0; i--) {
        if (ids.has(state.inventory[i].id)) state.inventory.splice(i, 1);
    }
    state.coins += coins;
    return { count, coins };
}
