// Pixel-art icons for the shop's upgrades, and the crown Rev wears once it's bought.
import { pixelSprite, drawPixelSprite } from "./pixel-art.js";

const ICONS = {
    // silver-and-blue energy can with a red emblem and a yellow sun
    redbull: {
        art: [
            "..ssss..",
            ".SSSSSS.",
            ".bbbbbb.",
            ".bbyybb.",
            ".brrrrb.",
            ".brbbrb.",
            ".bbbbbb.",
            ".SSSSSS.",
            ".bbbbbb.",
            ".bbbbbb.",
            ".SSSSSS.",
            "..ssss..",
        ],
        colors: { s: [150, 156, 168], S: [205, 210, 220], b: [40, 72, 150], r: [214, 40, 50], y: [250, 200, 40] },
    },
    clover: {
        art: [
            ".gg...gg.",
            "gGGg.gGGg",
            "gGGGgGGGg",
            ".gGGGGGg.",
            "..gGgGg..",
            ".gGGGGGg.",
            "gGGGgGGGg",
            "gGGg.gGGg",
            ".gg.s.gg.",
            "....s....",
            "...s.....",
        ],
        colors: { g: [36, 110, 52], G: [76, 170, 76], s: [60, 120, 50] },
    },
    toothbrush: {
        art: [
            "w.w.w.w.......",
            "wwwwwww.......",
            "bbbbbbbbbbbbbb",
            "bbbbbbbbbbbbbb",
            "........BBBBBB",
        ],
        colors: { w: [245, 245, 250], b: [60, 150, 220], B: [40, 110, 180] },
    },
    crown: {
        art: [
            "Y...Y...Y",
            "YY.YYY.YY",
            "YYYYYYYYY",
            "YrYYbYYrY",
            "YYYYYYYYY",
            "ooooooooo",
        ],
        colors: { Y: [250, 204, 60], o: [196, 140, 30], r: [214, 40, 50], b: [60, 120, 220] },
    },
};

// The icon for an upgrade id, as a sprite asset for drawPixelSprite.
export function upgradeIcon(id, pixel = 3) {
    return pixelSprite(ICONS[id].art, ICONS[id].colors, pixel);
}

export function drawUpgradeIcon(id, options, pixel = 3) {
    drawPixelSprite(upgradeIcon(id, pixel), options);
}

// A crown on a dog's head. Returns it so it can be hidden (other players' crowns come and go).
export function addCrown(dog) {
    const crown = upgradeIcon("crown", 2);
    return dog.add([pos(0, -18), z(5), {
        draw() { drawPixelSprite(crown, { anchor: "bot" }); },
    }]);
}
