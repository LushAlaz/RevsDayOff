import { ITEMS, RARITIES } from "./items.js";

export function rollRarity(random = Math.random) {
    let roll = random() * 100;
    for (const [name, rarity] of Object.entries(RARITIES)) {
        roll -= rarity.weight;
        if (roll < 0) return name;
    }
    return "Legendary";
}

export function generateLoot({ bounds, obstacle, obstacles = obstacle ? [obstacle] : [], entrance, count = 12, random = Math.random }) {
    const spots = [];
    function place(position) {
        if (obstacles.some((solid) => position.x > solid.left - 64 && position.x < solid.right + 64
            && position.y > solid.top - 64 && position.y < solid.bottom + 64)) return;
        if (Math.hypot(position.x - entrance.x, position.y - entrance.y) < 112) return;
        if (spots.some((spot) => Math.hypot(position.x - spot.position.x, position.y - spot.position.y) < 140)) return;
        const rarity = rollRarity(random);
        const candidates = ITEMS.filter((item) => item.rarity === rarity);
        spots.push({ id: spots.length, position, item: candidates[Math.floor(random() * candidates.length)],
            rarity, collected: false });
    }
    for (let attempt = 0; attempt < 2000 && spots.length < count; attempt++) {
        place({
            x: bounds.left + 64 + random() * (bounds.right - bounds.left - 128),
            y: bounds.top + 64 + random() * (bounds.bottom - bounds.top - 128),
        });
    }
    // A finite, safe fallback guarantees a full field even with repeated random samples.
    if (spots.length < count) {
        spots.length = 0;
        for (let y = bounds.top + 64; y <= bounds.bottom - 64 && spots.length < count; y += 140) {
            for (let x = bounds.left + 64; x <= bounds.right - 64 && spots.length < count; x += 140) place({ x, y });
        }
    }
    return spots;
}

export function distanceHint(distance) {
    if (distance <= 40) return "You're here!";
    if (distance <= 200) return "You're close!";
    return "Not close.";
}

export function isTimingHit(angle, target, arc) {
    const difference = ((angle - target + 180) % 360 + 360) % 360 - 180;
    return Math.abs(difference) <= arc / 2 + 1e-9;
}

// A miss or timeout makes noise and calls a cadet over; cancelling with Esc doesn't.
export function triggersCadet(result) {
    return !result.success && result.reason !== "cancelled";
}

export function createLootController({ spots, inventory, random = Math.random, onFail = () => {} }) {
    // Challenge difficulty and awards always follow the collectible's fixed rarity.
    for (const spot of spots) spot.rarity = spot.item.rarity;
    const state = {
        phase: "exploration", spots, hint: "", sniffing: false, active: null,
        elapsed: 0, angle: 0, target: 0, result: null, releaseRequired: false,
        get canInteract() { return this.phase === "exploration" && !this.sniffing; },
        step(seconds, heldX, position) {
            if (this.phase !== "challenge" && !heldX) this.releaseRequired = false;
            if (this.phase === "challenge") {
                this.elapsed = Math.min(6, this.elapsed + seconds);
                this.angle = (this.elapsed * RARITIES[this.active.rarity].speed) % 360;
                if (this.elapsed >= 6) this.finish(false, "timeout");
                return;
            }
            if (this.phase === "result") {
                this.elapsed += seconds;
                if (this.elapsed >= 2) { this.phase = "exploration"; this.result = null; }
                return;
            }
            this.sniffing = heldX;
            this.hint = "";
            if (!heldX) return;
            const remaining = this.spots.filter((spot) => !spot.collected);
            if (!remaining.length) { this.hint = "Nothing left to sniff here."; return; }
            let nearest = null;
            let distance = Infinity;
            for (const spot of remaining) {
                const candidate = Math.hypot(position.x - spot.position.x, position.y - spot.position.y);
                if (candidate < distance) { distance = candidate; nearest = spot; }
            }
            this.hint = this.releaseRequired ? "Release X and sniff again." : distanceHint(distance);
            if (distance <= 40 && !this.releaseRequired) {
                this.active = nearest;
                this.target = 90 + random() * 180;
                this.angle = 0;
                this.elapsed = 0;
                this.phase = "challenge";
                this.sniffing = false;
            }
        },
        finish(success, reason = "miss") {
            if (this.phase !== "challenge") return;
            if (success) {
                this.active.collected = true;
                inventory.push({ ...this.active.item, rarity: this.active.rarity });
            }
            this.result = { success, reason, item: this.active.item, rarity: this.active.rarity };
            this.phase = "result";
            this.elapsed = 0;
            this.releaseRequired = true;
            this.sniffing = false;
            if (triggersCadet(this.result)) onFail(this.result);
        },
        stopSpinner() {
            if (this.phase !== "challenge") return;
            this.finish(isTimingHit(this.angle, this.target, RARITIES[this.active.rarity].arc));
        },
        cancel() {
            if (this.phase === "challenge") { this.finish(false, "cancelled"); return true; }
            return this.phase === "result";
        },
    };
    return state;
}
