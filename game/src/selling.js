import { getInventoryRows, sellOne, sellAll, session } from "./session.js";

export function isAtCounter(position) {
    return position.x >= 160 && position.x <= 640 && position.y >= 240 && position.y <= 320;
}

export function createSellingController(state = session) {
    return {
        open: false, selectedId: null, message: "",
        get rows() { return getInventoryRows(state); },
        get total() { return this.rows.reduce((sum, row) => sum + row.total, 0); },
        openMenu() {
            this.open = true;
            this.selectedId = this.rows[0]?.id ?? null;
            this.message = "Choose an item to sell.";
        },
        close() { this.open = false; },
        select(id) {
            if (this.open && this.rows.some((row) => row.id === id)) this.selectedId = id;
        },
        navigate(direction) {
            const rows = this.rows;
            if (!this.open || !rows.length) return;
            const index = Math.max(0, rows.findIndex((row) => row.id === this.selectedId));
            this.selectedId = rows[(index + direction + rows.length) % rows.length].id;
        },
        sellSelected() {
            if (!this.open) return;
            const rows = this.rows;
            const index = rows.findIndex((row) => row.id === this.selectedId);
            const result = sellOne(this.selectedId, state);
            if (!result.count) return;
            this.message = `Sold ${rows[index].name} for ${result.coins} coins.`;
            const next = this.rows;
            if (!next.some((row) => row.id === this.selectedId)) this.selectedId = next[Math.min(index, next.length - 1)]?.id ?? null;
        },
        sellEverything() {
            if (!this.open) return;
            const result = sellAll(state);
            if (result.count) this.message = `Sold ${result.count} items for ${result.coins} coins.`;
            this.selectedId = null;
        },
    };
}
