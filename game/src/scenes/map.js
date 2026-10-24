import { addPlayer } from "../objects/player.js";
import { followPlayer } from "../camera.js";

const FIELD_BOUNDS = { left: 0, top: 0, right: 2400, bottom: 1350 };

scene("mapSelect", () => {
    setBackground(rgb(80, 0, 0));
    const field = FIELD_BOUNDS;
    const fieldWidth = field.right - field.left;
    const fieldHeight = field.bottom - field.top;

    add([
        text("Kyle Field", { size: 32 }),
        pos(center().x, 36),
        anchor("center"),
        fixed(),
        z(10),
        outline(3, rgb(80, 0, 0)),
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
        // World-space hash marks make vertical travel visible while the camera follows.
        for (let y = field.top + 90; y < field.bottom; y += 90) {
            add([
                rect(24, 2),
                pos(field.left + fieldWidth * yard / 10 - 12, y),
                color(210, 225, 205),
            ]);
        }
    }

    const player = addPlayer({
        spawn: { x: (field.left + field.right) / 2, y: (field.top + field.bottom) / 2 },
        bounds: field,
    });
    followPlayer(player, field);
    add([
        text("Up: W / Up arrow   Down: S / Down arrow   Left/Right: A/D or arrows   Esc: Title", { size: 16 }),
        pos(center().x, height() - 26),
        anchor("center"),
        fixed(),
        z(10),
        outline(2, rgb(80, 0, 0)),
    ]);
    onKeyPress("escape", () => go("title"));
});
