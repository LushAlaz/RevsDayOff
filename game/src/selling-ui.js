import { session } from "./session.js";
import { isAtCounter } from "./selling.js";

export function addSellingUI(player, selling) {
    const prompt = add([
        rect(320, 40, { radius: 6 }), pos(center().x, height() - 28),
        anchor("center"), fixed(), z(20), color(50, 16, 24),
    ]);
    prompt.add([text("Space: Sell items", { font: "pixel", size: 8 }), anchor("center")]);
    const balance = add([
        text("", { font: "pixel", size: 8 }), pos(850, 48), anchor("right"), fixed(), z(10),
        color(255, 215, 100),
    ]);
    const root = add([
        rect(760, 450, { radius: 10 }), pos(100, 45), fixed(), z(200), color(27, 30, 40),
    ]);
    root.hidden = true;
    root.add([text("Sell your finds", { font: "pixel", size: 16 }), pos(20, 28), anchor("left")]);
    const menuBalance = root.add([
        text("", { font: "pixel", size: 8 }), pos(700, 28), anchor("right"), color(255, 215, 100),
    ]);
    const closeButton = root.add([
        text("X", { font: "pixel", size: 16 }), pos(733, 28), anchor("center"), area(),
    ]);
    closeButton.onClick(() => { if (selling.open) selling.close(); });
    root.add([text("Item / rarity", { font: "pixel", size: 8 }), pos(30, 72), anchor("left")]);
    root.add([text("Qty", { font: "pixel", size: 8 }), pos(560, 72), anchor("right")]);
    root.add([text("Coins each", { font: "pixel", size: 8 }), pos(718, 72), anchor("right")]);

    const rows = Array.from({ length: 7 }, (_, index) => {
        const row = root.add([
            rect(720, 32, { radius: 4 }), pos(20, 92 + index * 35), area(), color(43, 48, 62),
        ]);
        const name = row.add([text("", { font: "pixel", size: 8 }), pos(12, 16), anchor("left")]);
        const quantity = row.add([text("", { font: "pixel", size: 8 }), pos(540, 16), anchor("right")]);
        const price = row.add([text("", { font: "pixel", size: 8 }), pos(698, 16), anchor("right")]);
        row.onClick(() => { if (selling.open && row.itemId) selling.select(row.itemId); });
        return { row, name, quantity, price };
    });
    const empty = root.add([
        text("Your bag is empty. Sniff around Kyle Field to find loot!", { font: "pixel", size: 8, width: 656, lineSpacing: 8 }),
        pos(380, 192), anchor("center"),
    ]);

    function button(x, w, action) {
        const background = root.add([
            rect(w, 40, { radius: 5 }), pos(x, 348), area(), color(80, 0, 0),
        ]);
        const label = background.add([text("", { font: "pixel", size: 8 }), pos(w / 2, 20), anchor("center")]);
        background.onClick(() => { if (selling.open) action(); });
        return { background, label };
    }
    const one = button(20, 330, () => selling.sellSelected());
    const all = button(370, 370, () => selling.sellEverything());
    const message = root.add([text("", { font: "pixel", size: 8, width: 720, lineSpacing: 8 }), pos(20, 410), anchor("left")]);
    root.add([
        text("Up/Down: select   Enter: sell one   A: sell all   Esc: close", { font: "pixel", size: 8 }),
        pos(380, 437), anchor("center"),
    ]);

    onKeyPress("space", () => {
        if (!selling.open && isAtCounter(player.pos)) selling.openMenu();
    });
    onKeyPress("up", () => selling.navigate(-1));
    onKeyPress("down", () => selling.navigate(1));
    onKeyPress("enter", () => selling.sellSelected());
    onKeyPress("a", () => selling.sellEverything());
    player.onUpdate(() => {
        prompt.hidden = selling.open || !isAtCounter(player.pos);
        balance.text = `Coins: ${session.coins}`;
        balance.hidden = selling.open;
        root.hidden = !selling.open;
        if (!selling.open) return;
        const items = selling.rows;
        menuBalance.text = `Coins: ${session.coins}`;
        rows.forEach(({ row, name, quantity, price }, index) => {
            const item = items[index];
            row.hidden = !item;
            row.itemId = item?.id;
            if (!item) return;
            row.color = rgb(...(item.id === selling.selectedId ? [102, 46, 58] : [43, 48, 62]));
            name.text = `${item.name} (${item.rarity})`;
            quantity.text = String(item.quantity);
            price.text = String(item.unitPrice);
        });
        empty.hidden = items.length > 0;
        const selected = items.find((item) => item.id === selling.selectedId);
        one.label.text = selected ? `Sell One (+${selected.unitPrice} coins)` : "Sell One";
        all.label.text = `Sell All (+${selling.total} coins)`;
        one.background.color = rgb(...(selected ? [80, 0, 0] : [65, 65, 70]));
        all.background.color = rgb(...(items.length ? [80, 0, 0] : [65, 65, 70]));
        message.text = selling.message;
    });
}
