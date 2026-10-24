export const SHOP = {
    position: { x: 24, y: 24 },
    width: 160,
    height: 180,
    entrance: { x: 104, y: 204 },
    returnSpawn: { x: 104, y: 252 },
    obstacle: { left: 40, top: 104, right: 168, bottom: 204 },
    radius: 80,
};

export function isNearEntrance(position, point, radius = SHOP.radius) {
    return Math.hypot(position.x - point.x, position.y - point.y) <= radius;
}

export function addSceneEntrance(player, { point, label, target, args, radius = SHOP.radius, canInteract = () => true }) {
    const prompt = add([
        rect(360, 40, { radius: 6 }), pos(center().x, height() - 28),
        anchor("center"), fixed(), z(20), color(50, 16, 24),
    ]);
    prompt.add([text(label, { size: 20 }), anchor("center")]);
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

export function addFieldShop(player, canInteract = () => true) {
    add([
        sprite("good-bull-shop", { width: SHOP.width, height: SHOP.height }),
        pos(SHOP.position.x, SHOP.position.y), z(1),
    ]);
    add([
        text("Shop", { size: 18 }), pos(104, 18), anchor("center"),
        z(2), outline(3, rgb(30, 25, 25)),
    ]);
    addSceneEntrance(player, {
        point: SHOP.entrance, label: "Space: Enter Shop", target: "shop", canInteract,
    });
}
