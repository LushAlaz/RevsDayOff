import { RARITIES } from "./items.js";
import { triggersCadet } from "./loot.js";
import { addSniffingEffect } from "./sniffing-ui.js";

export function addLootUI(player, loot, mapName = "Kyle Field") {
    addSniffingEffect(player, () => loot.sniffing && loot.phase === "exploration");

    const white = rgb(245, 242, 229);
    const panel = rgb(29, 31, 42);
    function label(value, x, y, size = 16, tint = white, anchor = "center") {
        drawText({ font: "pixel", text: value, pos: vec2(Math.round(x), Math.round(y)), size, width: anchor === "center" ? 416 : undefined, align: anchor === "center" ? "center" : "left", lineSpacing: 8, color: tint, anchor });
    }
    add([
        fixed(), z(100),
        {
            draw() {
                const cx = width() / 2;
                const cy = height() / 2;
                // coins and the bag live in the bottom-right HUD (objects/hud.js)
                drawRect({ pos: vec2(10, 10), width: width() - 20, height: 38, color: panel, opacity: 0.94, radius: 6 });
                label(`${mapName}  |  Hold X: sniff  |  WASD / Arrows: move  |  B: bag  |  Esc: maps`, 24, 22, 8, white, "left");

                if (loot.phase === "exploration" && loot.sniffing) {
                    drawRect({ pos: vec2(cx - 210, 80), width: 420, height: 40, color: panel, radius: 6 });
                    label(loot.hint, cx, 100, 16);
                }
                if (loot.phase === "challenge") {
                    const rarity = RARITIES[loot.active.rarity];
                    drawRect({ width: width(), height: height(), color: rgb(0, 0, 0), opacity: 0.65 });
                    drawRect({ pos: vec2(cx - 220, cy - 205), width: 440, height: 410, color: panel, radius: 12 });
                    label("You're here!", cx, cy - 169, 16);
                    label(`${loot.active.rarity} find`, cx, cy - 130, 16, rgb(...rarity.color));
                    drawCircle({ pos: vec2(cx, cy), radius: 106, color: rgb(85, 92, 106) });
                    drawCircle({ pos: vec2(cx, cy), radius: 82, color: panel });
                    const point = (angle) => {
                        const radians = (angle - 90) * Math.PI / 180;
                        return vec2(cx + Math.cos(radians) * 94, cy + Math.sin(radians) * 94);
                    };
                    const start = loot.target - rarity.arc / 2;
                    for (let angle = start; angle < start + rarity.arc; angle += 2) {
                        drawLine({ p1: point(angle), p2: point(Math.min(angle + 2, start + rarity.arc)), width: 22, color: rgb(113, 226, 138) });
                    }
                    drawLine({ p1: vec2(cx, cy), p2: point(loot.angle), width: 5, color: white });
                    drawCircle({ pos: vec2(cx, cy), radius: 8, color: white });
                    label("SPACE: stop in the green arc", cx, cy + 140, 16);
                    label(`${(6 - loot.elapsed).toFixed(1)}s  |  Esc: cancel`, cx, cy + 176, 8);
                } else if (loot.phase === "result") {
                    const result = loot.result;
                    drawRect({ pos: vec2(cx - 260, cy - 135), width: 520, height: 270, color: panel, radius: 10 });
                    if (result.success) {
                        label("Found!", cx, cy - 100, 16);
                        drawSprite({ sprite: result.item.sprite, pos: vec2(cx, cy - 10), width: 88, height: 88, anchor: "center" });
                        label(`${result.rarity} ${result.item.name}`, cx, cy + 65, 16, rgb(...RARITIES[result.rarity].color));
                    } else if (triggersCadet(result)) {
                        label(result.reason === "timeout" ? "Time's up!" : "Missed!", cx, cy - 60, 24);
                        label("A cadet is after you!", cx, cy, 16, rgb(255, 120, 110));
                        label("Press E to bite him away.", cx, cy + 40, 8);
                    } else {
                        label("Attempt cancelled", cx, cy - 25, 24);
                        label("Release X and sniff again.", cx, cy + 30, 16);
                    }
                    label("Release X before your next sniff", cx, cy + 108, 8);
                }
            },
        },
    ]);
}
