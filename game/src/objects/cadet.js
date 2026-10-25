export const CADET_SPAWN_DISTANCE = 420; // how far from Rev he appears
export const CADET_SPAWN_MARGIN = 48;    // keep his whole body inside the map
export const BITE_RANGE = 80;            // center-to-center reach of a bite
export const CATCH_RANGE = 32;           // he grabs from Rev's bag this close
export const BITE_COOLDOWN = 0.4;        // seconds between bites

export function loadCadetSprites() {
    const march = (from) => ({ from, to: from + 2, loop: true, pingpong: true, speed: 6 });
    loadSprite("cadet-senior", "sprites/cadet-senior.png", {
        sliceX: 3,
        sliceY: 4,
        anims: {
            "march-down": march(0),
            "march-up": march(3),
            "march-left": march(6),
            "march-right": march(9),
        },
    });
}

// Pick a spot about CADET_SPAWN_DISTANCE from the target, inside the bounds.
// Near an edge the first direction may get clamped short, so try the compass
// around it and keep the farthest point.
export function cadetSpawnPoint(target, bounds, random = Math.random) {
    const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
    const start = random() * Math.PI * 2;
    let best = null;
    for (let step = 0; step < 8; step++) {
        const angle = start + step * Math.PI / 4;
        const point = {
            x: clamp(target.x + Math.cos(angle) * CADET_SPAWN_DISTANCE,
                bounds.left + CADET_SPAWN_MARGIN, bounds.right - CADET_SPAWN_MARGIN),
            y: clamp(target.y + Math.sin(angle) * CADET_SPAWN_DISTANCE,
                bounds.top + CADET_SPAWN_MARGIN, bounds.bottom - CADET_SPAWN_MARGIN),
        };
        const distance = Math.hypot(point.x - target.x, point.y - target.y);
        if (!best || distance > best.distance) best = { point, distance };
        if (distance >= CADET_SPAWN_DISTANCE - 1e-9) break;
    }
    return best.point;
}

// The nearest cadet still standing within range of position, or null.
export function findBiteTarget(position, cadets, range = BITE_RANGE) {
    let nearest = null;
    let nearestDistance = range;
    for (const cadet of cadets) {
        if (cadet.gone) continue;
        const distance = Math.hypot(cadet.pos.x - position.x, cadet.pos.y - position.y);
        if (distance <= nearestDistance) {
            nearest = cadet;
            nearestDistance = distance;
        }
    }
    return nearest;
}

// position: where he spawns (vec2)
// target:   the game object to march toward, e.g. the player
// speed:    pixels per second
// size:     scale of the sprite (the sprite is 32x32, so 3 makes him 96x96)
// canMove:  return false to freeze him, e.g. during a dig challenge
// steal:    called once when he reaches the target; returns the item he took, or null
export function addCadet(position, target, { speed = 120, size = 3, canMove = () => true, steal = () => null } = {}) {
    const cadet = add([
        sprite("cadet-senior", { anim: "march-down" }),
        pos(position),
        anchor("center"),
        scale(size),
        area({ shape: new Rect(vec2(0, 4), 16, 22) }), // hitbox around the body, not the empty corners
        opacity(1),
        z(3),
        "cadet",
        { gone: false },
    ]);

    cadet.onUpdate(() => {
        if (cadet.gone || !canMove() || !target || !target.exists()) return;
        const toTarget = target.pos.sub(cadet.pos);
        if (toTarget.len() <= CATCH_RANGE) {
            const item = steal();
            leave(cadet, item ? `Took your ${item.name}!` : "Empty bag? Hmph.");
            return;
        }

        cadet.move(toTarget.unit().scale(speed));

        // face whichever way he's mostly moving
        const facing = Math.abs(toTarget.x) > Math.abs(toTarget.y)
            ? (toTarget.x < 0 ? "left" : "right")
            : (toTarget.y < 0 ? "up" : "down");
        const anim = "march-" + facing;
        if (cadet.getCurAnim()?.name !== anim) cadet.play(anim);
    });

    return cadet;
}

// a short word that floats up from a spot and fades out
function popText(word, position, size) {
    add([
        text(word, { size }),
        pos(position),
        anchor("center"),
        color(245, 242, 229),
        outline(3, rgb(80, 0, 0)),
        opacity(1),
        move(vec2(0, -1), 50),
        lifespan(0.5, { fade: 0.3 }),
        z(6),
    ]);
}

// say something, then fade away; a cadet on his way out can't be bitten or steal again
function leave(cadet, words) {
    cadet.gone = true;
    cadet.stop();
    popText(words, cadet.pos.add(0, -56), 18);
    tween(1, 0, 0.4, (value) => { cadet.opacity = value; }).onEnd(() => destroy(cadet));
}

// E makes Rev bite; any cadet within reach is sent packing.
export function enableBite(player, { canBite = () => true } = {}) {
    let readyAt = 0;
    onKeyPress("e", () => {
        if (time() < readyAt || !canBite()) return;
        readyAt = time() + BITE_COOLDOWN;
        const victim = findBiteTarget(player.pos, get("cadet"));
        popText(victim ? "CHOMP!" : "chomp", player.pos.add(0, -44), victim ? 20 : 14);
        if (victim) leave(victim, "Ow!");
    });
}
