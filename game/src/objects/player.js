/** Bounds use the same logical coordinates as the scene. */
export function addPlayer({
    spawn = { x: 120, y: 120 },
    speed = 300,
    getMovementState = () => ({ locked: false, sniffing: false }),
    inventory = [],
    obstacles = [],
    bounds = () => ({ left: 0, top: 0, right: width(), bottom: height() }),
} = {}) {
    const player = add([
        pos(spawn.x, spawn.y),
        sprite("reveille", { width: 64, height: 64, frame: 0 }),
        anchor("center"),
        z(2),
        { items: inventory }
    ]);
    const idleFrames = { down: 0, up: 3, right: 9, left: 6 };
    let facing = "down";
    let walking = false;

    function moveAxis(axis, velocity) {
        const before = player.pos[axis];
        player.move(axis === "x" ? velocity : 0, axis === "y" ? velocity : 0);
        const other = axis === "x" ? "y" : "x";
        const halfSize = (axis === "x" ? player.width : player.height) / 2;
        const otherHalf = (axis === "x" ? player.height : player.width) / 2;
        for (const obstacle of obstacles) {
            const near = axis === "x" ? obstacle.left : obstacle.top;
            const far = axis === "x" ? obstacle.right : obstacle.bottom;
            const otherNear = axis === "x" ? obstacle.top : obstacle.left;
            const otherFar = axis === "x" ? obstacle.bottom : obstacle.right;
            if (player.pos[other] + otherHalf <= otherNear || player.pos[other] - otherHalf >= otherFar) continue;
            // Sweep the movement segment so even a long frame cannot cross the building.
            if (velocity > 0 && before + halfSize <= near) {
                player.pos[axis] = Math.min(player.pos[axis], near - halfSize);
            } else if (velocity < 0 && before - halfSize >= far) {
                player.pos[axis] = Math.max(player.pos[axis], far + halfSize);
            }
        }
    }

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
        const movement = getMovementState();
        const x = movement.locked ? 0 : Number(isKeyDown("d") || isKeyDown("right"))
            - Number(isKeyDown("a") || isKeyDown("left"));
        const y = movement.locked ? 0 : Number(isKeyDown("s") || isKeyDown("down"))
            - Number(isKeyDown("w") || isKeyDown("up"));
        const length = Math.hypot(x, y);
        if (length > 0) {
            // Prefer horizontal facing on diagonals; each direction has its own frames.
            const direction = x !== 0 ? (x < 0 ? "left" : "right") : (y < 0 ? "up" : "down");
            if (!walking || direction !== facing) {
                player.play(direction);
                facing = direction;
                walking = true;
            }
            // move() applies delta time; normalization keeps diagonal speed equal.
            // Resolve axes separately to slide along walls instead of sticking to them.
            const currentSpeed = movement.sniffing ? speed / 2 : speed;
            moveAxis("x", x / length * currentSpeed);
            moveAxis("y", y / length * currentSpeed);
        } else if (walking) {
            player.stop();
            player.frame = idleFrames[facing];
            walking = false;
        }
        keepInsideField();
    });

    return player;
}
