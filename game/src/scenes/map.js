import { addPlayer } from "../objects/player.js";

scene("mapSelect", () => {
    setBackground(rgb(80, 0, 0));
    const field = { left: 32, top: 88, right: width() - 32, bottom: height() - 56 };
    const fieldWidth = field.right - field.left;
    const fieldHeight = field.bottom - field.top;

    add([
        text("Kyle Field", { size: 32 }),
        pos(center().x, 36),
        anchor("center"),
    ]);
    add([
        rect(fieldWidth, fieldHeight),
        pos(field.left, field.top),
        color(46, 112, 65),
        outline(3, rgb(255, 255, 255)),
    ]);
    for (let yard = 1; yard < 10; yard++) {
        add([
            rect(2, fieldHeight - 24),
            pos(field.left + fieldWidth * yard / 10, field.top + 12),
            color(210, 225, 205),
        ]);
    }

    addPlayer({ spawn: { x: center().x, y: (field.top + field.bottom) / 2 }, bounds: field });
    add([
        text("Move: WASD / Arrow keys    |    Esc: Title", { size: 20 }),
        pos(center().x, height() - 26),
        anchor("center"),
    ]);
    onKeyPress("escape", () => go("title"));
});
