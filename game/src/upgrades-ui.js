// The upgrade stand's menu, styled like the selling menu (selling-ui.js).
// Up/Down or a click picks an upgrade; Enter or the button buys it; Esc closes (handled by the shop scene).
import { session } from "./session.js";
import { isAtUpgradeStand } from "./upgrades.js";
import { addPrompt } from "./objects/bubble.js";
import { drawUpgradeIcon } from "./objects/upgrade-art.js";

const ROW_Y = 62;
const ROW_HEIGHT = 60;
const ROW_GAP = 6;

export function addUpgradeUI(player, shop, { canOpen = () => true } = {}) {
    const prompt = addPrompt("Space: Browse upgrades");
    player.onUpdate(() => { prompt.hidden = shop.open || !canOpen() || !isAtUpgradeStand(player.pos); });
    onKeyPress("space", () => {
        if (!shop.open && canOpen() && isAtUpgradeStand(player.pos)) shop.openMenu();
    });
    onKeyPress("up", () => shop.navigate(-1));
    onKeyPress("down", () => shop.navigate(1));
    onKeyPress("enter", () => shop.buySelected());

    const cream = rgb(244, 237, 214);
    const gold = rgb(255, 215, 100);
    const label = (value, x, y, size = 8, tint = cream, anchor = "left") =>
        drawText({ text: value, font: "pixel", size, pos: vec2(x, y), anchor, color: tint });

    const root = add([pos(100, 45), fixed(), z(200), {
        draw() {
            drawRect({ width: 760, height: 450, radius: 10, color: rgb(27, 30, 40) });
            label("Good Bull upgrades", 20, 28, 16);
            label(`Coins: ${session.coins}`, 700, 28, 8, gold, "right");
            label("X", 733, 28, 16, cream, "center");
            shop.rows.forEach((row, index) => {
                const y = ROW_Y + index * (ROW_HEIGHT + ROW_GAP);
                const selected = row.id === shop.selectedId;
                drawRect({ pos: vec2(20, y), width: 720, height: ROW_HEIGHT, radius: 4,
                    color: selected ? rgb(102, 46, 58) : rgb(43, 48, 62) });
                drawUpgradeIcon(row.id, { pos: vec2(56, y + ROW_HEIGHT / 2), anchor: "center" });
                label(row.name, 100, y + 20, 8, cream);
                label(row.blurb, 100, y + 40, 8, rgb(190, 186, 170));
                const status = row.owned ? "OWNED" : `${row.price} coins`;
                label(status, 718, y + 30, 8, row.owned ? rgb(113, 226, 138) : row.affordable ? gold : rgb(255, 120, 110), "right");
            });
            const selected = shop.rows.find((row) => row.id === shop.selectedId);
            const canBuy = selected && !selected.owned && selected.affordable;
            drawRect({ pos: vec2(20, 336), width: 720, height: 40, radius: 5, color: canBuy ? rgb(80, 0, 0) : rgb(65, 65, 70) });
            const action = !selected ? "Buy" : selected.owned ? `${selected.name}: owned`
                : selected.affordable ? `Buy ${selected.name} (-${selected.price} coins)`
                    : `Need ${selected.price - session.coins} more coins`;
            label(action, 380, 356, 8, cream, "center");
            label(shop.message, 20, 400, 8);
            label("Up/Down: select   Enter: buy   Esc: close", 380, 437, 8, cream, "center");
        },
    }]);

    // clickable areas over the drawn rows, buy button and close X
    const hotspot = (x, y, w, h, onPress) => {
        const spot = root.add([rect(w, h), pos(x, y), area(), opacity(0)]);
        spot.onClick(() => { if (shop.open) onPress(); });
        return spot;
    };
    shop.rows.forEach((row, index) => hotspot(20, ROW_Y + index * (ROW_HEIGHT + ROW_GAP), 720, ROW_HEIGHT, () => shop.select(row.id)));
    hotspot(20, 336, 720, 40, () => shop.buySelected());
    hotspot(715, 10, 36, 36, () => shop.close());

    root.onUpdate(() => { root.hidden = !shop.open; });
    root.hidden = true;
}
