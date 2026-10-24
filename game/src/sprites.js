import { ITEMS } from "./items.js";

export function loadSprites() {
    loadSprite("bean", "sprites/bean.png");
    loadSprite("tam-logo", "sprites/tam-maroon.svg");
    loadSprite("good-bull-shop", "sprites/good-bull-2d.png");
    for (const item of ITEMS) loadSprite(item.sprite, item.path, { sliceX: item.sliceX });
    loadSprite("reveille", "sprites/Reveille.png", {
        sliceX: 11,
        anims: {
            down: { from: 0, to: 2, speed: 8, loop: true },
            up: { from: 3, to: 5, speed: 8, loop: true },
            // The sheet includes both side directions: never mix them in one loop.
            left: { from: 6, to: 8, speed: 8, loop: true },
            right: { from: 9, to: 10, speed: 8, loop: true },
        },
    });
}
