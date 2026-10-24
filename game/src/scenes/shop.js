import { addPlayer } from "../objects/player.js";
import { SHOP, addSceneEntrance } from "../shop.js";

scene("shop", () => {
    setCamPos(center());
    setBackground(rgb(24, 30, 40));
    const bounds = { left: 80, top: 100, right: 880, bottom: 480 };
    const counter = { left: 160, top: 190, right: 640, bottom: 240 };
    const shelves = [
        { left: 120, top: 108, right: 360, bottom: 152 },
        { left: 420, top: 108, right: 660, bottom: 152 },
    ];

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
    add([text("GOOD BULL SHOP", { size: 34 }), pos(center().x, 48), anchor("center")]);
    for (const shelf of shelves) {
        furnishing(shelf, [56, 65, 79]);
        for (let x = shelf.left + 16; x < shelf.right - 12; x += 36) {
            add([rect(20, 24), pos(x, shelf.top + 10), color(80, 0, 0)]);
        }
    }
    furnishing(counter, [80, 0, 0]);
    add([text("Howdy!", { size: 24 }), pos(400, 214), anchor("center")]);
    add([rect(32, 72), pos(848, 364), color(68, 102, 80)]);
    add([text("EXIT", { size: 16 }), pos(864, 350), anchor("center")]);
    const player = addPlayer({
        spawn: { x: 760, y: 400 }, bounds, obstacles: [counter, ...shelves],
    });
    addSceneEntrance(player, {
        point: { x: 856, y: 400 }, label: "Space: Return to Kyle Field", target: "mapSelect",
        args: { spawn: SHOP.returnSpawn },
    });
    add([
        text("Move: WASD / Arrows    |    Esc: Return to Kyle Field", { size: 16 }),
        pos(center().x, 78), anchor("center"),
    ]);
    onKeyPress("escape", () => go("mapSelect", { spawn: SHOP.returnSpawn }));
});
