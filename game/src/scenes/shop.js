import { addPlayer } from "../objects/player.js";
import { addSceneEntrance } from "../shop.js";
import { session } from "../session.js";
import { createSellingController } from "../selling.js";
import { addSellingUI } from "../selling-ui.js";
import { getMap, getShopReturn } from "../maps.js";
import { addBubble, addPrompt } from "../objects/bubble.js";
import { addNameTag } from "../objects/nametag.js";
import { profile, hasProfile } from "../profile.js";
import { UPGRADES, UPGRADE_STAND, createUpgradeShop, hasUpgrade, playerSpeed } from "../upgrades.js";
import { addUpgradeUI } from "../upgrades-ui.js";
import { addCrown, drawUpgradeIcon } from "../objects/upgrade-art.js";
import { setSceneMusic } from "../music.js";

export const BARREL_LABEL = "Marcel Reed's Interception Juice";
const BARREL_READ_RANGE = 90;

// A wooden barrel with iron hoops and a maroon label, drawn in flat pixel blocks.
function addBarrel(box) {
    const w = box.right - box.left;
    const h = box.bottom - box.top;
    const block = (x, y, width, height, tint) =>
        add([rect(width, height), pos(box.left + x, box.top + y), color(...tint), z(-1)]);
    block(0, 4, w, h - 4, [112, 70, 38]);           // staves
    block(4, 4, 8, h - 8, [138, 90, 50]);           // lit side
    block(w - 10, 4, 6, h - 8, [86, 52, 28]);       // shaded side
    block(4, 0, w - 8, 12, [156, 108, 62]);         // lid
    block(8, 4, w - 16, 4, [120, 78, 42]);
    for (const y of [12, h - 14]) block(0, y, w, 4, [64, 66, 72]); // hoops
    block(10, 22, w - 20, 16, [80, 0, 0]);          // label
    block(14, 28, w - 28, 4, [244, 237, 214]);
}

// A table in the top-right corner with the four upgrades on display.
function addUpgradeStand(box) {
    const w = box.right - box.left;
    add([rect(w, box.bottom - box.top), pos(box.left, box.top), color(111, 73, 43), outline(3, rgb(29, 36, 48)), z(-1)]);
    add([rect(w - 8, 6), pos(box.left + 4, box.top + 4), color(163, 113, 64), z(-1)]);
    add([text("UPGRADES", { font: "pixel", size: 8 }), pos(box.left + w / 2, box.top - 6), anchor("center")]);
    add([pos(box.left, box.top), z(0), {
        draw() {
            UPGRADES.forEach((upgrade, index) => {
                drawUpgradeIcon(upgrade.id, { pos: vec2(20 + index * 36, 28), anchor: "center" }, 2);
            });
        },
    }]);
}

scene("shop", ({ mapId = session.mapId } = {}) => {
    setSceneMusic("shop");
    const origin = getMap(mapId);
    setCamPos(center());
    setBackground(rgb(24, 30, 40));
    const bounds = { left: 80, top: 100, right: 880, bottom: 480 };
    const counter = { left: 160, top: 190, right: 640, bottom: 240 };
    const shelves = [
        { left: 120, top: 108, right: 360, bottom: 152 },
        { left: 420, top: 108, right: 660, bottom: 152 },
    ];
    // easter egg in the empty bottom-left corner, clear of the counter and the exit
    const barrel = { left: 104, top: 396, right: 152, bottom: 456 };
    const selling = createSellingController();
    const upgrades = createUpgradeShop();
    const menuOpen = () => selling.open || upgrades.open;

    function furnishing(box, tint) {
        add([
            rect(box.right - box.left, box.bottom - box.top), pos(box.left, box.top),
            color(...tint), outline(3, rgb(29, 36, 48)), z(-1),
        ]);
    }
    add([
        rect(824, 404), pos(68, 88), color(84, 91, 104), z(-101),
    ]);
    add([
        rect(800, 380), pos(80, 100), color(175, 150, 113), z(-100),
    ]);
    for (let x = 80; x < 880; x += 80) {
        add([rect(2, 380), pos(x, 100), color(153, 126, 91), z(-99)]);
    }
    for (const shelf of shelves) {
        furnishing(shelf, [56, 65, 79]);
        for (let x = shelf.left + 16; x < shelf.right - 12; x += 36) {
            add([rect(20, 24), pos(x, shelf.top + 10), color(80, 0, 0)]);
        }
    }
    furnishing(counter, [80, 0, 0]);
    add([text("MARCEL REED SUPERSTORE", { font: "pixel", size: 16 }), pos(400, 214), anchor("center")]);
    add([
        pos(340, 93),
        scale(0.2),
        sprite("marcel")
    ])
    add([rect(32, 72), pos(848, 364), color(68, 102, 80)]);
    add([text("EXIT", { font: "pixel", size: 8 }), pos(864, 350), anchor("center")]);
    addBarrel(barrel);
    addUpgradeStand(UPGRADE_STAND);
    const player = addPlayer({
        spawn: { x: 760, y: 400 }, bounds, obstacles: [counter, ...shelves, barrel, UPGRADE_STAND], inventory: session.inventory,
        speed: () => playerSpeed(),
        getMovementState: () => ({ locked: menuOpen(), sniffing: false }),
    });
    addSellingUI(player, selling, { otherMenuOpen: () => upgrades.open });
    addUpgradeUI(player, upgrades, { canOpen: () => !selling.open });
    if (hasProfile()) addNameTag(player, profile.displayName, { mine: true });
    // shows up the moment the crown is bought
    const crown = addCrown(player);
    crown.onUpdate(() => { crown.hidden = !hasUpgrade("crown"); });
    const barrelTop = vec2((barrel.left + barrel.right) / 2, barrel.top + 12);
    const canRead = () => !menuOpen() && player.pos.dist(barrelTop) <= BARREL_READ_RANGE;
    const readPrompt = addPrompt("Space: Read the barrel");
    let label = null;
    readPrompt.onUpdate(() => { readPrompt.hidden = !!label || !canRead(); });
    onKeyPress("space", () => {
        if (!canRead()) return;
        if (label) destroy(label);
        // the barrel hugs the left wall, so slide the box right to keep it inside the room
        label = addBubble(() => barrelTop, BARREL_LABEL, { shift: 110 });
        label.onDestroy(() => { label = null; });
    });
    addSceneEntrance(player, {
        point: { x: 856, y: 400 }, label: `Space: Return to ${origin.name}`, target: "explore",
        args: getShopReturn(origin.id),
        canInteract: () => !menuOpen(),
    });
    onKeyPress("escape", () => {
        if (selling.open) selling.close();
        else if (upgrades.open) upgrades.close();
        else go("explore", getShopReturn(origin.id));
    });
});
