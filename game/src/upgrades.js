// Upgrades sold at the Good Bull shop. Each is bought once per game and resets with a new Play,
// like coins. Prices and effects all live here so they're easy to tune.
// For scale: clearing one map at normal luck earns roughly 220 coins.
import { session } from "./session.js";
import { RARITIES } from "./items.js";

export const UPGRADES = [
    { id: "redbull", name: "Red Bull", price: 60, blurb: "An energy can: Rev runs 25% faster." },
    { id: "clover", name: "Four-Leaf Clover", price: 150, blurb: "Better luck: rarer loot shows up more often." },
    { id: "toothbrush", name: "Toothbrush", price: 80, blurb: "Sharper chomps: double damage on Bevo." },
    { id: "crown", name: "Royal Crown", price: 1000, blurb: "Worn on Rev's head for every player to see." },
];

export const BASE_SPEED = 300;
export const RED_BULL_SPEED = 375;
// Rarity weights out of 100 with the clover (normal weights are in items.js).
export const CLOVER_WEIGHTS = { Common: 45, Rare: 30, Epic: 17, Legendary: 8 };
// Must match TOOTHBRUSH_MULTIPLIER in express/bevo.js, which applies it.
export const TOOTHBRUSH_MULTIPLIER = 2;

// The stand in the shop's top-right corner, and where Rev stands to browse it.
export const UPGRADE_STAND = { left: 700, top: 112, right: 850, bottom: 160 };
export function isAtUpgradeStand(position) {
    return position.x >= 680 && position.x <= 870 && position.y >= 160 && position.y <= 270;
}

export function hasUpgrade(id, state = session) {
    return state.upgrades.includes(id);
}

// Returns { ok: true } or { ok: false, reason } where reason is "owned", "coins" or "unknown".
export function buyUpgrade(id, state = session) {
    const upgrade = UPGRADES.find((entry) => entry.id === id);
    if (!upgrade) return { ok: false, reason: "unknown" };
    if (hasUpgrade(id, state)) return { ok: false, reason: "owned" };
    if (state.coins < upgrade.price) return { ok: false, reason: "coins" };
    state.coins -= upgrade.price;
    state.upgrades.push(id);
    return { ok: true };
}

export function playerSpeed(state = session) {
    return hasUpgrade("redbull", state) ? RED_BULL_SPEED : BASE_SPEED;
}

export function rarityWeights(state = session) {
    if (hasUpgrade("clover", state)) return CLOVER_WEIGHTS;
    return Object.fromEntries(Object.entries(RARITIES).map(([name, rarity]) => [name, rarity.weight]));
}

// The upgrade menu: same shape as the selling controller in selling.js.
export function createUpgradeShop(state = session) {
    return {
        open: false, selectedId: UPGRADES[0].id, message: "",
        get rows() {
            return UPGRADES.map((upgrade) => ({
                ...upgrade, owned: hasUpgrade(upgrade.id, state), affordable: state.coins >= upgrade.price,
            }));
        },
        openMenu() {
            this.open = true;
            this.message = "Pick an upgrade. Each one lasts until you start a new game.";
        },
        close() { this.open = false; },
        select(id) { if (this.open && UPGRADES.some((upgrade) => upgrade.id === id)) this.selectedId = id; },
        navigate(direction) {
            if (!this.open) return;
            const index = UPGRADES.findIndex((upgrade) => upgrade.id === this.selectedId);
            this.selectedId = UPGRADES[(index + direction + UPGRADES.length) % UPGRADES.length].id;
        },
        buySelected() {
            if (!this.open) return;
            const upgrade = UPGRADES.find((entry) => entry.id === this.selectedId);
            const result = buyUpgrade(upgrade.id, state);
            if (result.ok) this.message = `Bought the ${upgrade.name}!`;
            else if (result.reason === "owned") this.message = `You already have the ${upgrade.name}.`;
            else this.message = `The ${upgrade.name} costs ${upgrade.price} coins. You have ${state.coins}.`;
        },
    };
}
