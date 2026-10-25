import { addPlayer } from "../objects/player.js";
import { followPlayer } from "../camera.js";
import { SHOP, addFieldShop } from "../shop.js";
import { generateLoot, createLootController } from "../loot.js";
import { addLootUI } from "../loot-ui.js";
import { session, stealItem, getBagItems } from "../session.js";
import { addHud } from "../objects/hud.js";
import { MAPS, getMap, cycleMap } from "../maps.js";
import { drawLandscape } from "../landscapes.js";
import { addCadet, cadetSpawnPoint, enableBite } from "../objects/cadet.js";
import { addMultiplayer } from "../multiplayer.js";

scene("mapSelect", () => {
    setCamPos(center());
    setCursor("default");
    setBackground(rgb(31, 36, 36));
    let selected = getMap(session.mapId);
    let traveling = false;
    const cream = rgb(244, 237, 214);
    const maroon = rgb(80, 0, 0);
    function patch(x, y, w, h, tint, radius = 0) {
        return add([rect(w, h, { radius }), pos(x, y), color(...tint)]);
    }
    function label(value, x, y, size = 8, textWidth) {
        return add([text(value, { font: "pixel", size, width: textWidth, align: "center", lineSpacing: 8 }), pos(x, y), anchor("center"), color(cream)]);
    }
    function travel() {
        if (traveling) return;
        traveling = true;
        session.mapId = selected.id;
        setCursor("default");
        go("explore", { mapId: selected.id });
    }
    label("EXPLORE AGGIELAND", 480, 38, 24);
    patch(32, 106, 600, 374, [122, 151, 101], 8);
    patch(48, 258, 568, 30, [139, 142, 133]);
    patch(48, 267, 568, 12, [202, 196, 172]);
    patch(408, 118, 28, 346, [139, 142, 133]);
    patch(417, 118, 10, 346, [202, 196, 172]);
    for (const [x, y, w, h] of [[65, 133, 65, 48], [146, 127, 52, 66], [72, 204, 105, 33], [462, 134, 62, 56], [541, 145, 54, 78]]) {
        patch(x + 3, y + 4, w, h, [99, 109, 87]);
        patch(x, y, w, h, [197, 177, 143]);
        patch(x + 5, y + 5, w - 10, h - 10, [217, 201, 171]);
    }
    patch(216, 126, 182, 100, [190, 184, 151], 4);
    patch(226, 136, 162, 80, [90, 139, 76]);
    for (let y = 136; y < 216; y += 20) patch(226, y, 162, 10, [102, 150, 85]);
    patch(147, 304, 202, 111, [99, 108, 111], 7);
    patch(157, 314, 182, 91, [204, 195, 170], 5);
    patch(169, 326, 158, 67, [72, 126, 69]);
    patch(169, 326, 16, 67, [80, 0, 0]);
    patch(311, 326, 16, 67, [80, 0, 0]);
    for (let x = 199; x < 310; x += 22) patch(x, 329, 2, 61, [234, 232, 209]);
    patch(452, 301, 150, 113, [84, 137, 77], 9);
    patch(466, 308, 120, 9, [211, 197, 155]);
    patch(466, 308, 9, 96, [211, 197, 155]);
    patch(466, 395, 120, 9, [211, 197, 155]);
    patch(543, 339, 43, 39, [72, 154, 179], 8);
    for (const [x, y] of [[477, 335], [520, 387], [590, 321], [565, 388], [86, 424], [373, 416]]) {
        patch(x, y, 7, 12, [99, 73, 45]);
        patch(x - 7, y - 10, 22, 20, [45, 93, 53], 4);
    }
    const pins = MAPS.map((map) => {
        const pin = add([circle(17), pos(map.pin.x, map.pin.y), anchor("center"), area(), color(maroon), outline(3, cream), z(2)]);
        pin.add([text(String(MAPS.indexOf(map) + 1), { font: "pixel", size: 8 }), anchor("center"), color(cream)]);
        const caption = label(map.name, map.pin.x, map.id === "drill-field" ? 239 : 438, 8);
        caption.use(area());
        for (const target of [pin, caption]) {
            target.onHover(() => { selected = map; setCursor("pointer"); });
            target.onHoverEnd(() => setCursor("default"));
            target.onClick(() => { selected = map; travel(); });
        }
        return { map, pin };
    });
    patch(652, 106, 276, 374, [44, 48, 51], 8);
    const name = label("", 790, 146, 16, 240);
    const size = label("", 790, 199, 8);
    const description = add([text("", { font: "pixel", size: 8, width: 224, align: "center", lineSpacing: 8 }), pos(790, 251), anchor("center"), color(cream), z(999)]);
    label("12 hidden loot spots", 790, 324, 8);
    const enter = add([rect(224, 48, { radius: 6 }), pos(678, 402), area(), color(maroon), z(999)]);
    enter.add([text("Explore / Enter", { font: "pixel", size: 8 }), pos(112, 24), anchor("center"), color(cream), z(999)]);
    enter.onClick(travel);
    enter.onHover(() => setCursor("pointer"));
    enter.onHoverEnd(() => setCursor("default"));
    const back = add([text("Back to Title / Esc", { font: "pixel", size: 8 }), pos(800, 510), anchor("center"), area(), color(cream), z(999)]);
    back.onClick(() => { setCursor("default"); go("title"); });
    back.onHover(() => setCursor("pointer"));
    back.onHoverEnd(() => setCursor("default"));
    label("Click a pin, or use arrow keys + Enter", 295, 510, 8);
    onUpdate(() => {
        name.text = selected.name;
        size.text = `${selected.size}  |  ${selected.bounds.right} x ${selected.bounds.bottom}`;
        description.text = selected.description;
        pins.forEach(({ map, pin }) => { pin.color = map.id === selected.id ? rgb(180, 120, 39) : maroon; });
    });
    onKeyPress("left", () => { selected = cycleMap(selected.id, -1); });
    onKeyPress("up", () => { selected = cycleMap(selected.id, -1); });
    onKeyPress("right", () => { selected = cycleMap(selected.id, 1); });
    onKeyPress("down", () => { selected = cycleMap(selected.id, 1); });
    onKeyPress("enter", travel);
    onKeyPress("escape", () => go("title"));
});

scene("explore", ({ mapId = session.mapId, spawn } = {}) => {
    const map = getMap(mapId);
    session.mapId = map.id;
    setBackground(map.id === "kyle-field" ? rgb(80, 0, 0) : rgb(66, 119, 64));
    drawLandscape(map);
    const loot = createLootController({
        spots: generateLoot({ bounds: map.bounds, obstacles: map.obstacles, entrance: SHOP.entrance }),
        inventory: session.inventory,
        // each failed dig calls a cadet, who freezes while Rev is in a challenge
        // and takes an item from her bag if he reaches her
        onFail: () => {
            const spawn = cadetSpawnPoint(player.pos, map.bounds);
            addCadet(vec2(spawn.x, spawn.y), player, {
                canMove: () => loot.phase !== "challenge",
                steal: () => stealItem(),
            });
        },
    });
    // Registered before the HUD's own Esc handler, so Esc with the bag open only closes the bag.
    onKeyPress("escape", () => { if (!hud.isBagOpen() && !loot.cancel()) go("mapSelect"); });
    const hud = addHud({
        coins: session.coins,
        items: getBagItems(),
        canOpen: () => loot.phase !== "challenge",
    });
    // Mirror the session into the HUD: the coin counter counts up, and the bag refreshes when items are dug up or stolen.
    let bagKey = JSON.stringify(getBagItems());
    onUpdate(() => {
        if (session.coins > hud.getCoins()) hud.addCoins(session.coins - hud.getCoins());
        else if (session.coins < hud.getCoins()) hud.spendCoins(hud.getCoins() - session.coins);
        const items = getBagItems();
        const key = JSON.stringify(items);
        if (key !== bagKey) { bagKey = key; hud.setItems(items); }
    });
    const sniffing = () => isKeyDown("x") && !hud.isBagOpen();
    const player = addPlayer({
        spawn: spawn ?? map.spawn,
        bounds: map.bounds,
        obstacles: map.obstacles,
        inventory: session.inventory,
        getMovementState: () => ({
            locked: loot.phase === "challenge" || hud.isBagOpen(),
            sniffing: loot.phase === "exploration" && sniffing(),
        }),
    });
    player.onUpdate(() => loot.step(dt(), isKeyDown("x"), player.pos));
    const multiplayer = addMultiplayer(player, map);
    enableBite(player, { canBite: () => loot.phase !== "challenge", onBite: () => multiplayer.bite() });
    onKeyPress("space", () => loot.stopSpinner());
    addLootUI(player, loot, map.name);
    addFieldShop(player, () => loot.canInteract && !isKeyDown("x") && !hud.isBagOpen(), map.id);
    followPlayer(player, map.bounds);
});
