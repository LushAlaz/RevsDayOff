export const DIRT_SECONDS = 5;

export function dirtAppearance(age) {
    return {
        visible: age >= 0 && age < DIRT_SECONDS,
        scatter: Math.max(0, Math.min(1, age / 0.55)),
        opacity: Math.max(0, Math.min(1, (DIRT_SECONDS - age) / 0.7)),
    };
}

/** World-space decoration only: no collision or effect on loot generation. */
export function addDirtEffect(position, { announce = false } = {}) {
    let age = 0;
    const dirt = add([
        pos(position.x, position.y), z(1),
        { draw() {
            const effect = dirtAppearance(age);
            if (!effect.visible) return;
            const patch = (x, y, w, h, tint, alpha = 1) => drawRect({
                pos: vec2(Math.round(x), Math.round(y)), width: w, height: h,
                color: rgb(...tint), opacity: effect.opacity * alpha,
            });
            // Blocky rim, dark freshly-dug center, and lighter soil crumbs.
            patch(-16, -10, 32, 20, [109, 74, 43]);
            patch(-22, -6, 44, 12, [109, 74, 43]);
            patch(-12, -6, 24, 12, [69, 47, 32]);
            patch(-8, -4, 16, 6, [52, 38, 29]);
            for (let index = 0; index < 8; index++) {
                const angle = index * Math.PI / 4;
                const radius = 12 + effect.scatter * (12 + index % 3 * 3);
                const hop = Math.sin(effect.scatter * Math.PI) * 14;
                patch(Math.cos(angle) * radius, Math.sin(angle) * radius * 0.5 - hop,
                    index % 2 ? 3 : 4, 3, index % 2 ? [147, 104, 62] : [92, 62, 38]);
            }
            // A few tiny dust flecks drift up during the initial burst.
            if (age < 0.9) for (let index = 0; index < 4; index++) {
                patch(-15 + index * 9 + Math.sin(age * 5 + index) * 3,
                    -8 - age * (18 + index * 3), 2, 2, [189, 151, 103], 1 - age / 0.9);
            }
        } },
    ]);
    dirt.onUpdate(() => {
        age += dt();
        if (age >= DIRT_SECONDS) dirt.destroy();
    });
    if (announce) add([
        text("Dug something up!", { font: "pixel", size: 8 }),
        pos(position.x, position.y - 48), anchor("center"),
        color(245, 242, 229), outline(2, rgb(50, 35, 22)), opacity(1),
        move(vec2(0, -1), 12), lifespan(1.2, { fade: 0.3 }), z(6),
    ]);
    return dirt;
}
