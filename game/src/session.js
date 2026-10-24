import { ITEMS, RARITIES } from "./items.js";

export const session = { inventory: [], coins: 0, mapId: "kyle-field" };

export function startNewGame() {
    session.inventory.length = 0;
    session.coins = 0;
    session.mapId = "kyle-field";
}

export function getInventoryRows(state = session) {
    return ITEMS.map((item) => {
        const quantity = state.inventory.filter((entry) => entry.id === item.id).length;
        const unitPrice = RARITIES[item.rarity].sellPrice;
        return { ...item, quantity, unitPrice, total: quantity * unitPrice };
    }).filter((row) => row.quantity > 0);
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
