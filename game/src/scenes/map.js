import { addPlayer } from "../objects/player.js";
import { followPlayer } from "../camera.js";
import { SHOP, addFieldShop } from "../shop.js";
import { generateLoot, createLootController } from "../loot.js";
import { addLootUI } from "../loot-ui.js";
import { session } from "../session.js";
import { MAPS, getMap, cycleMap } from "../maps.js";
import { drawLandscape } from "../landscapes.js";

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
    function label(value, x, y, size = 18) {
        return add([text(value, { size }), pos(x, y), anchor("center"), color(cream)]);
    }
    function travel() {
        if (traveling) return;
        traveling = true;
        session.mapId = selected.id;
        setCursor("default");
        go("explore", { mapId: selected.id });
    }
    label("EXPLORE AGGIELAND", 480, 38, 32);
    label("Choose your next sniffing spot", 480, 76, 18);
    patch(32, 106, 600, 374, [122, 151, 101], 8);
    // A simplified campus guide, with Drill Field north of Kyle and Aggie Park east.
    patch(48, 258, 568, 30, [139, 142, 133]);
    patch(48, 267, 568, 12, [202, 196, 172]);
    patch(408, 118, 28, 346, [139, 142, 133]);
    patch(417, 118, 10, 346, [202, 196, 172]);
    label("CAMPUS WALK", 170, 274, 12);
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
        pin.add([text(String(MAPS.indexOf(map) + 1), { size: 18 }), anchor("center"), color(cream)]);
        const caption = label(map.name, map.pin.x, map.id === "drill-field" ? 239 : 438, 18);
        caption.use(area());
        for (const target of [pin, caption]) {
            target.onHover(() => { selected = map; setCursor("pointer"); });
            target.onHoverEnd(() => setCursor("default"));
            target.onClick(() => { selected = map; travel(); });
        }
        return { map, pin };
    });
    patch(652, 106, 276, 374, [44, 48, 51], 8);
    const name = label("", 790, 146, 27);
    const size = label("", 790, 187, 17);
    const description = add([text("", { size: 19, width: 230, align: "center" }), pos(790, 251), anchor("center"), color(cream)]);
    label("12 hidden loot spots", 790, 324, 17);
    label("Same shop, bag & coins", 790, 352, 16);
    const enter = add([rect(224, 48, { radius: 6 }), pos(678, 402), area(), color(maroon)]);
    enter.add([text("Explore / Enter", { size: 21 }), pos(112, 24), anchor("center"), color(cream)]);
    enter.onClick(travel);
    enter.onHover(() => setCursor("pointer"));
    enter.onHoverEnd(() => setCursor("default"));
    const back = add([text("Back to Title / Esc", { size: 17 }), pos(800, 510), anchor("center"), area(), color(cream)]);
    back.onClick(() => { setCursor("default"); go("title"); });
    back.onHover(() => setCursor("pointer"));
    back.onHoverEnd(() => setCursor("default"));
    label("Click a pin, or use arrow keys + Enter", 295, 510, 17);
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
    });
    const player = addPlayer({
        spawn: spawn ?? map.spawn,
        bounds: map.bounds,
        obstacles: map.obstacles,
        inventory: session.inventory,
        getMovementState: () => ({ locked: loot.phase === "challenge", sniffing: loot.phase === "exploration" && isKeyDown("x") }),
    });
    player.onUpdate(() => loot.step(dt(), isKeyDown("x"), player.pos));
    onKeyPress("space", () => loot.stopSpinner());
    addLootUI(player, loot, session.inventory, map.name);
    addFieldShop(player, () => loot.canInteract && !isKeyDown("x"), map.id);
    followPlayer(player, map.bounds);
    onKeyPress("escape", () => { if (!loot.cancel()) go("mapSelect"); });
});
