/** Bounds use the same logical coordinates as the scene. */
export function addPlayer({
    spawn = { x: 120, y: 120 },
    speed = 300,
    bounds = () => ({ left: 0, top: 0, right: width(), bottom: height() }),
} = {}) {
    const player = add([
        pos(spawn.x, spawn.y),
        sprite("bean"),
        anchor("center"),
        { items: [] },
    ]);

    function keepInsideField() {
        const field = typeof bounds === "function" ? bounds() : bounds;
        const halfWidth = player.width / 2;
        const halfHeight = player.height / 2;
        // Center in an undersized area instead of clamping to inverted limits.
        player.pos.x = field.right - field.left < player.width
            ? (field.left + field.right) / 2
            : Math.max(field.left + halfWidth, Math.min(field.right - halfWidth, player.pos.x));
        player.pos.y = field.bottom - field.top < player.height
            ? (field.top + field.bottom) / 2
            : Math.max(field.top + halfHeight, Math.min(field.bottom - halfHeight, player.pos.y));
    }

    player.onUpdate(() => {
        const x = Number(isKeyDown("d") || isKeyDown("right"))
            - Number(isKeyDown("a") || isKeyDown("left"));
        const y = Number(isKeyDown("s") || isKeyDown("down"))
            - Number(isKeyDown("w") || isKeyDown("up"));
        const length = Math.hypot(x, y);
        if (length > 0) {
            // move() applies delta time; normalization keeps diagonal speed equal.
            player.move(x / length * speed, y / length * speed);
        }
        keepInsideField();
    });

    return player;
}
