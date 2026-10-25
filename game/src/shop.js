import geometry from "./world-geometry.json" with { type: "json" };

export const SHOP = {
    position: { x: 24, y: 24 },
    width: 160,
    height: 180,
    entrance: { x: 104, y: 204 },
    returnSpawn: { x: 104, y: 252 },
    obstacle: geometry.shopObstacle,
    radius: 80,
};

export function isNearEntrance(position, point, radius = SHOP.radius) {
    return Math.hypot(position.x - point.x, position.y - point.y) <= radius;
}

export function addSceneEntrance(player, { point, label, target, args, radius = SHOP.radius, canInteract = () => true }) {
    const prompt = add([
        // sits above the bottom-right coin/bag HUD so the two never overlap
        rect(360, 40, { radius: 6 }), pos(center().x, height() - 112),
        anchor("center"), fixed(), z(20), color(50, 16, 24),
    ]);
    prompt.add([text(label, { font: "pixel", size: 8 }), anchor("center")]);
    prompt.hidden = true;
    let transitioning = false;
    player.onUpdate(() => {
        prompt.hidden = !canInteract() || !isNearEntrance(player.pos, point, radius);
    });
    onKeyPress("space", () => {
        if (transitioning || !canInteract() || !isNearEntrance(player.pos, point, radius)) return;
        transitioning = true;
        go(target, args);
    });
    return prompt;
}

export function addFieldShop(player, canInteract = () => true, mapId = "kyle-field") {
    add([
        sprite("good-bull-shop", { width: SHOP.width, height: SHOP.height }),
        pos(SHOP.position.x, SHOP.position.y), z(1),
    ]);
    addSceneEntrance(player, {
        point: SHOP.entrance, label: "Space: Enter Shop", target: "shop", args: { mapId }, canInteract,
    });
}
