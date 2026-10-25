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
import { addDirtEffect } from "../dirt.js";
import { addBevoView } from "../bevo.js";
import { isBevoActive } from "../bevo-state.js";

scene("mapSelect", () => {
    setCamPos(center());
    setCursor("default");
    setBackground(rgb(31, 36, 36));
    let selected = getMap(session.mapId);
    let traveling = false;
    const cream = rgb(244, 237, 214);
    const maroon = rgb(80, 0, 0);
    function patch(x, y, w, h, tint, radius = 0) {
        const snap = (n) => Math.round(n / 4) * 4;
        x = snap(x); y = snap(y);
        w = Math.max(4, snap(w)); h = Math.max(4, snap(h));
        const block = (dx, dy, bw, bh) => add([
            rect(bw, bh), pos(x + dx, y + dy), color(...tint),
        ]);
        if (!radius) return block(0, 0, w, h);
        // Cut square pixels out of corners instead of drawing smooth curves.
        const cut = Math.min(8, Math.floor(w / 12) * 4, Math.floor(h / 12) * 4);
        block(cut, 0, w - cut * 2, 4);
        block(0, 4, w, h - 8);
        return block(cut, h - 4, w - cut * 2, 4);
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
    // Quiet checker texture and inset frames echo a handheld RPG menu.
    for (let y = 0; y < 540; y += 16) {
        for (let x = (y / 16) % 2 ? 0 : 16; x < 960; x += 32) {
            patch(x, y, 16, 16, [34, 40, 39]);
        }
    }
    patch(28, 102, 608, 382, [14, 25, 27], 8);
    label("EXPLORE AGGIELAND", 480, 38, 24);
    patch(32, 106, 600, 374, [122, 151, 101], 8);
    for (let y = 120; y < 464; y += 24) {
        for (let x = 44; x < 612; x += 24) {
            const offset = ((x + y) % 5) * 4;
            patch(x + offset, y, 8, 4, [137, 162, 108]);
            patch(x + offset + 4, y - 4, 4, 4, [149, 174, 118]);
        }
    }
    patch(48, 258, 568, 30, [139, 142, 133]);
    patch(48, 267, 568, 12, [202, 196, 172]);
    patch(408, 118, 28, 346, [139, 142, 133]);
    patch(417, 118, 10, 346, [202, 196, 172]);
    for (let x = 56; x < 608; x += 32) patch(x, 272, 12, 4, [239, 223, 178]);
    for (let y = 128; y < 456; y += 32) patch(420, y, 4, 12, [239, 223, 178]);
    for (const [x, y, w, h] of [[65, 133, 65, 48], [146, 127, 52, 66], [72, 204, 105, 33], [462, 134, 62, 56], [541, 145, 54, 78]]) {
        patch(x + 3, y + 4, w, h, [99, 109, 87]);
        patch(x, y, w, h, [197, 177, 143]);
        patch(x + 5, y + 5, w - 10, h - 10, [217, 201, 171]);
        for (let roofX = x + 12; roofX < x + w - 8; roofX += 16) {
            patch(roofX, y + 12, 4, h - 24, [183, 158, 125]);
        }
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
    patch(552, 348, 20, 4, [125, 198, 202]);
    patch(560, 364, 16, 4, [125, 198, 202]);
    for (const [x, y] of [[477, 335], [520, 387], [590, 321], [565, 388], [86, 424], [373, 416]]) {
        patch(x, y, 7, 12, [99, 73, 45]);
        patch(x - 7, y - 10, 22, 20, [45, 93, 53], 4);
        patch(x - 4, y - 8, 12, 8, [72, 125, 64]);
        patch(x - 4, y - 8, 4, 4, [109, 153, 77]);
    }
    const pins = MAPS.map((map) => {
        const pin = add([rect(32, 32), pos(map.pin.x, map.pin.y), anchor("center"), area(), color(maroon), outline(4, cream), z(2)]);
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
    patch(648, 102, 284, 382, [14, 25, 27], 8);
    patch(652, 106, 276, 374, [44, 48, 51], 8);
    patch(660, 114, 260, 4, [91, 103, 96]);
    patch(660, 118, 4, 354, [67, 79, 74]);
    patch(676, 260, 228, 4, [67, 79, 74]);
    const name = label("", 790, 146, 16, 240);
    const size = label("", 790, 199, 8);
    const description = add([text("", { font: "pixel", size: 8, width: 224, align: "center", lineSpacing: 8 }), pos(790, 235), anchor("center"), color(cream), z(999)]);
    label("CONTROLS", 790, 278, 8);
    const controls = [
        "WASD / Arrows: move",
        "Hold X: sniff for loot",
        "Space: dig / enter Good Bull",
        "B: open bag",
        "E: bite / summon Bevo",
        "Esc: cancel / return to maps",
    ];
    controls.forEach((control, index) => label(control, 790, 302 + index * 16, 8));
    const enter = add([rect(224, 48), pos(678, 402), area(), color(maroon), outline(4, cream), z(999)]);
    enter.add([rect(216, 4), pos(4, 4), color(137, 66, 62)]);
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
    let multiplayer;
    const bossActive = () => multiplayer?.boss.active === true;
    const stunned = () => multiplayer?.boss.stunned === true;
    const cadets = new Map();
    let nextCadetId = 0;
    const loot = createLootController({
        spots: generateLoot({ bounds: map.bounds, obstacles: map.obstacles, entrance: SHOP.entrance }),
        inventory: session.inventory,
        onDigStart: () => multiplayer.setDigging(true),
        onDigFinish: ({ success, position }) => {
            multiplayer.setDigging(false);
            if (success) {
                addDirtEffect(position);
                multiplayer.reportFind(position);
            }
        },
        // each failed dig calls a cadet, who freezes while Rev is in a challenge
        // and takes an item from her bag if he reaches her
        onFail: () => {
            const spawn = cadetSpawnPoint(player.pos, map.bounds);
            const cadet = addCadet(vec2(spawn.x, spawn.y), player, {
                canMove: () => loot.phase !== "challenge",
                steal: () => stealItem(),
            });
            cadets.set(String(++nextCadetId), cadet);
        },
    });
    // Registered before the HUD's own Esc handler, so Esc with the bag open only closes the bag.
    onKeyPress("escape", () => { if (!hud.isBagOpen() && !loot.cancel()) go("mapSelect"); });
    const hud = addHud({
        coins: session.coins,
        items: getBagItems(),
        canOpen: () => loot.phase !== "challenge" && !bossActive(),
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
    const sniffing = () => isKeyDown("x") && !hud.isBagOpen() && !bossActive();
    const player = addPlayer({
        spawn: spawn ?? map.spawn,
        bounds: map.bounds,
        obstacles: map.obstacles,
        inventory: session.inventory,
        getMovementState: () => ({
            locked: loot.phase === "challenge" || hud.isBagOpen() || stunned(),
            sniffing: loot.phase === "exploration" && sniffing(),
        }),
    });
    player.onUpdate(() => loot.step(dt(), sniffing(), player.pos));
    multiplayer = addMultiplayer(player, map, {
        onBevoState: (state) => {
            if (isBevoActive(state)) { loot.suspend(); hud.closeBag(); }
        },
        onBevoHit: () => {
            add([text("STUNNED!", { font: "pixel", size: 8 }), pos(player.pos.x, player.pos.y - 48),
                anchor("center"), color(255, 210, 110), opacity(1), outline(2, rgb(65, 25, 10)),
                move(vec2(0, -1), 25), lifespan(0.5), z(6)]);
        },
        getCadets: () => {
            const result = [];
            for (const [id, cadet] of cadets) {
                if (cadet.gone || !cadet.exists()) { cadets.delete(id); continue; }
                result.push({ id, x: cadet.pos.x, y: cadet.pos.y, direction: cadet.facing, moving: cadet.moving });
            }
            return result;
        },
        getSniffing: () => loot.phase === "exploration" && loot.sniffing && !hud.isBagOpen(),
    });
    if (map.id === "drill-field") addBevoView(player, multiplayer.boss);
    enableBite(player, {
        onInteract: () => multiplayer.boss.summon(player.pos),
        canBite: () => loot.phase !== "challenge" && !hud.isBagOpen() && !stunned(),
        onBite: () => multiplayer.bite(),
    });
    onKeyPress("space", () => loot.stopSpinner());
    addLootUI(player, loot);
    addFieldShop(player, () => !bossActive() && loot.canInteract && !isKeyDown("x") && !hud.isBagOpen(), map.id);
    followPlayer(player, map.bounds);
});
