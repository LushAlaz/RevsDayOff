import { addPlayer } from "../objects/player.js";
import { followPlayer } from "../camera.js";
import { FIELD_LAYOUT, drawField } from "../field.js";

scene("mapSelect", () => {
    setBackground(rgb(80, 0, 0));
    const field = FIELD_LAYOUT.bounds;
    drawField();

    // Solid HUD backplates keep field markings from competing with the controls.
    add([
        rect(216, 52, { radius: 8 }), pos(center().x - 108, 10),
        color(80, 0, 0), fixed(), z(9),
    ]);
    add([
        rect(width(), 40), pos(0, height() - 48),
        color(80, 0, 0), fixed(), z(9),
    ]);

    add([
        text("Kyle Field", { size: 32 }),
        pos(center().x, 36),
        anchor("center"),
        fixed(),
        z(10),
        outline(3, rgb(80, 0, 0)),
    ]);
    const player = addPlayer({
        spawn: FIELD_LAYOUT.center,
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
