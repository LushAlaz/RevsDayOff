/** Keep the viewport inside the world, centering axes smaller than the view. */
export function getCameraPosition(target, bounds, viewport) {
    function clampAxis(value, min, max, size) {
        if (max - min <= size) return (min + max) / 2;
        return Math.max(min + size / 2, Math.min(max - size / 2, value));
    }

    return {
        x: clampAxis(target.x, bounds.left, bounds.right, viewport.width),
        y: clampAxis(target.y, bounds.top, bounds.bottom, viewport.height),
    };
}

export function followPlayer(player, bounds) {
    function updateCamera() {
        const position = getCameraPosition(player.pos, bounds, {
            width: width(), height: height(),
        });
        setCamPos(position.x, position.y);
    }

    updateCamera();
    // Registered after the player's movement callback, so tracking uses this frame's position.
    player.onUpdate(updateCamera);
}
