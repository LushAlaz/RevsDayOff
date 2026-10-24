import { addPlayer } from "../objects/player.js";
import { followPlayer } from "../camera.js";
import { FIELD_LAYOUT, drawField } from "../field.js";
import { SHOP, addFieldShop } from "../shop.js";
import { generateLoot, createLootController } from "../loot.js";
import { addLootUI } from "../loot-ui.js";
import { session } from "../session.js";
scene("mapSelect", ({ spawn = FIELD_LAYOUT.center } = {}) => {
    setBackground(rgb(80, 0, 0));
    const field = FIELD_LAYOUT.bounds;
    drawField();
    const loot = createLootController({
        spots: generateLoot({ bounds: field, obstacle: SHOP.obstacle, entrance: SHOP.entrance }),
        inventory: session.inventory,
    });

    const player = addPlayer({
        spawn,
        bounds: field,
        obstacles: [SHOP.obstacle],
        inventory: session.inventory,
        getMovementState: () => ({
            locked: loot.phase === "challenge",
            sniffing: loot.phase === "exploration" && isKeyDown("x"),
        }),
    });
    player.onUpdate(() => loot.step(dt(), isKeyDown("x"), player.pos));
    onKeyPress("space", () => loot.stopSpinner());
    addLootUI(player, loot, session.inventory);
    addFieldShop(player, () => loot.canInteract && !isKeyDown("x"));
    followPlayer(player, field);
    onKeyPress("escape", () => { if (!loot.cancel()) go("title"); });
});
