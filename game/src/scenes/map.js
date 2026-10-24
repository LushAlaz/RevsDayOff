import { addPlayer } from "../objects/player.js";
import { followPlayer } from "../camera.js";
import { FIELD_LAYOUT, drawField } from "../field.js";
import { SHOP, addFieldShop } from "../shop.js";

scene("mapSelect", ({ spawn = FIELD_LAYOUT.center } = {}) => {
    setBackground(rgb(80, 0, 0));
    const field = FIELD_LAYOUT.bounds;
    drawField();

    const player = addPlayer({
        spawn,
        bounds: field,
        obstacles: [SHOP.obstacle],
    });
    addFieldShop(player);
    followPlayer(player, field);
    onKeyPress("escape", () => go("title"));
});
